import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Attempt, CardMark } from "../core";
import { examplePack } from "../core/fixtures";
import { closeDb } from "./db";
import {
  addAttempt,
  clearAll,
  deletePack,
  getPack,
  listAttempts,
  listCardMarks,
  listPacks,
  saveCardMark,
  savePack,
  updatePack,
} from "./packs";

const other = { ...examplePack, id: "outro", title: "Outro pacote" };

function attempt(over: Partial<Attempt> = {}): Attempt {
  return {
    id: crypto.randomUUID(),
    packId: examplePack.id,
    at: "2026-01-01T10:00:00.000Z",
    scope: "all",
    total: 8,
    correct: 5,
    answers: [{ questionId: "q1", chosenIndex: 0, correct: true }],
    ...over,
  };
}

function mark(over: Partial<CardMark> = {}): CardMark {
  return {
    packId: examplePack.id,
    cardId: "f1",
    known: true,
    at: "2026-01-01T10:00:00.000Z",
    ...over,
  };
}

beforeEach(async () => {
  await closeDb();
  globalThis.indexedDB = new IDBFactory();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-03-01T10:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("pacotes", () => {
  it("salva e lê um pacote", async () => {
    await savePack(examplePack, "generated");
    expect(await getPack(examplePack.id)).toEqual(examplePack);
    expect(await getPack("nao-existe")).toBeUndefined();
  });

  it("substitui um pacote com o mesmo id", async () => {
    await savePack(examplePack, "generated");
    await savePack({ ...examplePack, title: "Novo" }, "imported");
    const list = await listPacks();
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({ title: "Novo", origin: "imported" });
  });

  it("recusa pacote fora do esquema", async () => {
    const bad = { ...examplePack, title: "" };
    await expect(savePack(bad, "generated")).rejects.toMatchObject({ code: "store/unavailable" });
  });

  it("lista em ordem de savedAt decrescente, com contagens", async () => {
    await savePack(examplePack, "generated");
    vi.setSystemTime(new Date("2026-03-02T10:00:00.000Z"));
    await savePack(other, "imported");
    const list = await listPacks();
    expect(list.map((p) => p.id)).toEqual(["outro", examplePack.id]);
    expect(list[0]).toMatchObject({
      origin: "imported",
      savedAt: "2026-03-02T10:00:00.000Z",
      flashcardCount: examplePack.flashcards.length,
      questionCount: examplePack.questions.length,
    });
    expect(list[0]?.lastScore).toBeUndefined();
  });

  it("lastScore é a última tentativa de escopo all", async () => {
    await savePack(examplePack, "generated");
    await addAttempt(attempt({ at: "2026-01-01T10:00:00.000Z", correct: 2 }));
    await addAttempt(attempt({ at: "2026-01-03T10:00:00.000Z", correct: 7 }));
    await addAttempt(attempt({ at: "2026-01-02T10:00:00.000Z", correct: 4 }));
    await addAttempt(attempt({ at: "2026-01-05T10:00:00.000Z", scope: "wrong", correct: 1 }));
    const [summary] = await listPacks();
    expect(summary?.lastScore).toEqual({ correct: 7, total: 8, at: "2026-01-03T10:00:00.000Z" });
  });

  it("updatePack mantém origem e data; ignora pacote inexistente", async () => {
    await savePack(examplePack, "imported");
    vi.setSystemTime(new Date("2026-04-01T10:00:00.000Z"));
    await updatePack({ ...examplePack, title: "Editado" });
    const [summary] = await listPacks();
    expect(summary).toMatchObject({
      title: "Editado",
      origin: "imported",
      savedAt: "2026-03-01T10:00:00.000Z",
    });
    await updatePack(other);
    expect(await getPack("outro")).toBeUndefined();
  });

  it("deletePack apaga tentativas e marcações só do pacote", async () => {
    await savePack(examplePack, "generated");
    await savePack(other, "generated");
    await addAttempt(attempt());
    await addAttempt(attempt({ packId: "outro" }));
    await saveCardMark(mark());
    await saveCardMark(mark({ packId: "outro" }));
    await deletePack(examplePack.id);
    expect(await getPack(examplePack.id)).toBeUndefined();
    expect(await listAttempts(examplePack.id)).toEqual([]);
    expect(await listCardMarks(examplePack.id)).toEqual([]);
    expect(await listAttempts("outro")).toHaveLength(1);
    expect(await listCardMarks("outro")).toHaveLength(1);
    expect(await getPack("outro")).toBeDefined();
  });

  it("clearAll apaga os três stores e preserva configurações e chaves", async () => {
    localStorage.setItem("sb.settings", "{}");
    localStorage.setItem("sb.key.gemini", "k");
    await savePack(examplePack, "generated");
    await addAttempt(attempt());
    await saveCardMark(mark());
    await clearAll();
    expect(await listPacks()).toEqual([]);
    expect(await listAttempts(examplePack.id)).toEqual([]);
    expect(await listCardMarks(examplePack.id)).toEqual([]);
    expect(localStorage.getItem("sb.settings")).toBe("{}");
    expect(localStorage.getItem("sb.key.gemini")).toBe("k");
    localStorage.clear();
  });
});

describe("tentativas e marcações", () => {
  it("lista tentativas em ordem cronológica", async () => {
    await addAttempt(attempt({ id: "b", at: "2026-01-02T00:00:00.000Z" }));
    await addAttempt(attempt({ id: "a", at: "2026-01-01T00:00:00.000Z" }));
    expect((await listAttempts(examplePack.id)).map((a) => a.id)).toEqual(["a", "b"]);
  });

  it("recusa tentativa inválida", async () => {
    await expect(addAttempt(attempt({ total: 0 }))).rejects.toMatchObject({
      code: "store/unavailable",
    });
  });

  it("saveCardMark sobrescreve a marcação do mesmo cartão", async () => {
    await saveCardMark(mark({ known: true }));
    await saveCardMark(mark({ known: false }));
    await saveCardMark(mark({ cardId: "f2" }));
    const marks = await listCardMarks(examplePack.id);
    expect(marks).toHaveLength(2);
    expect(marks.find((m) => m.cardId === "f1")?.known).toBe(false);
  });
});

describe("indisponibilidade", () => {
  it("vira store/unavailable quando o IndexedDB não existe", async () => {
    await closeDb();
    const original = globalThis.indexedDB;
    // @ts-expect-error simula navegador sem IndexedDB
    globalThis.indexedDB = undefined;
    await expect(listPacks()).rejects.toMatchObject({ code: "store/unavailable" });
    globalThis.indexedDB = original;
    await expect(listPacks()).resolves.toEqual([]);
  });
});
