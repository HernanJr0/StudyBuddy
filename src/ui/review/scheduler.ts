/**
 * Agendamento da revisão espaçada com FSRS (ts-fsrs). Fica isolado aqui:
 * a interface só fala em notas ("Errei", "Difícil", "Bom", "Fácil").
 */
import { type Card, createEmptyCard, fsrs, type Grade, Rating, State } from "ts-fsrs";
import type { ReviewState } from "../../core";

export type GradeKey = "again" | "hard" | "good" | "easy";

export const GRADES: { key: GradeKey; label: string; rating: Grade }[] = [
  { key: "again", label: "Errei", rating: Rating.Again },
  { key: "hard", label: "Difícil", rating: Rating.Hard },
  { key: "good", label: "Bom", rating: Rating.Good },
  { key: "easy", label: "Fácil", rating: Rating.Easy },
];

const scheduler = fsrs();

const DATE_FIELDS = ["due", "last_review"] as const;

/** Card do algoritmo → objeto simples (datas em ISO), pronto para guardar. */
export function serializeCard(card: Card): Record<string, unknown> {
  const out: Record<string, unknown> = { ...card };
  for (const field of DATE_FIELDS) {
    const value = card[field];
    if (value) out[field] = value.toISOString();
    else delete out[field];
  }
  return out;
}

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Reconstrói o Card a partir do que foi guardado. Valores inválidos viram os de um cartão novo. */
export function deserializeCard(state: ReviewState): Card {
  const raw = state.card;
  const base = createEmptyCard(new Date(state.due));
  const last = typeof raw.last_review === "string" ? new Date(raw.last_review) : undefined;
  const st = num(raw.state, State.New);
  return {
    due: new Date(state.due),
    stability: num(raw.stability, base.stability),
    difficulty: num(raw.difficulty, base.difficulty),
    scheduled_days: num(raw.scheduled_days, base.scheduled_days),
    learning_steps: num(raw.learning_steps, base.learning_steps),
    reps: num(raw.reps, base.reps),
    lapses: num(raw.lapses, base.lapses),
    state: st >= State.New && st <= State.Relearning ? (st as State) : State.New,
    last_review: last && !Number.isNaN(last.getTime()) ? last : undefined,
  };
}

function cardOf(state: ReviewState | undefined, now: Date): Card {
  return state ? deserializeCard(state) : createEmptyCard(now);
}

/** Aplica a nota e devolve o novo estado (a data de vencimento já vem em `due`). */
export function gradeCard(
  state: ReviewState | undefined,
  ids: { packId: string; cardId: string },
  grade: GradeKey,
  now: Date,
): ReviewState {
  const rating = GRADES.find((g) => g.key === grade)?.rating ?? Rating.Good;
  const { card } = scheduler.next(cardOf(state, now), now, rating);
  return {
    packId: ids.packId,
    cardId: ids.cardId,
    due: card.due.toISOString(),
    card: serializeCard(card),
  };
}

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** "em 10 min", "em 3 dias", "em 2 meses"... */
export function formatInterval(ms: number): string {
  if (ms < MIN) return "em menos de 1 min";
  if (ms < HOUR) return `em ${Math.round(ms / MIN)} min`;
  if (ms < DAY) return `em ${Math.round(ms / HOUR)} h`;
  const days = Math.round(ms / DAY);
  if (days < 30) return days === 1 ? "em 1 dia" : `em ${days} dias`;
  if (days < 365) {
    const months = Math.round(days / 30);
    return months === 1 ? "em 1 mês" : `em ${months} meses`;
  }
  const years = Math.round((days / 365) * 10) / 10;
  return years === 1 ? "em 1 ano" : `em ${String(years).replace(".", ",")} anos`;
}

/** Quando o cartão volta para cada nota, sem gravar nada. */
export function previewIntervals(
  state: ReviewState | undefined,
  now: Date,
): Record<GradeKey, string> {
  const preview = scheduler.repeat(cardOf(state, now), now);
  const out = {} as Record<GradeKey, string>;
  for (const g of GRADES) {
    out[g.key] = formatInterval(preview[g.rating].card.due.getTime() - now.getTime());
  }
  return out;
}

/** Nota usada pelo modo Errei/Acertei dos flashcards do pacote. */
export function gradeForMark(known: boolean): GradeKey {
  return known ? "good" : "again";
}
