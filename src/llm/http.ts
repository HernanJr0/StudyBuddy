/**
 * Camada HTTP comum aos adaptadores: timeout, cancelamento e tradução de
 * erros em AppError. Nunca guarda nem repete o corpo da resposta do provedor:
 * ele só é inspecionado aqui para classificar o erro.
 */
import { AppError } from "../core";

export const TIMEOUT_MS = 120_000;

/** Pistas extraídas do corpo de um erro 400, sem guardar o texto. */
export interface HttpHints {
  /** O provedor reclamou de response_format / json_schema. */
  responseFormat: boolean;
  /** O provedor reclamou de max_tokens. */
  maxTokens: boolean;
}

export class LlmHttpError extends AppError {
  readonly status: number;
  readonly hints: HttpHints;

  constructor(
    code: ConstructorParameters<typeof AppError>[0],
    status: number,
    hints: HttpHints,
    detail?: string,
  ) {
    super(code, detail);
    this.name = "LlmHttpError";
    this.status = status;
    this.hints = hints;
  }
}

export interface HttpRequest {
  method: "GET" | "POST";
  headers: Record<string, string>;
  body?: unknown;
}

const TOO_LONG =
  /context|too long|too large|token limit|maximum.{0,30}token|exceeds? the|input.{0,20}limit/;
const BLOCKED = /safety|blocked|content[_ ]?filter|policy|prohibited|refus/;
const KEY = /api[_ ]?key|api_key_invalid|unauthori[sz]ed|authentication|invalid x-api-key/;
const MODEL = /model/;
const MODEL_MISSING =
  /not found|does not exist|not exist|unknown|invalid model|not supported|no such/;

/** Lê o corpo do erro só para classificar; o texto é descartado. */
function classify(status: number, raw: string): LlmHttpError {
  const body = raw.slice(0, 4000).toLowerCase();
  const hints: HttpHints = {
    responseFormat: /response_format|json_schema|json schema|structured|schema/.test(body),
    maxTokens: /max_tokens|max_completion_tokens/.test(body),
  };
  const detail = String(status);
  const make = (code: ConstructorParameters<typeof AppError>[0]) =>
    new LlmHttpError(code, status, hints, detail);

  if (status === 401 || status === 403) return make("llm/invalid-key");
  if (status === 429) return make("llm/quota");
  if (status === 404) return make("llm/model-not-found");
  if (status === 413) return make("llm/too-long");
  if (status === 400 || status === 422) {
    if (KEY.test(body) && !hints.responseFormat) return make("llm/invalid-key");
    if (TOO_LONG.test(body) && !hints.maxTokens) return make("llm/too-long");
    if (MODEL.test(body) && MODEL_MISSING.test(body) && !hints.responseFormat) {
      return make("llm/model-not-found");
    }
    if (BLOCKED.test(body) && !hints.responseFormat) return make("llm/blocked");
  }
  return make("llm/unknown");
}

/** Traduz uma falha de fetch ou de leitura em AppError. */
function mapThrown(e: unknown, signal: AbortSignal | undefined, timedOut: boolean): AppError {
  if (e instanceof AppError) return e;
  if (signal?.aborted) return new AppError("llm/cancelled");
  if (timedOut) return new AppError("llm/network", "timeout");
  const name = (e as { name?: string } | null)?.name;
  if (name === "AbortError") return new AppError("llm/cancelled");
  if (e instanceof TypeError) return new AppError("llm/network");
  return new AppError("llm/unknown", undefined, { cause: e });
}

/** Faz a chamada e devolve o JSON da resposta. Lança AppError. */
export async function fetchJson(
  url: string,
  req: HttpRequest,
  signal?: AbortSignal,
  timeoutMs: number = TIMEOUT_MS,
): Promise<unknown> {
  if (signal?.aborted) throw new AppError("llm/cancelled");
  const ctrl = new AbortController();
  let timedOut = false;
  const onAbort = () => ctrl.abort();
  signal?.addEventListener("abort", onAbort, { once: true });
  const timer = setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  try {
    const headers: Record<string, string> = { ...req.headers };
    const init: RequestInit = { method: req.method, headers, signal: ctrl.signal };
    if (req.body !== undefined) {
      headers["content-type"] = "application/json";
      init.body = JSON.stringify(req.body);
    }
    const res = await fetch(url, init);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw classify(res.status, text);
    }
    try {
      return await res.json();
    } catch (e) {
      if (signal?.aborted || timedOut) throw e;
      throw new AppError("llm/unknown", "resposta-nao-json", { cause: e });
    }
  } catch (e) {
    throw mapThrown(e, signal, timedOut);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/** Utilitário: objeto desconhecido -> registro, ou vazio. */
export function asRecord(v: unknown): Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}
