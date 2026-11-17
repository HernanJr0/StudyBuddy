// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AppError, LIMITS } from "../core";
import { pdf } from "./index";

const fixture = (name: string) => {
  const buf = readFileSync(join(import.meta.dirname, "fixtures", name));
  return Object.assign(new Blob([new Uint8Array(buf)]), { name });
};

async function codeOf(p: Promise<unknown>): Promise<AppError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AppError);
    return e as AppError;
  }
  throw new Error("não lançou");
}

describe("extractPdf", () => {
  it("extrai o texto por página, com acentos", async () => {
    const doc = await pdf.extractPdf(fixture("texto-3-paginas.pdf"));
    expect(doc.pageCount).toBe(3);
    expect(doc.pages.map((p) => p.page)).toEqual([1, 2, 3]);
    expect(doc.fileName).toBe("texto-3-paginas.pdf");
    expect(doc.pages[0]?.text).toContain("fotossíntese");
    expect(doc.pages[0]?.text).toContain("Ação, coração e inovação");
    expect(doc.pages[1]?.text).toContain("mitocôndrias");
    expect(doc.pages[2]?.text).toContain("precipitação");
    expect(doc.charCount).toBe(doc.pages.reduce((n, p) => n + p.text.length, 0));
    expect(doc.pages[0]?.text).not.toMatch(/ {2}/);
  });

  it("rejeita arquivo grande demais", async () => {
    const big = Object.assign(new Blob(["%PDF-"]), { name: "x.pdf" });
    Object.defineProperty(big, "size", { value: LIMITS.maxFileBytes + 1 });
    expect((await codeOf(pdf.extractPdf(big))).code).toBe("pdf/too-large");
  });

  it("rejeita arquivo que não é PDF", async () => {
    const txt = Object.assign(new Blob(["isto é só texto"]), { name: "a.txt" });
    expect((await codeOf(pdf.extractPdf(txt))).code).toBe("pdf/invalid");
  });

  it("rejeita PDF corrompido", async () => {
    const bad = new Blob(["%PDF-1.4 lixo sem estrutura"]);
    expect((await codeOf(pdf.extractPdf(bad))).code).toBe("pdf/invalid");
  });

  it("rejeita PDF com páginas demais, informando o número", async () => {
    const e = await codeOf(pdf.extractPdf(fixture("31-paginas.pdf")));
    expect(e.code).toBe("pdf/too-many-pages");
    expect(e.detail).toBe("31");
  });

  it("detecta PDF escaneado", async () => {
    expect((await codeOf(pdf.extractPdf(fixture("escaneado.pdf")))).code).toBe("pdf/no-text");
  });

  it("respeita o cancelamento", async () => {
    const ctrl = new AbortController();
    ctrl.abort();
    const e = await codeOf(pdf.extractPdf(fixture("texto-3-paginas.pdf"), { signal: ctrl.signal }));
    expect(e.code).toBe("llm/cancelled");
  });
});

describe("fromText", () => {
  it("rejeita texto curto", () => {
    expect(() => pdf.fromText("   curto   ")).toThrowError(/pdf\/empty-text/);
  });

  it("divide em páginas de até ~1800 caracteres", () => {
    const para = "Uma frase de exemplo sobre o assunto estudado. ".repeat(12).trim();
    const text = Array.from({ length: 12 }, () => para).join("\n\n");
    const doc = pdf.fromText(text);
    expect(doc.pageCount).toBeGreaterThan(1);
    expect(doc.pages.every((p) => p.text.length <= 1800)).toBe(true);
    expect(doc.pages.map((p) => p.page)).toEqual(doc.pages.map((_, i) => i + 1));
    expect(doc.charCount).toBe(doc.pages.reduce((n, p) => n + p.text.length, 0));
  });

  it("divide parágrafo gigante por frases", () => {
    const doc = pdf.fromText("Frase curta de teste aqui. ".repeat(300));
    expect(doc.pageCount).toBeGreaterThan(2);
    expect(doc.pages.every((p) => p.text.length <= 1800)).toBe(true);
  });

  it("nunca passa de maxPages", () => {
    const doc = pdf.fromText("Palavra de enchimento do texto. ".repeat(4000));
    expect(doc.pageCount).toBeLessThanOrEqual(LIMITS.maxPages);
  });

  it("texto pequeno vira uma página", () => {
    const doc = pdf.fromText("a".repeat(250));
    expect(doc.pageCount).toBe(1);
    expect(doc.charCount).toBe(250);
  });
});
