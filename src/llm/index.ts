/**
 * Módulo llm — IMPLEMENTAÇÃO PROVISÓRIA (Etapa 0).
 * A frente B substitui o conteúdo mantendo a exportação `llm: LlmModule`.
 */
import { AppError, type GenerationStage, type LlmModule, StudyPackSchema } from "../core";
import { examplePack } from "../core/fixtures";

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new AppError("llm/cancelled"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(id);
      reject(new AppError("llm/cancelled"));
    });
  });
}

export const llm: LlmModule = {
  async listModels() {
    return [{ id: "modelo-de-exemplo", label: "Modelo de exemplo" }];
  },

  async testConnection(config) {
    if (!config.apiKey) throw new AppError("llm/invalid-key");
  },

  async generateStudyPack(doc, options, config, control) {
    const stages: GenerationStage[] = ["preparing", "requesting", "validating", "verifying"];
    for (const stage of stages) {
      control?.onProgress?.(stage);
      await wait(stage === "requesting" ? 1200 : 250, control?.signal);
    }
    control?.onProgress?.("done");
    return StudyPackSchema.parse({
      ...examplePack,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      source: {
        provider: config.provider,
        model: config.model,
        pageCount: doc.pageCount,
        ...(doc.fileName ? { fileName: doc.fileName } : {}),
      },
      flashcards: examplePack.flashcards.slice(0, options.flashcards),
      questions: examplePack.questions.slice(0, options.questions),
    });
  },
};
