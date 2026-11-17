import { describe, expect, it } from "vitest";
import { extractJson, normalizeContent, parseGenerated } from "./parse";
import { contentJson } from "./testing";

// biome-ignore lint/suspicious/noExplicitAny: edição solta do JSON nos testes
const clone = () => structuredClone(contentJson) as any;

describe("extractJson", () => {
  it("lê JSON puro, cercado e com texto ao redor", () => {
    expect(extractJson('{"a":1}')).toEqual({ a: 1 });
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Aqui está: {"a":1} pronto')).toEqual({ a: 1 });
    expect(extractJson("nada")).toBeUndefined();
  });
});

describe("parseGenerated", () => {
  it("aceita conteúdo válido", () => {
    expect(parseGenerated(JSON.stringify(contentJson), 4)).not.toBeNull();
  });

  it("trunca strings longas e corta listas acima do máximo", () => {
    const c = clone();
    c.title = "t".repeat(500);
    c.summary.overview = "o".repeat(5000);
    c.flashcards = Array.from({ length: 60 }, () => ({
      ...c.flashcards[0],
      quote: "q".repeat(900),
    }));
    const r = parseGenerated(JSON.stringify(c), 4);
    expect(r?.title).toHaveLength(200);
    expect(r?.summary.overview).toHaveLength(2000);
    expect(r?.flashcards).toHaveLength(40);
    expect(r?.flashcards[0]?.quote).toHaveLength(300);
  });

  it("descarta questões inválidas e mantém as boas", () => {
    const c = clone();
    const good = c.questions[0];
    c.questions = [
      good,
      { ...good, options: ["a", "b", "c"] },
      { ...good, correctIndex: 4 },
      { ...good, correctIndex: -1 },
      { ...good, stem: "" },
      "lixo",
    ];
    expect(parseGenerated(JSON.stringify(c), 4)?.questions).toHaveLength(1);
  });

  it("limita page a 1..pageCount", () => {
    const c = clone();
    c.flashcards[0].page = 99;
    c.flashcards[1].page = 0;
    c.summary.keyPoints[0].page = 12;
    const r = parseGenerated(JSON.stringify(c), 4);
    expect(r?.flashcards[0]?.page).toBe(4);
    expect(r?.flashcards[1]?.page).toBe(1);
    expect(r?.summary.keyPoints[0]?.page).toBe(4);
  });

  it("quote ausente vira vazio e level desconhecido vira compreender", () => {
    const c = clone();
    delete c.flashcards[0].quote;
    c.questions[0].level = "Aplicar";
    c.questions[1].level = "avaliar";
    const r = parseGenerated(JSON.stringify(c), 4);
    expect(r?.flashcards[0]?.quote).toBe("");
    expect(r?.questions[0]?.level).toBe("aplicar");
    expect(r?.questions[1]?.level).toBe("compreender");
  });

  it("devolve null quando não sobra nada aproveitável", () => {
    expect(parseGenerated("{}", 4)).toBeNull();
    expect(parseGenerated("texto", 4)).toBeNull();
    const c = clone();
    c.questions = [];
    expect(parseGenerated(JSON.stringify(c), 4)).toBeNull();
  });

  it("normalizeContent tolera entrada que não é objeto", () => {
    expect(() => normalizeContent(null, 4)).not.toThrow();
    expect(() => normalizeContent([1], 4)).not.toThrow();
  });
});
