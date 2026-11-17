/**
 * Interfaces entre os módulos. Cada módulo (pdf, llm, store) exporta, pelo
 * próprio index.ts, um objeto que cumpre a interface correspondente.
 * A interface da aplicação importa só desses index.ts.
 *
 * Congelado depois da Etapa 0: só o integrador altera este arquivo.
 */
import type { ProviderConfig, ProviderId } from "./providers";
import type { Attempt, CardMark, PackOrigin, PackSummary, StudyPack } from "./schema";

/* ---------- pdf ---------- */

export interface ExtractedPage {
  /** Número da página, começando em 1. */
  page: number;
  text: string;
}

export interface ExtractedDoc {
  pages: ExtractedPage[];
  pageCount: number;
  charCount: number;
  fileName?: string;
}

export interface PdfModule {
  /**
   * Extrai o texto de um PDF, página por página, no próprio aparelho.
   * Lança AppError: pdf/invalid, pdf/too-large, pdf/too-many-pages, pdf/no-text.
   * O leitor de PDF deve ser carregado sob demanda (import dinâmico).
   */
  extractPdf(
    file: Blob & { name?: string },
    options?: { signal?: AbortSignal },
  ): Promise<ExtractedDoc>;
  /**
   * Trata texto colado como material. Divide em "páginas" de tamanho
   * razoável para que a indicação de origem continue útil.
   * Lança AppError pdf/empty-text.
   */
  fromText(text: string): ExtractedDoc;
}

/* ---------- llm ---------- */

export interface ModelInfo {
  id: string;
  label: string;
}

export interface GenerateOptions {
  flashcards: number;
  questions: number;
  /** Idioma do conteúdo gerado. Padrão: "pt-BR". */
  language?: string;
}

export type GenerationStage = "preparing" | "requesting" | "validating" | "verifying" | "done";

export interface GenerateControl {
  signal?: AbortSignal;
  onProgress?: (stage: GenerationStage) => void;
}

export interface LlmModule {
  /** Modelos disponíveis para a chave informada, com os mais indicados primeiro. */
  listModels(
    config: Omit<ProviderConfig, "model">,
    options?: { signal?: AbortSignal },
  ): Promise<ModelInfo[]>;
  /** Faz uma chamada mínima para confirmar chave e modelo. Lança AppError llm/*. */
  testConnection(config: ProviderConfig, options?: { signal?: AbortSignal }): Promise<void>;
  /**
   * Gera o pacote em uma chamada, com saída estruturada. Valida pelo esquema,
   * tenta de novo uma vez se a resposta vier inválida, confere os trechos de
   * origem contra o texto das páginas e devolve o pacote montado (buildPack).
   * Lança AppError llm/*.
   */
  generateStudyPack(
    doc: ExtractedDoc,
    options: GenerateOptions,
    config: ProviderConfig,
    control?: GenerateControl,
  ): Promise<StudyPack>;
}

/* ---------- store ---------- */

export type ThemeChoice = "system" | "light" | "dark";

export interface Settings {
  theme: ThemeChoice;
  /** Multiplicador do tamanho do texto: 1, 1.15 ou 1.3. */
  fontScale: number;
  provider: ProviderId;
  model: string;
  /** Só usado com o provedor "custom". */
  baseUrl: string;
  /** true = a chave fica salva neste aparelho; false = só até fechar a aba. */
  rememberKey: boolean;
  /** O usuário já confirmou que entende para onde o texto é enviado. */
  consentedProviders: ProviderId[];
}

export const DEFAULT_SETTINGS: Settings = {
  theme: "system",
  fontScale: 1,
  provider: "gemini",
  model: "",
  baseUrl: "",
  rememberKey: true,
  consentedProviders: [],
};

export interface StoreModule {
  /* Pacotes (IndexedDB). Lançam AppError store/unavailable. */
  listPacks(): Promise<PackSummary[]>;
  getPack(id: string): Promise<StudyPack | undefined>;
  /** Salva ou substitui. Um pacote importado com id já existente substitui o anterior. */
  savePack(pack: StudyPack, origin: PackOrigin): Promise<void>;
  deletePack(id: string): Promise<void>;
  /** Apaga pacotes, tentativas e marcações. Não apaga configurações nem a chave. */
  clearAll(): Promise<void>;

  /* Progresso local */
  addAttempt(attempt: Attempt): Promise<void>;
  listAttempts(packId: string): Promise<Attempt[]>;
  saveCardMark(mark: CardMark): Promise<void>;
  listCardMarks(packId: string): Promise<CardMark[]>;

  /* Configurações e chave. Síncronos: usados na inicialização. */
  getSettings(): Settings;
  saveSettings(patch: Partial<Settings>): Settings;
  /** A chave fica separada das configurações e nunca entra em exportações. */
  getApiKey(provider: ProviderId): string;
  setApiKey(provider: ProviderId, key: string, remember: boolean): void;
  clearApiKeys(): void;
  /** Configuração pronta para o módulo llm, ou null se faltar chave ou modelo. */
  getProviderConfig(): ProviderConfig | null;

  /* Compartilhamento e exportação. Lançam AppError share/*. */
  packToFile(pack: StudyPack): { blob: Blob; fileName: string };
  packFromFile(file: Blob): Promise<StudyPack>;
  /** Devolve o endereço completo: `${baseUrl}#/abrir/<conteúdo comprimido>`. */
  packToLink(pack: StudyPack, baseUrl: string): Promise<string>;
  /** Recebe só o trecho depois de "#/abrir/". */
  packFromLinkPayload(payload: string): Promise<StudyPack>;
  /** CSV para o Anki: frente, verso e etiqueta com a página. */
  flashcardsToAnkiCsv(pack: StudyPack): { blob: Blob; fileName: string };
}

/* ---------- rotas (hash) ---------- */

export const ROUTES = {
  home: "#/",
  settings: "#/configuracoes",
  history: "#/historico",
  pack: (id: string, tab?: "resumo" | "flashcards" | "quiz") =>
    `#/pacote/${encodeURIComponent(id)}${tab ? `/${tab}` : ""}`,
  open: (payload: string) => `#/abrir/${payload}`,
  aiGuide: "#/uso-responsavel",
  privacy: "#/privacidade",
  about: "#/sobre",
} as const;
