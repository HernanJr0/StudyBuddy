import {
  AppError,
  type Attempt,
  AttemptSchema,
  type CardMark,
  CardMarkSchema,
  type PackOrigin,
  PackOriginSchema,
  type PackSummary,
  type StudyPack,
  StudyPackSchema,
} from "../core";
import { req, withTx } from "./db";

/** Avisa a interface (ex.: barra lateral) que a lista de pacotes mudou. */
function notifyPacksChanged(): void {
  try {
    window.dispatchEvent(new Event("studybuddy:packs-changed"));
  } catch {
    // Sem `window` (ex.: testes em Node): nada a notificar.
  }
}

interface Row {
  pack: StudyPack;
  origin: PackOrigin;
  savedAt: string;
}

function valid<T>(
  schema: { safeParse(v: unknown): { success: boolean; data?: T } },
  v: unknown,
): T {
  const result = schema.safeParse(v);
  if (!result.success) throw new AppError("store/unavailable", "invalid-data");
  return result.data as T;
}

export async function listPacks(): Promise<PackSummary[]> {
  const { rows, attempts } = await withTx(["packs", "attempts"], "readonly", async (tx) => ({
    rows: (await req(tx.objectStore("packs").getAll())) as Row[],
    attempts: (await req(tx.objectStore("attempts").getAll())) as Attempt[],
  }));
  const lastByPack = new Map<string, Attempt>();
  for (const a of attempts) {
    if (a.scope !== "all") continue;
    const prev = lastByPack.get(a.packId);
    if (!prev || a.at >= prev.at) lastByPack.set(a.packId, a);
  }
  return rows
    .map(({ pack, origin, savedAt }): PackSummary => {
      const last = lastByPack.get(pack.id);
      return {
        id: pack.id,
        title: pack.title,
        createdAt: pack.createdAt,
        savedAt,
        origin,
        flashcardCount: pack.flashcards.length,
        questionCount: pack.questions.length,
        ...(last ? { lastScore: { correct: last.correct, total: last.total, at: last.at } } : {}),
      };
    })
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function getPack(id: string): Promise<StudyPack | undefined> {
  const row = await withTx(["packs"], "readonly", (tx) =>
    req(tx.objectStore("packs").get(id) as IDBRequest<Row | undefined>),
  );
  return row?.pack;
}

export async function savePack(pack: StudyPack, origin: PackOrigin): Promise<void> {
  const row: Row = {
    pack: valid<StudyPack>(StudyPackSchema, pack),
    origin: valid<PackOrigin>(PackOriginSchema, origin),
    savedAt: new Date().toISOString(),
  };
  await withTx(["packs"], "readwrite", async (tx) => {
    await req(tx.objectStore("packs").put(row));
  });
  notifyPacksChanged();
}

export async function updatePack(pack: StudyPack): Promise<void> {
  const next = valid<StudyPack>(StudyPackSchema, pack);
  await withTx(["packs"], "readwrite", async (tx) => {
    const store = tx.objectStore("packs");
    const row = (await req(store.get(next.id))) as Row | undefined;
    if (row) await req(store.put({ ...row, pack: next }));
  });
  notifyPacksChanged();
}

export async function deletePack(id: string): Promise<void> {
  await withTx(["packs", "attempts", "marks"], "readwrite", async (tx) => {
    await req(tx.objectStore("packs").delete(id));
    for (const name of ["attempts", "marks"] as const) {
      const store = tx.objectStore(name);
      const keys = await req(store.index("packId").getAllKeys(id));
      for (const key of keys) await req(store.delete(key));
    }
  });
  notifyPacksChanged();
}

export async function clearAll(): Promise<void> {
  await withTx(["packs", "attempts", "marks"], "readwrite", async (tx) => {
    await req(tx.objectStore("packs").clear());
    await req(tx.objectStore("attempts").clear());
    await req(tx.objectStore("marks").clear());
  });
  notifyPacksChanged();
}

export async function addAttempt(attempt: Attempt): Promise<void> {
  const value = valid<Attempt>(AttemptSchema, attempt);
  await withTx(["attempts"], "readwrite", async (tx) => {
    await req(tx.objectStore("attempts").put(value));
  });
}

export async function listAttempts(packId: string): Promise<Attempt[]> {
  const list = await withTx(["attempts"], "readonly", (tx) =>
    req(tx.objectStore("attempts").index("packId").getAll(packId) as IDBRequest<Attempt[]>),
  );
  return list.sort((a, b) => a.at.localeCompare(b.at));
}

export async function saveCardMark(mark: CardMark): Promise<void> {
  const value = valid<CardMark>(CardMarkSchema, mark);
  await withTx(["marks"], "readwrite", async (tx) => {
    await req(tx.objectStore("marks").put(value));
  });
}

export function listCardMarks(packId: string): Promise<CardMark[]> {
  return withTx(["marks"], "readonly", (tx) =>
    req(tx.objectStore("marks").index("packId").getAll(packId) as IDBRequest<CardMark[]>),
  );
}
