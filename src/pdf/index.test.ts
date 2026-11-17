// @vitest-environment node
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { AppError, LIMITS } from "../core";
import { bytesToBase64, type OpenRenderer, pdf, renderPagesWith } from "./index";

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

describe("renderPages (renderizador simulado)", () => {
  const jpeg = (n: number) => new Uint8Array(n).fill(7);
  const fake =
    (pageCount: number, size = 10, onClose?: () => void): OpenRenderer =>
    async () => ({
      pageCount,
      renderJpeg: async () => jpeg(size),
      close: () => onClose?.(),
    });

  it("monta o resultado com imagens, páginas vazias e charCount 0", async () => {
    let closed = false;
    const doc = await renderPagesWith(
      fixture("escaneado.pdf"),
      undefined,
      fake(3, 10, () => {
        closed = true;
      }),
    );
    expect(doc.pageCount).toBe(3);
    expect(doc.charCount).toBe(0);
    expect(doc.fileName).toBe("escaneado.pdf");
    expect(doc.pages).toEqual([1, 2, 3].map((page) => ({ page, text: "" })));
    expect(doc.images?.map((i) => i.page)).toEqual([1, 2, 3]);
    expect(doc.images?.[0]).toEqual({
      page: 1,
      mime: "image/jpeg",
      base64: bytesToBase64(jpeg(10)),
    });
    expect(doc.images?.[0]?.base64).not.toMatch(/^data:/);
    expect(closed).toBe(true);
  });

  it("aplica as checagens iniciais", async () => {
    const big = Object.assign(new Blob(["%PDF-"]), { name: "x.pdf" });
    Object.defineProperty(big, "size", { value: LIMITS.maxFileBytes + 1 });
    expect((await codeOf(renderPagesWith(big, undefined, fake(1)))).code).toBe("pdf/too-large");
    const txt = new Blob(["texto"]);
    expect((await codeOf(renderPagesWith(txt, undefined, fake(1)))).code).toBe("pdf/invalid");
  });

  it("limita páginas e informa o número", async () => {
    const e = await codeOf(renderPagesWith(fixture("escaneado.pdf"), undefined, fake(31)));
    expect(e.code).toBe("pdf/too-many-pages");
    expect(e.detail).toBe("31");
  });

  it("limita o total das imagens", async () => {
    const e = await codeOf(
      renderPagesWith(fixture("escaneado.pdf"), undefined, fake(3, 8 * 1024 * 1024)),
    );
    expect(e.code).toBe("pdf/too-large");
  });

  it("falha de abertura vira pdf/invalid", async () => {
    const open: OpenRenderer = async () => {
      throw new Error("x");
    };
    expect((await codeOf(renderPagesWith(fixture("escaneado.pdf"), undefined, open))).code).toBe(
      "pdf/invalid",
    );
  });

  it("respeita o cancelamento no meio da renderização", async () => {
    const ctrl = new AbortController();
    let closed = false;
    const open: OpenRenderer = async () => ({
      pageCount: 3,
      renderJpeg: async (page) => {
        if (page === 2) ctrl.abort();
        return jpeg(5);
      },
      close: () => {
        closed = true;
      },
    });
    const e = await codeOf(
      renderPagesWith(fixture("escaneado.pdf"), { signal: ctrl.signal }, open),
    );
    expect(e.code).toBe("llm/cancelled");
    expect(closed).toBe(true);
    ctrl.abort();
    expect(
      (await codeOf(pdf.renderPages(fixture("escaneado.pdf"), { signal: ctrl.signal }))).code,
    ).toBe("llm/cancelled");
  });
});
