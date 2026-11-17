import { describe, expect, it } from "vitest";
import { exampleDoc, examplePack } from "./fixtures";
import {
  buildPack,
  GeneratedContentSchema,
  generatedContentJsonSchema,
  StudyPackSchema,
} from "./schema";

describe("contrato do pacote", () => {
  it("a fixture é um pacote válido", () => {
    expect(examplePack.flashcards.length).toBeGreaterThan(0);
    expect(examplePack.questions.every((q) => q.options.length === 4)).toBe(true);
  });

  it("todo trecho de origem da fixture existe na página indicada", () => {
    for (const item of [...examplePack.flashcards, ...examplePack.questions]) {
      const pageText = exampleDoc.pages.find((p) => p.page === item.page)?.text ?? "";
      expect(pageText, `${item.id} (p. ${item.page})`).toContain(item.quote);
    }
  });

  it("rejeita questão com número errado de alternativas", () => {
    const bad = structuredClone(examplePack);
    bad.questions[0]?.options.pop();
    expect(StudyPackSchema.safeParse(bad).success).toBe(false);
  });

  it("rejeita versão desconhecida", () => {
    expect(StudyPackSchema.safeParse({ ...examplePack, version: 2 }).success).toBe(false);
  });

  it("buildPack atribui identificadores e marcações de verificação", () => {
    const content = GeneratedContentSchema.parse(examplePack);
    const pack = buildPack(content, {
      provider: "gemini",
      model: "teste",
      pageCount: 4,
      verified: {
        flashcards: content.flashcards.map((_, i) => i % 2 === 0),
        questions: content.questions.map(() => true),
      },
    });
    expect(pack.flashcards.map((c) => c.id)).toEqual(["f1", "f2", "f3", "f4", "f5", "f6"]);
    expect(pack.flashcards[1]?.verified).toBe(false);
    expect(pack.questions.every((q) => q.verified)).toBe(true);
    expect(pack.id).not.toBe(examplePack.id);
  });

  it("gera JSON Schema para a saída estruturada", () => {
    const schema = generatedContentJsonSchema();
    expect(schema.type).toBe("object");
    expect(Object.keys(schema.properties as object)).toEqual([
      "title",
      "summary",
      "flashcards",
      "questions",
    ]);
  });
});
