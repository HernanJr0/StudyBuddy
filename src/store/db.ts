/**
 * Conexão com o IndexedDB nativo. Banco "studybuddy", versão 1.
 * Qualquer falha vira AppError("store/unavailable").
 */
import { AppError } from "../core";

export const DB_NAME = "studybuddy";
export const DB_VERSION = 1;

export type StoreName = "packs" | "attempts" | "marks";

let connection: Promise<IDBDatabase> | null = null;

function unavailable(cause?: unknown, detail?: string): AppError {
  return new AppError("store/unavailable", detail, { cause });
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request: IDBOpenDBRequest;
    try {
      if (typeof indexedDB === "undefined") throw new Error("indexedDB indisponível");
      request = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (e) {
      reject(unavailable(e));
      return;
    }
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("packs")) {
        db.createObjectStore("packs", { keyPath: "pack.id" });
      }
      if (!db.objectStoreNames.contains("attempts")) {
        const attempts = db.createObjectStore("attempts", { keyPath: "id" });
        attempts.createIndex("packId", "packId");
      }
      if (!db.objectStoreNames.contains("marks")) {
        const marks = db.createObjectStore("marks", { keyPath: ["packId", "cardId"] });
        marks.createIndex("packId", "packId");
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      const drop = () => {
        connection = null;
      };
      db.onclose = drop;
      db.onversionchange = () => {
        db.close();
        drop();
      };
      resolve(db);
    };
    request.onerror = () => reject(unavailable(request.error));
    request.onblocked = () => reject(unavailable(undefined, "blocked"));
  });
}

export function openDb(): Promise<IDBDatabase> {
  if (!connection) {
    connection = open();
    connection.catch(() => {
      connection = null;
    });
  }
  return connection;
}

/** Fecha a conexão em cache (usado em testes). */
export async function closeDb(): Promise<void> {
  const current = connection;
  connection = null;
  if (current) (await current.catch(() => null))?.close();
}

export function req<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Executa `fn` dentro de uma transação e só resolve quando ela é confirmada.
 * Use apenas `await req(...)` dentro de `fn`, para a transação não fechar antes da hora.
 */
export async function withTx<T>(
  stores: StoreName[],
  mode: IDBTransactionMode,
  fn: (tx: IDBTransaction) => Promise<T>,
): Promise<T> {
  try {
    const db = await openDb();
    const tx = db.transaction(stores, mode);
    const done = new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error ?? new Error("abort"));
    });
    done.catch(() => {});
    let result: T;
    try {
      result = await fn(tx);
    } catch (e) {
      try {
        tx.abort();
      } catch {
        /* já encerrada */
      }
      throw e;
    }
    await done;
    return result;
  } catch (e) {
    if (e instanceof AppError) throw e;
    connection = null;
    throw unavailable(e);
  }
}
