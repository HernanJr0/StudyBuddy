import { store } from "../../store";
import { type GradeKey, gradeCard } from "./scheduler";

/** Grava a nota de um cartão, partindo do estado FSRS que ele já tiver. */
export async function recordGrade(
  packId: string,
  cardId: string,
  grade: GradeKey,
  now = new Date(),
): Promise<void> {
  const states = await store.listReviewStates(packId);
  const previous = states.find((s) => s.cardId === cardId);
  await store.saveReviewState(gradeCard(previous, { packId, cardId }, grade, now));
}
