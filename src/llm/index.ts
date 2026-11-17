/**
 * Módulo llm: fala direto com o provedor, do navegador, com fetch.
 * Adaptadores por protocolo em ./adapters; fluxo de geração em ./generate.
 */
import { AppError, type LlmModule } from "../core";
import { adapterFor } from "./adapters";
import { connFor, generateStudyPack } from "./generate";

export const llm: LlmModule = {
  async listModels(config, options) {
    const conn = connFor(config, options?.signal);
    return adapterFor(config.provider).listModels(conn);
  },

  async testConnection(config, options) {
    if (!config.model) throw new AppError("llm/no-config", "modelo");
    const conn = connFor(config, options?.signal);
    await adapterFor(config.provider).ping(conn, config.model);
  },

  generateStudyPack,
};
