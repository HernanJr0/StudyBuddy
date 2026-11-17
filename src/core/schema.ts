/**
 * Contrato de dados do StudyBuddy (pacote de estudo, versão 1).
 *
 * Este arquivo é a fonte única de verdade: valida a resposta do LLM,
 * valida pacotes recebidos por arquivo ou link e gera o JSON Schema
 * enviado aos provedores. Alterações aqui são feitas só pelo integrador.
 */
import { z } from "zod";

export const PACK_FORMAT = "studybuddy.pack";
export const PACK_VERSION = 1;

/** Limites do material de entrada (SPEC 5.2). */
export const LIMITS = {
  maxFileBytes: 10 * 1024 * 1024,
  maxPages: 30,
  /** Abaixo disso, por página em média, o PDF é tratado como escaneado. */
  minCharsPerPage: 40,
  /** Teto de caracteres enviados ao LLM em uma chamada. */
  maxChars: 120_000,
  flashcards: { min: 5, max: 30, default: 12 },
  questions: { min: 5, max: 20, default: 8 },
} as const;

const page = z.number().int().min(1).max(LIMITS.maxPages);
const quote = z.string().max(300);

export const LevelSchema = z.enum(["lembrar", "compreender", "aplicar"]);
export type Level = z.infer<typeof LevelSchema>;

/* ---------- O que o LLM devolve ---------- */

export const KeyPointSchema = z.object({
  text: z.string().min(1).max(500),
  page,
});

export const SummarySchema = z.object({
  overview: z.string().min(1).max(2000),
  keyPoints: z.array(KeyPointSchema).min(1).max(20),
});

export const GeneratedFlashcardSchema = z.object({
  front: z.string().min(1).max(300),
  back: z.string().min(1).max(600),
  page,
  /** Trecho literal do material que sustenta o cartão. */
  quote,
});

export const GeneratedQuestionSchema = z.object({
  stem: z.string().min(1).max(600),
  /** Sempre quatro alternativas. */
  options: z.array(z.string().min(1).max(400)).length(4),
  correctIndex: z.number().int().min(0).max(3),
  explanation: z.string().min(1).max(800),
  page,
  quote,
  level: LevelSchema,
});

export const GeneratedContentSchema = z.object({
  title: z.string().min(1).max(200),
  summary: SummarySchema,
  flashcards: z.array(GeneratedFlashcardSchema).min(1).max(40),
  questions: z.array(GeneratedQuestionSchema).min(1).max(30),
});
export type GeneratedContent = z.infer<typeof GeneratedContentSchema>;

/** JSON Schema do conteúdo gerado, para a saída estruturada dos provedores. */
export function generatedContentJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(GeneratedContentSchema) as Record<string, unknown>;
}

/* ---------- Pacote de estudo ---------- */

export const FlashcardSchema = GeneratedFlashcardSchema.extend({
  id: z.string().min(1).max(40),
  /** O trecho citado foi encontrado na página indicada. */
  verified: z.boolean(),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

export const QuestionSchema = GeneratedQuestionSchema.extend({
  id: z.string().min(1).max(40),
  verified: z.boolean(),
});
export type Question = z.infer<typeof QuestionSchema>;

export const PackSourceSchema = z.object({
  /** Identificador do provedor (ver providers.ts) ou texto livre em pacotes de terceiros. */
  provider: z.string().max(60),
  model: z.string().max(120),
  pageCount: z.number().int().min(1).max(LIMITS.maxPages),
  fileName: z.string().max(200).optional(),
});

export const StudyPackSchema = z.object({
  format: z.literal(PACK_FORMAT),
  version: z.literal(PACK_VERSION),
  id: z.string().min(1).max(60),
  createdAt: z.iso.datetime(),
  language: z.string().min(2).max(10),
  source: PackSourceSchema,
  title: z.string().min(1).max(200),
  summary: SummarySchema,
  flashcards: z.array(FlashcardSchema).max(40),
  questions: z.array(QuestionSchema).max(30),
});
export type StudyPack = z.infer<typeof StudyPackSchema>;

export interface BuildPackMeta {
  provider: string;
  model: string;
  pageCount: number;
  fileName?: string;
  language?: string;
  /** Resultado da verificação de origem, na mesma ordem do conteúdo. Ausente = não verificado. */
  verified?: { flashcards: boolean[]; questions: boolean[] };
}

/** Monta um pacote a partir do conteúdo gerado, atribuindo identificadores. */
export function buildPack(content: GeneratedContent, meta: BuildPackMeta): StudyPack {
  return StudyPackSchema.parse({
    format: PACK_FORMAT,
    version: PACK_VERSION,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    language: meta.language ?? "pt-BR",
    source: {
      provider: meta.provider,
      model: meta.model,
      pageCount: meta.pageCount,
      ...(meta.fileName ? { fileName: meta.fileName } : {}),
    },
    title: content.title,
    summary: content.summary,
    flashcards: content.flashcards.map((c, i) => ({
      ...c,
      id: `f${i + 1}`,
      verified: meta.verified?.flashcards[i] ?? false,
    })),
    questions: content.questions.map((q, i) => ({
      ...q,
      id: `q${i + 1}`,
      verified: meta.verified?.questions[i] ?? false,
    })),
  });
}

/* ---------- Dados que ficam só no aparelho ---------- */

export const AttemptSchema = z.object({
  id: z.string(),
  packId: z.string(),
  at: z.iso.datetime(),
  /** "all" = quiz completo; "wrong" = só as questões erradas da tentativa anterior. */
  scope: z.enum(["all", "wrong"]),
  total: z.number().int().min(1),
  correct: z.number().int().min(0),
  answers: z.array(
    z.object({
      questionId: z.string(),
      chosenIndex: z.number().int().min(0).max(3),
      correct: z.boolean(),
    }),
  ),
});
export type Attempt = z.infer<typeof AttemptSchema>;

export const CardMarkSchema = z.object({
  packId: z.string(),
  cardId: z.string(),
  known: z.boolean(),
  at: z.iso.datetime(),
});
export type CardMark = z.infer<typeof CardMarkSchema>;

/**
 * Estado de revisão espaçada (FSRS) de um flashcard. `card` guarda o objeto
 * do algoritmo serializado (datas em ISO); `due` repete a data da próxima
 * revisão para permitir consulta por índice.
 */
export const ReviewStateSchema = z.object({
  packId: z.string(),
  cardId: z.string(),
  due: z.iso.datetime(),
  card: z.record(z.string(), z.unknown()),
});
export type ReviewState = z.infer<typeof ReviewStateSchema>;

export const PackOriginSchema = z.enum(["generated", "imported"]);
export type PackOrigin = z.infer<typeof PackOriginSchema>;

/** Linha do histórico: o suficiente para listar sem carregar o pacote inteiro. */
export interface PackSummary {
  id: string;
  title: string;
  createdAt: string;
  savedAt: string;
  origin: PackOrigin;
  flashcardCount: number;
  questionCount: number;
  /** Última tentativa de quiz completo, se houver. */
  lastScore?: { correct: number; total: number; at: string };
}
