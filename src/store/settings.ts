/** Configurações (localStorage) e chaves de API (sessionStorage/localStorage). */
import { z } from "zod";
import {
  DEFAULT_SETTINGS,
  getProvider,
  PROVIDERS,
  type ProviderConfig,
  type ProviderId,
  type Settings,
} from "../core";

export const SETTINGS_KEY = "sb.settings";
const keyName = (provider: ProviderId) => `sb.key.${provider}`;

const providerIds = PROVIDERS.map((p) => p.id) as [ProviderId, ...ProviderId[]];

const SettingsSchema = z
  .object({
    theme: z.enum(["system", "light", "dark"]),
    fontScale: z.number().min(0.5).max(3),
    provider: z.enum(providerIds),
    model: z.string().max(200),
    baseUrl: z.string().max(500),
    rememberKey: z.boolean(),
    consentedProviders: z.array(z.enum(providerIds)),
  })
  .partial();

function storage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? globalThis.localStorage : globalThis.sessionStorage;
  } catch {
    return null;
  }
}

function defaults(): Settings {
  return { ...DEFAULT_SETTINGS, consentedProviders: [...DEFAULT_SETTINGS.consentedProviders] };
}

/** Usados só se o armazenamento do navegador não aceitar gravação. */
let memorySettings: Settings | null = null;
const memoryKeys = new Map<ProviderId, string>();

export function getSettings(): Settings {
  let raw: string | null = null;
  try {
    raw = storage("local")?.getItem(SETTINGS_KEY) ?? null;
  } catch {
    return memorySettings ? { ...memorySettings } : defaults();
  }
  if (raw === null) return memorySettings ? { ...memorySettings } : defaults();
  try {
    const parsed = SettingsSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { ...defaults(), ...parsed.data };
  } catch {
    /* JSON corrompido */
  }
  return defaults();
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const merged: Settings = { ...getSettings(), ...patch };
  try {
    const ls = storage("local");
    if (!ls) throw new Error("sem localStorage");
    ls.setItem(SETTINGS_KEY, JSON.stringify(merged));
    memorySettings = null;
  } catch {
    memorySettings = merged;
  }
  return { ...merged };
}

export function getApiKey(provider: ProviderId): string {
  for (const kind of ["session", "local"] as const) {
    try {
      const value = storage(kind)?.getItem(keyName(provider));
      if (value) return value;
    } catch {
      /* ignora */
    }
  }
  return memoryKeys.get(provider) ?? "";
}

function removeKey(kind: "local" | "session", provider: ProviderId): void {
  try {
    storage(kind)?.removeItem(keyName(provider));
  } catch {
    /* ignora */
  }
}

export function setApiKey(provider: ProviderId, key: string, remember: boolean): void {
  const value = key.trim();
  removeKey("local", provider);
  removeKey("session", provider);
  memoryKeys.delete(provider);
  if (!value) return;
  try {
    const target = storage(remember ? "local" : "session");
    if (!target) throw new Error("sem storage");
    target.setItem(keyName(provider), value);
  } catch {
    memoryKeys.set(provider, value);
  }
}

export function clearApiKeys(): void {
  for (const { id } of PROVIDERS) {
    removeKey("local", id);
    removeKey("session", id);
  }
  memoryKeys.clear();
}

export function getProviderConfig(): ProviderConfig | null {
  const settings = getSettings();
  const model = settings.model.trim();
  if (!model) return null;
  const apiKey = getApiKey(settings.provider);
  if (!apiKey && !getProvider(settings.provider).keyOptional) return null;
  if (settings.provider === "custom") {
    const baseUrl = settings.baseUrl.trim();
    if (!baseUrl) return null;
    return { provider: "custom", apiKey, model, baseUrl };
  }
  return { provider: settings.provider, apiKey, model };
}
