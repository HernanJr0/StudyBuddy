/** Fluxo de geração: prompt -> chamada -> validação (com uma nova tentativa) -> verificação. */
import {
  AppError,
  buildPack,
  type ExtractedDoc,
  type GenerateControl,
  type GenerateOptions,
  getProvider,
  LIMITS,
  type ProviderConfig,
  resolveBaseUrl,
  type StudyPack,
} from "../core";
import { adapterFor } from "./adapters";
import type { Conn } from "./adapters/types";
import { verifyContent } from "./grounding";
import { schemaText } from "./jsonschema";
import { parseGenerated } from "./parse";
import { buildSystemPrompt, buildUserPrompt, DEFAULT_LANGUAGE } from "./prompt";

/** Valida a configuração e devolve a conexão pronta. */
export function connFor(config: Omit<ProviderConfig, "model">, signal?: AbortSignal): Conn {
  const info = getProvider(config.provider);
  const base = resolveBaseUrl(config);
  if (!base) throw new AppError("llm/no-config", "endereco");
  if (!config.apiKey && !info.keyOptional) throw new AppError("llm/invalid-key", "sem-chave");
  return { base, apiKey: config.apiKey, signal };
}

function checkAbort(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AppError("llm/cancelled");
}

export async function generateStudyPack(
  doc: ExtractedDoc,
  options: GenerateOptions,
  config: ProviderConfig,
  control?: GenerateControl,
): Promise<StudyPack> {
  const signal = control?.signal;
  const progress = control?.onProgress;
  progress?.("preparing");
  checkAbort(signal);
  if (doc.charCount > LIMITS.maxChars) throw new AppError("llm/too-long", "material");
  if (!config.model) throw new AppError("llm/no-config", "modelo");
  const conn = connFor(config, signal);
  const adapter = adapterFor(config.provider);
  const language = options.language ?? DEFAULT_LANGUAGE;
  const req = {
    ...conn,
    model: config.model,
    system: buildSystemPrompt({ ...options, language }),
    user: buildUserPrompt(doc),
    schemaText: schemaText(),
  };

  let content = null;
  for (let attempt = 0; attempt < 2 && !content; attempt++) {
    progress?.("requesting");
    const text = await adapter.generate(req);
    checkAbort(signal);
    progress?.("validating");
    content = parseGenerated(text, doc.pageCount);
  }
  if (!content) throw new AppError("llm/invalid-response");

  progress?.("verifying");
  content = {
    ...content,
    flashcards: content.flashcards.slice(0, options.flashcards),
    questions: content.questions.slice(0, options.questions),
  };
  const grounded = verifyContent(content, doc);
  const pack = buildPack(grounded.content, {
    provider: config.provider,
    model: config.model,
    pageCount: doc.pageCount,
    ...(doc.fileName ? { fileName: doc.fileName } : {}),
    language,
    verified: grounded.verified,
  });
  progress?.("done");
  return pack;
}
