import "fake-indexeddb/auto";
import { IDBFactory } from "fake-indexeddb";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReviewState } from "../core";
import { examplePack } from "../core/fixtures";
import { closeDb, DB_NAME } from "./db";
import { addAttempt, clearAll, deletePack, listCardMarks, saveCardMark, savePack } from "./packs";
import { listDueReviews, listReviewStates, saveReviewState } from "./review";

function state(cardId: string, due: string, packId = examplePack.id): ReviewState {
  return { packId, cardId, due, card: { reps: 1 } };
}

beforeEach(async () => {
  await closeDb();
  globalThis.indexedDB = new IDBFactory();
});

describe("estados de revisão", () => {
  it("salva, substitui e lista por pacote", async () => {
    await saveReviewState(state("f1", "2026-01-02T10:00:00.000Z"));
    await saveReviewState(state("f1", "2026-01-05T10:00:00.000Z"));
    await saveReviewState(state("f2", "2026-01-03T10:00:00.000Z"));
    await saveReviewState(state("f1", "2026-01-03T10:00:00.000Z", "outro"));
    const list = await listReviewStates(examplePack.id);
    expect(list.map((s) => [s.cardId, s.due])).toEqual([
      ["f1", "2026-01-05T10:00:00.000Z"],
      ["f2", "2026-01-03T10:00:00.000Z"],
    ]);
  });

  it("recusa estado fora do esquema", async () => {
    await expect(saveReviewState(state("f1", "ontem"))).rejects.toMatchObject({
      code: "store/unavailable",
    });
  });

  it("listDueReviews: vencidos até agora, do mais atrasado ao mais recente", async () => {
    await saveReviewState(state("f1", "2026-01-03T10:00:00.000Z"));
    await saveReviewState(state("f2", "2026-01-01T10:00:00.000Z"));
    await saveReviewState(state("f3", "2026-01-02T10:00:00Z"));
    await saveReviewState(state("f4", "2026-02-01T10:00:00.000Z", "outro"));
    const due = await listDueReviews(new Date("2026-01-03T10:00:00.000Z"));
    expect(due.map((s) => s.cardId)).toEqual(["f2", "f3", "f1"]);
    expect(await listDueReviews(new Date("2025-12-31T00:00:00.000Z"))).toEqual([]);
  });

  it("avisa a interface ao salvar", async () => {
    const seen = vi.fn();
    window.addEventListener("studybuddy:packs-changed", seen);
    await saveReviewState(state("f1", "2026-01-02T10:00:00.000Z"));
    window.removeEventListener("studybuddy:packs-changed", seen);
    expect(seen).toHaveBeenCalledTimes(1);
  });

  it("deletePack e clearAll apagam os estados", async () => {
    await savePack(examplePack, "generated");
    await saveReviewState(state("f1", "2026-01-02T10:00:00.000Z"));
    await saveReviewState(state("f1", "2026-01-02T10:00:00.000Z", "outro"));
    await deletePack(examplePack.id);
    expect(await listReviewStates(examplePack.id)).toEqual([]);
    expect(await listReviewStates("outro")).toHaveLength(1);
    await clearAll();
    expect(await listReviewStates("outro")).toEqual([]);
  });
});

describe("migração v1 para v2", () => {
  it("abre um banco v1 populado sem perder dados e cria 'reviews'", async () => {
    await closeDb();
    const v1 = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => {
        const db = r.result;
        db.createObjectStore("packs", { keyPath: "pack.id" });
        db.createObjectStore("attempts", { keyPath: "id" }).createIndex("packId", "packId");
        db.createObjectStore("marks", { keyPath: ["packId", "cardId"] }).createIndex(
          "packId",
          "packId",
        );
      };
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = v1.transaction(["packs", "marks"], "readwrite");
    tx.objectStore("packs").put({
      pack: examplePack,
      origin: "generated",
      savedAt: "2026-01-01T10:00:00.000Z",
    });
    tx.objectStore("marks").put({
      packId: examplePack.id,
      cardId: "f1",
      known: true,
      at: "2026-01-01T10:00:00.000Z",
    });
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    v1.close();

    expect(await listReviewStates(examplePack.id)).toEqual([]);
    expect(await listCardMarks(examplePack.id)).toHaveLength(1);
    await saveReviewState(state("f1", "2026-01-02T10:00:00.000Z"));
    expect(await listDueReviews(new Date("2026-01-03T00:00:00.000Z"))).toHaveLength(1);
    await addAttempt({
      id: "a",
      packId: examplePack.id,
      at: "2026-01-01T10:00:00.000Z",
      scope: "all",
      total: 1,
      correct: 1,
      answers: [{ questionId: "q1", chosenIndex: 0, correct: true }],
    });
    await saveCardMark({
      packId: examplePack.id,
      cardId: "f2",
      known: false,
      at: "2026-01-01T10:00:00.000Z",
    });
  });
});
