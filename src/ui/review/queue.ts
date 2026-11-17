import type { Flashcard, ReviewState, StudyPack } from "../../core";
import { store } from "../../store";

export interface DueItem {
  state: ReviewState;
  card: Flashcard;
  packId: string;
  packTitle: string;
}

export interface ReviewQueue {
  /** Cartões vencidos, do mais atrasado ao mais recente. */
  due: DueItem[];
  /** Data da revisão mais próxima ainda não vencida. */
  nextDue: Date | null;
}

/** Procura os cartões que vencem até `now`. Estados de cartões ou pacotes excluídos são ignorados. */
export async function loadQueue(now: Date): Promise<ReviewQueue> {
  const horizon = new Date(now.getTime() + 100 * 365 * 86_400_000);
  const all = await store.listDueReviews(horizon);
  const packs = new Map<string, StudyPack | undefined>();
  for (const id of new Set(all.map((s) => s.packId))) packs.set(id, await store.getPack(id));

  const due: DueItem[] = [];
  let nextDue: Date | null = null;
  for (const state of all) {
    const pack = packs.get(state.packId);
    const card = pack?.flashcards.find((c) => c.id === state.cardId);
    if (!pack || !card) continue;
    const when = new Date(state.due);
    if (when.getTime() <= now.getTime()) {
      due.push({ state, card, packId: pack.id, packTitle: pack.title });
    } else if (!nextDue || when < nextDue) {
      nextDue = when;
    }
  }
  return { due, nextDue };
}
