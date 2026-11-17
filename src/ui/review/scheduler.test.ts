import { describe, expect, it } from "vitest";
import { ReviewStateSchema } from "../../core";
import {
  deserializeCard,
  formatInterval,
  gradeCard,
  gradeForMark,
  previewIntervals,
} from "./scheduler";

const ids = { packId: "p", cardId: "f1" };
const t0 = new Date("2026-01-01T10:00:00.000Z");

describe("scheduler", () => {
  it("formata intervalos em português", () => {
    expect(formatInterval(10_000)).toBe("em menos de 1 min");
    expect(formatInterval(10 * 60_000)).toBe("em 10 min");
    expect(formatInterval(5 * 3_600_000)).toBe("em 5 h");
    expect(formatInterval(86_400_000)).toBe("em 1 dia");
    expect(formatInterval(3 * 86_400_000)).toBe("em 3 dias");
    expect(formatInterval(60 * 86_400_000)).toBe("em 2 meses");
    expect(formatInterval(400 * 86_400_000)).toBe("em 1,1 anos");
  });

  it("cartão novo: Bom volta em minutos, Fácil em dias; Errei é o mais curto", () => {
    const p = previewIntervals(undefined, t0);
    expect(p.good).toBe("em 10 min");
    expect(p.easy).toMatch(/dias/);
    expect(p.again).toBe("em 1 min");
  });

  it("grava um estado válido, com datas em ISO", () => {
    const s = gradeCard(undefined, ids, "good", t0);
    expect(ReviewStateSchema.safeParse(s).success).toBe(true);
    expect(s.due).toBe("2026-01-01T10:10:00.000Z");
    expect(s.card.due).toBe(s.due);
    expect(s.card.last_review).toBe(t0.toISOString());
    expect(() => JSON.stringify(s)).not.toThrow();
  });

  it("reconstrói o card guardado", () => {
    const s = gradeCard(undefined, ids, "easy", t0);
    const card = deserializeCard(s);
    expect(card.due).toBeInstanceOf(Date);
    expect(card.due.toISOString()).toBe(s.due);
    expect(card.reps).toBe(1);
    expect(card.last_review?.toISOString()).toBe(t0.toISOString());
  });

  it("os intervalos crescem a cada acerto", () => {
    let s = gradeCard(undefined, ids, "easy", t0);
    let prev = new Date(s.due).getTime() - t0.getTime();
    let now = new Date(s.due);
    for (let i = 0; i < 3; i++) {
      s = gradeCard(s, ids, "good", now);
      const gap = new Date(s.due).getTime() - now.getTime();
      expect(gap).toBeGreaterThan(prev);
      prev = gap;
      now = new Date(s.due);
    }
  });

  it("errar depois de aprender conta como lapso e volta logo", () => {
    const learned = gradeCard(undefined, ids, "easy", t0);
    const at = new Date(learned.due);
    const lapsed = gradeCard(learned, ids, "again", at);
    expect(lapsed.card.lapses).toBe(1);
    expect(new Date(lapsed.due).getTime() - at.getTime()).toBeLessThan(86_400_000);
  });

  it("estado corrompido vira cartão novo, sem lançar", () => {
    const card = deserializeCard({ ...ids, due: t0.toISOString(), card: { state: 99, reps: "x" } });
    expect(card.state).toBe(0);
    expect(card.reps).toBe(0);
  });

  it("Errei/Acertei viram Again/Good", () => {
    expect(gradeForMark(false)).toBe("again");
    expect(gradeForMark(true)).toBe("good");
  });
});
