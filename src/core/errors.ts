/**
 * Catálogo de erros da aplicação. Os módulos lançam AppError com um código;
 * a interface traduz o código em mensagem (messages.ts). Nunca coloque
 * chave de API, texto do material ou resposta do provedor em `detail`.
 */
export type ErrorCode =
  | "pdf/invalid"
  | "pdf/too-large"
  | "pdf/too-many-pages"
  | "pdf/no-text"
  | "pdf/empty-text"
  | "llm/no-config"
  | "llm/invalid-key"
  | "llm/quota"
  | "llm/network"
  | "llm/too-long"
  | "llm/blocked"
  | "llm/model-not-found"
  | "llm/invalid-response"
  | "llm/cancelled"
  | "llm/unknown"
  | "share/invalid"
  | "share/too-new"
  | "store/unavailable";

export class AppError extends Error {
  readonly code: ErrorCode;
  /** Informação técnica curta e não sensível (ex.: status HTTP). */
  readonly detail?: string;

  constructor(code: ErrorCode, detail?: string, options?: { cause?: unknown }) {
    super(detail ? `${code}: ${detail}` : code, options);
    this.name = "AppError";
    this.code = code;
    if (detail !== undefined) this.detail = detail;
  }
}

export function isAppError(e: unknown): e is AppError {
  return e instanceof AppError;
}

/** Converte qualquer exceção em AppError, preservando as que já são. */
export function toAppError(e: unknown, fallback: ErrorCode = "llm/unknown"): AppError {
  if (isAppError(e)) return e;
  if (e instanceof DOMException && e.name === "AbortError") return new AppError("llm/cancelled");
  return new AppError(fallback, undefined, { cause: e });
}
