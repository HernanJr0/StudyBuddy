/**
 * Gemini: POST {base}/models/{model}:generateContent com x-goog-api-key.
 * Saída estruturada: generationConfig.responseMimeType = application/json e
 * generationConfig.responseJsonSchema (JSON Schema padrão). Fonte:
 * ai.google.dev/gemini-api/docs/structured-output e a referência de generateContent.
 */
import { AppError, type ModelInfo } from "../../core";
import { asRecord, fetchJson, noVisionOr } from "../http";
import { schemaFor } from "../jsonschema";
import { isTextModel, sortModels } from "../models";
import { pageLabel } from "../prompt";
import type { Adapter, Conn, GenerateRequest } from "./types";

const BLOCK_FINISH = new Set(["SAFETY", "RECITATION", "PROHIBITED_CONTENT", "BLOCKLIST", "SPII"]);

function headers(conn: Conn): Record<string, string> {
  return conn.apiKey ? { "x-goog-api-key": conn.apiKey } : {};
}

function modelPath(model: string): string {
  return encodeURIComponent(model.replace(/^models\//, ""));
}

function extractText(data: unknown): string {
  const d = asRecord(data);
  const feedback = asRecord(d.promptFeedback);
  const first = asRecord(Array.isArray(d.candidates) ? d.candidates[0] : undefined);
  const parts = asRecord(first.content).parts;
  const text = (Array.isArray(parts) ? parts : [])
    .map(asRecord)
    .filter((p) => p.thought !== true && typeof p.text === "string")
    .map((p) => p.text as string)
    .join("");
  if (!text) {
    if (typeof feedback.blockReason === "string") throw new AppError("llm/blocked");
    if (typeof first.finishReason === "string" && BLOCK_FINISH.has(first.finishReason)) {
      throw new AppError("llm/blocked");
    }
  }
  return text;
}

async function call(conn: Conn, model: string, body: Record<string, unknown>): Promise<string> {
  const url = `${conn.base}/models/${modelPath(model)}:generateContent`;
  const data = await fetchJson(url, { method: "POST", headers: headers(conn), body }, conn.signal);
  return extractText(data);
}

export const geminiAdapter: Adapter = {
  async listModels(conn) {
    const data = await fetchJson(
      `${conn.base}/models?pageSize=1000`,
      { method: "GET", headers: headers(conn) },
      conn.signal,
    );
    const raw = asRecord(data).models;
    const models: ModelInfo[] = [];
    for (const m of Array.isArray(raw) ? raw : []) {
      const r = asRecord(m);
      const methods = r.supportedGenerationMethods;
      if (typeof r.name !== "string") continue;
      if (!Array.isArray(methods) || !methods.includes("generateContent")) continue;
      const id = r.name.replace(/^models\//, "");
      if (!isTextModel(id)) continue;
      models.push({
        id,
        label: typeof r.displayName === "string" && r.displayName ? r.displayName : id,
      });
    }
    return sortModels(models);
  },

  async ping(conn, model) {
    await call(conn, model, {
      contents: [{ role: "user", parts: [{ text: "Responda apenas: ok" }] }],
      generationConfig: { maxOutputTokens: 16 },
    });
  },

  async generate(req: GenerateRequest) {
    const images = req.images ?? [];
    const parts: unknown[] = [{ text: req.user }];
    for (const img of images) {
      parts.push({ text: pageLabel(img.page) });
      parts.push({ inline_data: { mime_type: img.mime, data: img.base64 } });
    }
    try {
      return await call(req, req.model, {
        systemInstruction: { parts: [{ text: req.system }] },
        contents: [{ role: "user", parts }],
        generationConfig: {
          responseMimeType: "application/json",
          responseJsonSchema: schemaFor("gemini"),
        },
      });
    } catch (e) {
      throw images.length ? noVisionOr(e) : e;
    }
  },
};
