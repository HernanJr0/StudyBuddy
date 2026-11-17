/**
 * Módulo store — IMPLEMENTAÇÃO PROVISÓRIA (Etapa 0), em memória.
 * A frente C substitui o conteúdo mantendo a exportação `store: StoreModule`.
 */
import {
  AppError,
  type Attempt,
  type CardMark,
  DEFAULT_SETTINGS,
  type PackOrigin,
  type PackSummary,
  type ProviderId,
  type Settings,
  type StoreModule,
  type StudyPack,
  StudyPackSchema,
} from "../core";
import { examplePack } from "../core/fixtures";

interface Row {
  pack: StudyPack;
  origin: PackOrigin;
  savedAt: string;
}

const packs = new Map<string, Row>([
  [examplePack.id, { pack: examplePack, origin: "imported", savedAt: examplePack.createdAt }],
]);
const attempts: Attempt[] = [];
const marks: CardMark[] = [];
const keys = new Map<ProviderId, string>();
let settings: Settings = { ...DEFAULT_SETTINGS };

function parsePack(value: unknown): StudyPack {
  const result = StudyPackSchema.safeParse(value);
  if (!result.success) throw new AppError("share/invalid");
  return result.data;
}

function slug(title: string): string {
  const base = title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  return base || "pacote";
}

export const store: StoreModule = {
  async listPacks() {
    return [...packs.values()]
      .map(({ pack, origin, savedAt }): PackSummary => {
        const last = attempts.filter((a) => a.packId === pack.id && a.scope === "all").at(-1);
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
  },
  async getPack(id) {
    return packs.get(id)?.pack;
  },
  async savePack(pack, origin) {
    packs.set(pack.id, { pack, origin, savedAt: new Date().toISOString() });
  },
  async deletePack(id) {
    packs.delete(id);
  },
  async clearAll() {
    packs.clear();
    attempts.length = 0;
    marks.length = 0;
  },

  async addAttempt(attempt) {
    attempts.push(attempt);
  },
  async listAttempts(packId) {
    return attempts.filter((a) => a.packId === packId);
  },
  async saveCardMark(mark) {
    const i = marks.findIndex((m) => m.packId === mark.packId && m.cardId === mark.cardId);
    if (i >= 0) marks[i] = mark;
    else marks.push(mark);
  },
  async listCardMarks(packId) {
    return marks.filter((m) => m.packId === packId);
  },

  getSettings() {
    return settings;
  },
  saveSettings(patch) {
    settings = { ...settings, ...patch };
    return settings;
  },
  getApiKey(provider) {
    return keys.get(provider) ?? "";
  },
  setApiKey(provider, key) {
    keys.set(provider, key);
  },
  clearApiKeys() {
    keys.clear();
  },
  getProviderConfig() {
    const apiKey = keys.get(settings.provider) ?? "";
    if (!settings.model || (!apiKey && settings.provider !== "custom")) return null;
    return {
      provider: settings.provider,
      apiKey,
      model: settings.model,
      ...(settings.baseUrl ? { baseUrl: settings.baseUrl } : {}),
    };
  },

  packToFile(pack) {
    const blob = new Blob([JSON.stringify(pack)], { type: "application/json" });
    return { blob, fileName: `${slug(pack.title)}.studybuddy.json` };
  },
  async packFromFile(file) {
    try {
      return parsePack(JSON.parse(await file.text()));
    } catch (e) {
      throw e instanceof AppError ? e : new AppError("share/invalid");
    }
  },
  async packToLink(pack, baseUrl) {
    const bytes = new TextEncoder().encode(JSON.stringify(pack));
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const b64 = btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
    return `${baseUrl}#/abrir/${b64}`;
  },
  async packFromLinkPayload(payload) {
    try {
      const b64 = payload.replaceAll("-", "+").replaceAll("_", "/");
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      return parsePack(JSON.parse(new TextDecoder().decode(bytes)));
    } catch (e) {
      throw e instanceof AppError ? e : new AppError("share/invalid");
    }
  },
  flashcardsToAnkiCsv(pack) {
    const cell = (s: string) => `"${s.replaceAll('"', '""')}"`;
    const rows = pack.flashcards.map((c) => [c.front, c.back, `p${c.page}`].map(cell).join(";"));
    const blob = new Blob([`﻿${rows.join("\r\n")}\r\n`], { type: "text/csv;charset=utf-8" });
    return { blob, fileName: `${slug(pack.title)}-anki.csv` };
  },
};
