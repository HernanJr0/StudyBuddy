import { describe, expect, it } from "vitest";
import type { GeneratedContent } from "../core";
import { exampleDoc } from "../core/fixtures";
import { normalizeText, verifyContent } from "./grounding";
import { contentJson } from "./testing";

function withQuote(quote: string, page: number): GeneratedContent {
  const c = structuredClone(contentJson) as GeneratedContent;
  c.flashcards = [{ front: "f", back: "b", page, quote }];
  c.questions = [{ ...(c.questions[0] as GeneratedContent["questions"][number]), page, quote }];
  return c;
}

const run = (quote: string, page: number) => {
  const r = verifyContent(withQuote(quote, page), exampleDoc);
  return {
    ok: r.verified.flashcards[0],
    page: r.content.flashcards[0]?.page,
    q: r.verified.questions[0],
  };
};

describe("normalizeText", () => {
  it("tira acentos, pontuação e espaços repetidos", () => {
    expect(normalizeText("  Fotossíntese,  É O processo!  ")).toBe("fotossintese e o processo");
  });
});

describe("verifyContent", () => {
  it("trecho exato na página indicada", () => {
    expect(run("a fotossíntese acontece nos cloroplastos", 2)).toEqual({
      ok: true,
      page: 2,
      q: true,
    });
  });

  it("acento e pontuação diferentes", () => {
    expect(run("A FOTOSSINTESE acontece, nos cloroplastos!", 2).ok).toBe(true);
  });

  it("página errada é corrigida", () => {
    expect(run("a clorofila absorve principalmente luz azul e vermelha", 1)).toEqual({
      ok: true,
      page: 2,
      q: true,
    });
  });

  it("correspondência aproximada (>= 80% das palavras)", () => {
    const r = run("a clorofila absorve sobretudo luz azul e vermelha e reflete a luz verde", 2);
    expect(r.ok).toBe(true);
    expect(r.page).toBe(2);
  });

  it("trecho inventado não é verificado e a página não muda", () => {
    expect(run("a mitocôndria produz energia para o núcleo celular", 3)).toEqual({
      ok: false,
      page: 3,
      q: false,
    });
  });

  it("trecho vazio não é verificado", () => {
    expect(run("", 1).ok).toBe(false);
    expect(run("   ", 1).ok).toBe(false);
  });
});
