/**
 * Protocolo OpenAI (OpenAI, OpenRouter, Groq e endereço livre): POST
 * {base}/chat/completions com Authorization Bearer (omitido sem chave).
 * Saída estruturada: response_format { type: "json_schema", json_schema:
 * { name, strict: true, schema } }. Se o provedor recusar o formato (400
 * citando response_format/json_schema), repete uma vez com
 * response_format { type: "json_object" } e o esquema descrito no prompt.
 * Fonte: developers.openai.com/api/docs/guides/structured-outputs.
 */
import { AppError, type ModelInfo } from "../../core";
import { asRecord, fetchJson, LlmHttpError } from "../http";
import { schemaFor } from "../jsonschema";
import { isTextModel, sortModels } from "../models";
import { schemaInstruction } from "../prompt";
import type { Adapter, Conn, GenerateRequest } from "./types";

function headers(conn: Conn): Record<string, string> {
  return conn.apiKey ? { authorization: `Bearer ${conn.apiKey}` } : {};
}

function extractText(data: unknown): string {
  const choice = asRecord(
    Array.isArray(asRecord(data).choices) ? (asRecord(data).choices as unknown[])[0] : undefined,
  );
  const message = asRecord(choice.message);
  if (typeof message.refusal === "string" && message.refusal) throw new AppError("llm/blocked");
  const content = message.content;
  let text = "";
  if (typeof content === "string") text = content;
  else if (Array.isArray(content)) {
    text = content
      .map(asRecord)
      .map((p) => (typeof p.text === "string" ? p.text : ""))
      .join("");
  }
  if (!text && choice.finish_reason === "content_filter") throw new AppError("llm/blocked");
  return text;
}

async function chat(conn: Conn, body: Record<string, unknown>): Promise<string> {
  const data = await fetchJson(
    `${conn.base}/chat/completions`,
    { method: "POST", headers: headers(conn), body },
    conn.signal,
  );
  return extractText(data);
}

export const openaiAdapter: Adapter = {
  async listModels(conn) {
    const data = await fetchJson(
      `${conn.base}/models`,
      { method: "GET", headers: headers(conn) },
      conn.signal,
    );
    const raw = asRecord(data).data;
    const models: ModelInfo[] = [];
    for (const m of Array.isArray(raw) ? raw : []) {
      const r = asRecord(m);
      if (typeof r.id !== "string" || !isTextModel(r.id)) continue;
      // OpenRouter informa as modalidades de saída.
      const out = asRecord(r.architecture).output_modalities;
      if (Array.isArray(out) && !out.includes("text")) continue;
      // Groq marca modelos desativados.
      if (r.active === false) continue;
      models.push({ id: r.id, label: typeof r.name === "string" && r.name ? r.name : r.id });
    }
    return sortModels(models);
  },

  async ping(conn, model) {
    await chat(conn, {
      model,
      messages: [{ role: "user", content: "Responda apenas: ok" }],
      max_completion_tokens: 16,
    });
  },

  async generate(req: GenerateRequest) {
    const base = {
      model: req.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: req.user },
      ],
    };
    try {
      return await chat(req, {
        ...base,
        response_format: {
          type: "json_schema",
          json_schema: { name: "study_pack", strict: true, schema: schemaFor("openai") },
        },
      });
    } catch (e) {
      if (!(e instanceof LlmHttpError) || e.status !== 400 || !e.hints.responseFormat) throw e;
    }
    return chat(req, {
      model: req.model,
      messages: [
        { role: "system", content: req.system },
        { role: "user", content: `${req.user}\n\n${schemaInstruction(req.schemaText)}` },
      ],
      response_format: { type: "json_object" },
    });
  },
};
