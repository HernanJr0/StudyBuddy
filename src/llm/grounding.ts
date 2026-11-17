/** Verificação de origem: o trecho citado existe na página indicada? */
import type { ExtractedDoc, GeneratedContent } from "../core";

/** Minúsculas, sem acentos, pontuação e espaços colapsados. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const MIN_APPROX_WORDS = 4;
const APPROX_RATIO = 0.8;

interface PreparedPage {
  page: number;
  text: string;
  words: string[];
}

function prepare(doc: ExtractedDoc): PreparedPage[] {
  return doc.pages.map((p) => {
    const text = normalizeText(p.text);
    return { page: p.page, text, words: text ? text.split(" ") : [] };
  });
}

/** Há uma janela do texto que contém >= 80% das palavras do trecho? */
function approxMatch(quoteWords: string[], pageWords: string[]): boolean {
  const n = quoteWords.length;
  if (n < MIN_APPROX_WORDS || pageWords.length === 0) return false;
  const need = Math.ceil(n * APPROX_RATIO);
  const size = Math.ceil(n * 1.3) + 1;
  const want = new Map<string, number>();
  for (const w of quoteWords) want.set(w, (want.get(w) ?? 0) + 1);
  const have = new Map<string, number>();
  let matched = 0;
  for (let i = 0; i < pageWords.length; i++) {
    const add = pageWords[i] as string;
    const c = have.get(add) ?? 0;
    if (c < (want.get(add) ?? 0)) matched++;
    have.set(add, c + 1);
    if (i >= size) {
      const rm = pageWords[i - size] as string;
      const rc = (have.get(rm) ?? 0) - 1;
      have.set(rm, rc);
      if (rc < (want.get(rm) ?? 0)) matched--;
    }
    if (matched >= need) return true;
  }
  return false;
}

/** Procura o trecho: página indicada primeiro, depois as outras. Devolve a página onde achou. */
export function locateQuote(
  quote: string,
  claimedPage: number,
  pages: PreparedPage[],
): { verified: boolean; page: number } {
  const nq = normalizeText(quote);
  if (!nq) return { verified: false, page: claimedPage };
  const ordered = [
    ...pages.filter((p) => p.page === claimedPage),
    ...pages.filter((p) => p.page !== claimedPage),
  ];
  for (const p of ordered) {
    if (p.text.includes(nq)) return { verified: true, page: p.page };
  }
  const qw = nq.split(" ");
  for (const p of ordered) {
    if (approxMatch(qw, p.words)) return { verified: true, page: p.page };
  }
  return { verified: false, page: claimedPage };
}

export interface GroundingResult {
  content: GeneratedContent;
  verified: { flashcards: boolean[]; questions: boolean[] };
}

/** Confere todos os trechos; corrige `page` quando o trecho está em outra página. */
export function verifyContent(content: GeneratedContent, doc: ExtractedDoc): GroundingResult {
  const pages = prepare(doc);
  const fixed = <T extends { quote: string; page: number }>(items: T[]) => {
    const verified: boolean[] = [];
    const out = items.map((item) => {
      const r = locateQuote(item.quote, item.page, pages);
      verified.push(r.verified);
      return r.page === item.page ? item : { ...item, page: r.page };
    });
    return { out, verified };
  };
  const f = fixed(content.flashcards);
  const q = fixed(content.questions);
  return {
    content: { ...content, flashcards: f.out, questions: q.out },
    verified: { flashcards: f.verified, questions: q.verified },
  };
}
