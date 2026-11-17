import { AppError, type ReviewState, ReviewStateSchema } from "../core";
import { req, withTx } from "./db";

function notifyChanged(): void {
  try {
    window.dispatchEvent(new Event("studybuddy:packs-changed"));
  } catch {
    // Sem `window` (ex.: testes em Node): nada a notificar.
  }
}

function parse(value: unknown): ReviewState {
  const result = ReviewStateSchema.safeParse(value);
  if (!result.success) throw new AppError("store/unavailable", "invalid-data");
  return result.data;
}

export async function listReviewStates(packId: string): Promise<ReviewState[]> {
  return withTx(["reviews"], "readonly", (tx) =>
    req(tx.objectStore("reviews").index("packId").getAll(packId) as IDBRequest<ReviewState[]>),
  );
}

export async function saveReviewState(state: ReviewState): Promise<void> {
  const parsed = parse(state);
  // Normaliza a data: a ordem do índice "due" é a ordem do texto ISO.
  const due = new Date(parsed.due);
  if (Number.isNaN(due.getTime())) throw new AppError("store/unavailable", "invalid-data");
  const value: ReviewState = { ...parsed, due: due.toISOString() };
  await withTx(["reviews"], "readwrite", async (tx) => {
    await req(tx.objectStore("reviews").put(value));
  });
  notifyChanged();
}

/** Estados com `due` até `now`, do mais atrasado para o mais recente. */
export async function listDueReviews(now: Date): Promise<ReviewState[]> {
  const range = IDBKeyRange.upperBound(now.toISOString());
  return withTx(["reviews"], "readonly", (tx) =>
    req(tx.objectStore("reviews").index("due").getAll(range) as IDBRequest<ReviewState[]>),
  );
}
