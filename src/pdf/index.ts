/**
 * Módulo pdf: extrai texto de PDFs no navegador (unpdf, carregado sob demanda)
 * e trata texto colado como material.
 */
import { AppError, type ExtractedDoc, LIMITS, type PdfModule } from "../core";

const PAGE_TARGET = 1800;
const MIN_TEXT = 200;

/** Limpa espaços, junta hifenização simples de fim de linha, preserva parágrafos. */
export function normalizeText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/­/g, "")
    .replace(/[\t\f\v  ]+/g, " ")
    .replace(/(\p{L}{2})-[ ]*\n[ ]*(\p{Ll})/gu, "$1$2")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "E000")
    .replace(/\n/g, " ")
    .replace(/E000/g, "\n\n")
    .replace(/ {2,}/g, " ")
    .trim();
}

function checkAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AppError("llm/cancelled");
}

async function startsWithPdfMagic(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  return String.fromCharCode(...head) === "%PDF-";
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [text];
}

/** Quebra um texto em pedaços de até `size` caracteres (parágrafos, depois frases, depois palavras). */
function chunk(text: string, size: number): string[] {
  const pieces: string[] = [];
  for (const para of text.split(/\n{2,}/)) {
    if (para.length <= size) {
      pieces.push(para);
      continue;
    }
    for (const sentence of splitSentences(para)) {
      let s = sentence.trim();
      while (s.length > size) {
        let cut = s.lastIndexOf(" ", size);
        if (cut < size / 2) cut = size;
        pieces.push(s.slice(0, cut).trim());
        s = s.slice(cut).trim();
      }
      if (s) pieces.push(s);
    }
  }
  const pages: string[] = [];
  let cur = "";
  for (const p of pieces) {
    if (!p) continue;
    if (cur && cur.length + p.length + 2 > size) {
      pages.push(cur);
      cur = p;
    } else {
      cur = cur ? `${cur}\n\n${p}` : p;
    }
  }
  if (cur) pages.push(cur);
  return pages;
}

export const pdf: PdfModule = {
  async extractPdf(file, options) {
    const signal = options?.signal;
    checkAborted(signal);
    if (file.size > LIMITS.maxFileBytes) throw new AppError("pdf/too-large");
    if (!(await startsWithPdfMagic(file))) throw new AppError("pdf/invalid");
    checkAborted(signal);

    const data = new Uint8Array(await file.arrayBuffer());
    checkAborted(signal);
    const { getDocumentProxy, extractText } = await import("unpdf");
    checkAborted(signal);

    let texts: string[];
    try {
      const doc = await getDocumentProxy(data);
      if (doc.numPages > LIMITS.maxPages) {
        throw new AppError("pdf/too-many-pages", String(doc.numPages));
      }
      checkAborted(signal);
      const result = await extractText(doc, { mergePages: false });
      texts = result.text;
    } catch (e) {
      if (e instanceof AppError) throw e;
      checkAborted(signal);
      throw new AppError("pdf/invalid", undefined, { cause: e });
    }
    checkAborted(signal);

    const pages = texts.map((t, i) => ({ page: i + 1, text: normalizeText(t) }));
    const charCount = pages.reduce((n, p) => n + p.text.length, 0);
    if (pages.length === 0 || charCount / pages.length < LIMITS.minCharsPerPage) {
      throw new AppError("pdf/no-text");
    }
    return {
      pages,
      pageCount: pages.length,
      charCount,
      ...(file.name ? { fileName: file.name } : {}),
    };
  },

  // PROVISÓRIO (frente I2 implementa com renderização por página):
  async renderPages() {
    throw new AppError("pdf/no-text");
  },

  fromText(text): ExtractedDoc {
    const clean = normalizeText(text);
    if (clean.length < MIN_TEXT) throw new AppError("pdf/empty-text");
    let size = PAGE_TARGET;
    let parts = chunk(clean, size);
    while (parts.length > LIMITS.maxPages) {
      size = Math.ceil(size * 1.25);
      parts = chunk(clean, size);
    }
    const pages = parts.map((t, i) => ({ page: i + 1, text: t }));
    return {
      pages,
      pageCount: pages.length,
      charCount: pages.reduce((n, p) => n + p.text.length, 0),
    };
  },
};
