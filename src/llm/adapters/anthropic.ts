/**
 * Anthropic: POST {base}/messages com x-api-key, anthropic-version e
 * anthropic-dangerous-direct-browser-access (chamada direta do navegador).
 * Saída estruturada: output_config.format { type: "json_schema", schema };
 * o JSON volta como texto no bloco `text`. Fonte:
 * platform.claude.com/docs/en/build-with-claude/structured-outputs.
 * stop_reason "refusal" -> llm/blocked.
 */
import { AppError, type ModelInfo } from "../../core";
import { asRecord, fetchJson, LlmHttpError } from "../http";
import { schemaFor } from "../jsonschema";
import { sortModels } from "../models";
import { schemaInstruction } from "../prompt";
import type { Adapter, Conn, GenerateRequest } from "./types";

const API_VERSION = "2023-06-01";
const MAX_TOKENS = 16_000;
const MAX_TOKENS_FALLBACK = 8_192;

function headers(conn: Conn): Record<string, string> {
  return {
    "x-api-key": conn.apiKey,
    "anthropic-version": API_VERSION,
    "anthropic-dangerous-direct-browser-access": "true",
  };
}

function extractText(data: unknown): string {
  const d = asRecord(data);
  if (d.stop_reason === "refusal") throw new AppError("llm/blocked");
  return (Array.isArray(d.content) ? d.content : [])
    .map(asRecord)
    .filter((b) => b.type === "text" && typeof b.text === "string")
    .map((b) => b.text as string)
    .join("");
}

async function messages(conn: Conn, body: Record<string, unknown>): Promise<string> {
  const data = await fetchJson(
    `${conn.base}/messages`,
    { method: "POST", headers: headers(conn), body },
    conn.signal,
  );
  return extractText(data);
}

export const anthropicAdapter: Adapter = {
  async listModels(conn) {
    const data = await fetchJson(
      `${conn.base}/models?limit=1000`,
      { method: "GET", headers: headers(conn) },
      conn.signal,
    );
    const raw = asRecord(data).data;
    const models: ModelInfo[] = [];
    for (const m of Array.isArray(raw) ? raw : []) {
      const r = asRecord(m);
      if (typeof r.id !== "string") continue;
      models.push({
        id: r.id,
        label: typeof r.display_name === "string" && r.display_name ? r.display_name : r.id,
      });
    }
    return sortModels(models);
  },

  async ping(conn, model) {
    await messages(conn, {
      model,
      max_tokens: 16,
      messages: [{ role: "user", content: "Responda apenas: ok" }],
    });
  },

  async generate(req: GenerateRequest) {
    const body = (maxTokens: number): Record<string, unknown> => ({
      model: req.model,
      max_tokens: maxTokens,
      system: req.system,
      messages: [{ role: "user", content: req.user }],
      output_config: { format: { type: "json_schema", schema: schemaFor("anthropic") } },
    });
    try {
      return await messages(req, body(MAX_TOKENS));
    } catch (e) {
      if (!(e instanceof LlmHttpError) || e.status !== 400) throw e;
      if (e.hints.maxTokens) return messages(req, body(MAX_TOKENS_FALLBACK));
      if (!e.hints.responseFormat) throw e;
    }
    // Modelo sem saída estruturada: descreve o esquema no texto.
    return messages(req, {
      model: req.model,
      max_tokens: MAX_TOKENS_FALLBACK,
      system: req.system,
      messages: [{ role: "user", content: `${req.user}\n\n${schemaInstruction(req.schemaText)}` }],
    });
  },
};
