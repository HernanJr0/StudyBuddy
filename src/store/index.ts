/**
 * Módulo store: pacotes e progresso no IndexedDB, configurações e chaves no
 * armazenamento do navegador, compartilhamento por arquivo e link, CSV do Anki.
 */
import type { StoreModule } from "../core";
import { flashcardsToAnkiCsv } from "./anki";
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
import {
  clearApiKeys,
  getApiKey,
  getProviderConfig,
  getSettings,
  saveSettings,
  setApiKey,
} from "./settings";
import { packFromFile, packFromLinkPayload, packToFile, packToLink } from "./share";

export const store: StoreModule = {
  listPacks,
  getPack,
  savePack,
  updatePack,
  deletePack,
  clearAll,
  addAttempt,
  listAttempts,
  saveCardMark,
  listCardMarks,
  getSettings,
  saveSettings,
  getApiKey,
  setApiKey,
  clearApiKeys,
  getProviderConfig,
  packToFile,
  packFromFile,
  packToLink,
  packFromLinkPayload,
  flashcardsToAnkiCsv,
};
