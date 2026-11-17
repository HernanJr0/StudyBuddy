import type { ModelInfo } from "../../core";

export interface Conn {
  /** Endereço base, sem barra final. */
  base: string;
  apiKey: string;
  signal?: AbortSignal | undefined;
}

export interface GenerateRequest extends Conn {
  model: string;
  system: string;
  user: string;
  /** Esquema completo em texto, para provedores sem esquema estrito. */
  schemaText: string;
}

export interface Adapter {
  listModels(conn: Conn): Promise<ModelInfo[]>;
  /** Chamada mínima para confirmar chave e modelo. */
  ping(conn: Conn, model: string): Promise<void>;
  /** Devolve o texto bruto da resposta. Lança AppError. */
  generate(req: GenerateRequest): Promise<string>;
}
