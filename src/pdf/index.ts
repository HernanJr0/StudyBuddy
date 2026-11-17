/**
 * Módulo pdf — IMPLEMENTAÇÃO PROVISÓRIA (Etapa 0).
 * A frente A substitui o conteúdo mantendo a exportação `pdf: PdfModule`.
 */
import { AppError, type ExtractedDoc, LIMITS, type PdfModule } from "../core";
import { exampleDoc } from "../core/fixtures";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

export const pdf: PdfModule = {
  async extractPdf(file) {
    if (file.size > LIMITS.maxFileBytes) throw new AppError("pdf/too-large");
    await wait(300);
    return { ...exampleDoc, ...(file.name ? { fileName: file.name } : {}) };
  },

  fromText(text): ExtractedDoc {
    const clean = text.trim();
    if (clean.length < 200) throw new AppError("pdf/empty-text");
    return { pages: [{ page: 1, text: clean }], pageCount: 1, charCount: clean.length };
  },
};
