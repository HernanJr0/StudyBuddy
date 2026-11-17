/** Extração, normalização e validação da resposta do modelo. */
import { type GeneratedContent, GeneratedContentSchema, LevelSchema, LIMITS } from "../core";

type Rec = Record<string, unknown>;

function isRec(v: unknown): v is Rec {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/** Extrai o JSON do texto, tolerando cercas ```json e texto ao redor. */
export function extractJson(text: string): unknown {
  let t = text.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) t = fence[1].trim();
  try {
    return JSON.parse(t);
  } catch {
    const a = t.indexOf("{");
    const b = t.lastIndexOf("}");
    if (a >= 0 && b > a) {
      try {
        return JSON.parse(t.slice(a, b + 1));
      } catch {
        return undefined;
      }
    }
    return undefined;
  }
}

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  if (!s) return undefined;
  return s.length > max ? s.slice(0, max) : s;
}

function quoteStr(v: unknown): string {
  return typeof v === "string" ? v.trim().slice(0, 300) : "";
}

function pageNum(v: unknown, pageCount: number): number | undefined {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  const max = Math.max(1, Math.min(pageCount, LIMITS.maxPages));
  return Math.min(max, Math.max(1, Math.round(n)));
}

function list(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function normLevel(v: unknown): string {
  if (typeof v !== "string") return "compreender";
  const s = v.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "").trim();
  const r = LevelSchema.safeParse(s);
  return r.success ? r.data : "compreender";
}

/** Corrige o que for corrigível e descarta itens inválidos. */
export function normalizeContent(raw: unknown, pageCount: number): unknown {
  const r = isRec(raw) ? raw : {};
  const summary = isRec(r.summary) ? r.summary : {};

  const keyPoints = list(summary.keyPoints)
    .map((k) => {
      if (!isRec(k)) return undefined;
      const text = str(k.text, 500);
      const page = pageNum(k.page, pageCount);
      return text && page ? { text, page } : undefined;
    })
    .filter((x) => x !== undefined)
    .slice(0, 20);

  const flashcards = list(r.flashcards)
    .map((c) => {
      if (!isRec(c)) return undefined;
      const front = str(c.front, 300);
      const back = str(c.back, 600);
      const page = pageNum(c.page, pageCount);
      return front && back && page ? { front, back, page, quote: quoteStr(c.quote) } : undefined;
    })
    .filter((x) => x !== undefined)
    .slice(0, 40);

  const questions = list(r.questions)
    .map((q) => {
      if (!isRec(q)) return undefined;
      const stem = str(q.stem, 600);
      const explanation = str(q.explanation, 800);
      const page = pageNum(q.page, pageCount);
      const opts = Array.isArray(q.options) ? q.options.map((o) => str(o, 400)) : [];
      const correctIndex = q.correctIndex;
      if (!stem || !explanation || !page) return undefined;
      if (opts.length !== 4 || opts.some((o) => o === undefined)) return undefined;
      if (typeof correctIndex !== "number" || !Number.isInteger(correctIndex)) return undefined;
      if (correctIndex < 0 || correctIndex > 3) return undefined;
      return {
        stem,
        options: opts,
        correctIndex,
        explanation,
        page,
        quote: quoteStr(q.quote),
        level: normLevel(q.level),
      };
    })
    .filter((x) => x !== undefined)
    .slice(0, 30);

  return {
    title: str(r.title, 200),
    summary: { overview: str(summary.overview, 2000), keyPoints },
    flashcards,
    questions,
  };
}

/** Texto bruto -> conteúdo validado, ou null se não houver como aproveitar. */
export function parseGenerated(text: string, pageCount: number): GeneratedContent | null {
  const json = extractJson(text);
  if (json === undefined) return null;
  const res = GeneratedContentSchema.safeParse(normalizeContent(json, pageCount));
  return res.success ? res.data : null;
}
