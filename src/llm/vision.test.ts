import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, type ExtractedDoc, type ProviderConfig } from "../core";
import { exampleDoc } from "../core/fixtures";
import { llm } from "./index";
import { type Call, contentText, jsonResponse, stubFetch } from "./testing";

// biome-ignore lint/suspicious/noExplicitAny: inspeção solta de corpos JSON nos testes
type Obj = Record<string, any>;

afterEach(() => vi.unstubAllGlobals());

const scanned: ExtractedDoc = {
  pages: exampleDoc.pages.map((p) => ({ page: p.page, text: "" })),
  pageCount: exampleDoc.pageCount,
  charCount: 0,
  fileName: "escaneado.pdf",
  images: exampleDoc.pages.map((p) => ({
    page: p.page,
    mime: "image/jpeg" as const,
    base64: `QUJD${p.page}`,
  })),
};
function userParts(c: Call, key: string, i: number): Obj[] {
  const msg = ((c.body?.[key] ?? []) as Obj[])[i] ?? {};
  return (msg.parts ?? msg.content ?? []) as Obj[];
}

const options = { flashcards: 3, questions: 2 };

interface Case {
  name: string;
  config: ProviderConfig;
  ok: (text: string) => unknown;
  /** Partes de conteúdo do usuário que são imagens, já no formato do provedor. */
  imageParts: (c: Call) => Obj[];
  expected: (page: number) => Obj;
}

const cases: Case[] = [
  {
    name: "gemini",
    config: { provider: "gemini", apiKey: "k", model: "gem-1" },
    ok: (text) => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] }),
    imageParts: (c) => userParts(c, "contents", 0).filter((p) => p.inline_data),
    expected: (page) => ({ inline_data: { mime_type: "image/jpeg", data: `QUJD${page}` } }),
  },
  {
    name: "openai",
    config: { provider: "openai", apiKey: "k", model: "m-1" },
    ok: (text) => ({ choices: [{ message: { content: text }, finish_reason: "stop" }] }),
    imageParts: (c) => userParts(c, "messages", 1).filter((p) => p.type === "image_url"),
    expected: (page) => ({
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,QUJD${page}` },
    }),
  },
  {
    name: "anthropic",
    config: { provider: "anthropic", apiKey: "k", model: "cl-1" },
    ok: (text) => ({ stop_reason: "end_turn", content: [{ type: "text", text }] }),
    imageParts: (c) => userParts(c, "messages", 0).filter((p) => p.type === "image"),
    expected: (page) => ({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: `QUJD${page}` },
    }),
  },
];

async function errorOf(p: Promise<unknown>): Promise<AppError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  }
  throw new Error("não lançou");
}

describe.each(cases)("imagens: $name", (c) => {
  it("envia as imagens no formato do provedor e não verifica nenhum item", async () => {
    const { calls } = stubFetch([jsonResponse(c.ok(contentText))]);
    const pack = await llm.generateStudyPack(scanned, options, c.config);
    expect(calls).toHaveLength(1);
    const parts = c.imageParts(calls[0] as Call);
    expect(parts).toEqual(scanned.pages.map((p) => c.expected(p.page)));
    expect(pack.flashcards.length).toBeGreaterThan(0);
    expect(pack.flashcards.every((f) => f.verified === false)).toBe(true);
    expect(pack.questions.every((q) => q.verified === false)).toBe(true);
    expect(JSON.stringify(calls[0]?.body)).toContain("imagens");
  });

  it("charCount 0 não dispara llm/too-long", async () => {
    stubFetch([jsonResponse(c.ok(contentText))]);
    await expect(llm.generateStudyPack(scanned, options, c.config)).resolves.toBeDefined();
  });

  it("recusa de imagem (400) vira llm/no-vision", async () => {
    stubFetch([
      jsonResponse({ error: { message: "This model does not support image input" } }, 400),
    ]);
    const e = await errorOf(llm.generateStudyPack(scanned, options, c.config));
    expect(e.code).toBe("llm/no-vision");
    expect(e.message).not.toContain("support");
  });

  it("404 e 422 citando imagem também viram llm/no-vision", async () => {
    for (const status of [404, 422]) {
      stubFetch([
        jsonResponse({ error: { message: "vision / multimodal not supported" } }, status),
      ]);
      expect((await errorOf(llm.generateStudyPack(scanned, options, c.config))).code).toBe(
        "llm/no-vision",
      );
    }
  });

  it("400 sem relação com imagem não vira no-vision; 404 simples segue model-not-found", async () => {
    stubFetch([jsonResponse({ error: { message: "bad request" } }, 400)]);
    expect((await errorOf(llm.generateStudyPack(scanned, options, c.config))).code).toBe(
      "llm/unknown",
    );
    stubFetch([jsonResponse({ error: { message: "nope" } }, 404)]);
    expect((await errorOf(llm.generateStudyPack(scanned, options, c.config))).code).toBe(
      "llm/model-not-found",
    );
  });

  it("sem imagens, o mesmo erro não vira no-vision", async () => {
    stubFetch([jsonResponse({ error: { message: "does not support image" } }, 400)]);
    expect((await errorOf(llm.generateStudyPack(exampleDoc, options, c.config))).code).not.toBe(
      "llm/no-vision",
    );
  });
});
