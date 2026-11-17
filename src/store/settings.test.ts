import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../core";
import {
  clearApiKeys,
  getApiKey,
  getProviderConfig,
  getSettings,
  saveSettings,
  setApiKey,
} from "./settings";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

describe("configurações", () => {
  it("devolve o padrão quando ausente", () => {
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("não compartilha o array do padrão", () => {
    getSettings().consentedProviders.push("openai");
    expect(getSettings().consentedProviders).toEqual([]);
  });

  it("faz merge e persiste", () => {
    const saved = saveSettings({ theme: "dark", model: "m1" });
    expect(saved).toEqual({ ...DEFAULT_SETTINGS, theme: "dark", model: "m1" });
    saveSettings({ fontScale: 1.3 });
    expect(getSettings()).toEqual({
      ...DEFAULT_SETTINGS,
      theme: "dark",
      model: "m1",
      fontScale: 1.3,
    });
    expect(JSON.parse(localStorage.getItem("sb.settings") ?? "{}").theme).toBe("dark");
  });

  it("volta ao padrão com JSON corrompido ou valor inválido", () => {
    localStorage.setItem("sb.settings", "{nao é json");
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem("sb.settings", JSON.stringify({ theme: "neon" }));
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
    localStorage.setItem("sb.settings", "42");
    expect(getSettings()).toEqual(DEFAULT_SETTINGS);
  });

  it("completa campos ausentes com o padrão", () => {
    localStorage.setItem("sb.settings", JSON.stringify({ theme: "light" }));
    expect(getSettings()).toEqual({ ...DEFAULT_SETTINGS, theme: "light" });
  });
});

describe("chaves de API", () => {
  it("remember=true grava no localStorage e remove do sessionStorage", () => {
    sessionStorage.setItem("sb.key.openai", "velha");
    setApiKey("openai", "abc", true);
    expect(localStorage.getItem("sb.key.openai")).toBe("abc");
    expect(sessionStorage.getItem("sb.key.openai")).toBeNull();
    expect(getApiKey("openai")).toBe("abc");
  });

  it("remember=false grava no sessionStorage e remove do localStorage", () => {
    localStorage.setItem("sb.key.openai", "velha");
    setApiKey("openai", "xyz", false);
    expect(sessionStorage.getItem("sb.key.openai")).toBe("xyz");
    expect(localStorage.getItem("sb.key.openai")).toBeNull();
    expect(getApiKey("openai")).toBe("xyz");
  });

  it("uma chave por provedor; ausente devolve vazio", () => {
    setApiKey("gemini", "g", true);
    setApiKey("groq", "q", false);
    expect(getApiKey("gemini")).toBe("g");
    expect(getApiKey("groq")).toBe("q");
    expect(getApiKey("anthropic")).toBe("");
  });

  it("clearApiKeys apaga todas", () => {
    setApiKey("gemini", "g", true);
    setApiKey("groq", "q", false);
    clearApiKeys();
    expect(getApiKey("gemini")).toBe("");
    expect(getApiKey("groq")).toBe("");
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it("a chave não entra nas configurações", () => {
    setApiKey("gemini", "segredo", true);
    saveSettings({ model: "m" });
    expect(localStorage.getItem("sb.settings")).not.toContain("segredo");
  });
});

describe("getProviderConfig", () => {
  it("null sem modelo", () => {
    setApiKey("gemini", "k", true);
    expect(getProviderConfig()).toBeNull();
  });

  it("null sem chave", () => {
    saveSettings({ provider: "gemini", model: "m" });
    expect(getProviderConfig()).toBeNull();
  });

  it("monta a configuração com modelo e chave", () => {
    saveSettings({ provider: "gemini", model: "m", baseUrl: "http://ignorado" });
    setApiKey("gemini", "k", false);
    expect(getProviderConfig()).toEqual({ provider: "gemini", apiKey: "k", model: "m" });
  });

  it("custom exige baseUrl, mas aceita chave vazia", () => {
    saveSettings({ provider: "custom", model: "m", baseUrl: "" });
    expect(getProviderConfig()).toBeNull();
    saveSettings({ baseUrl: "http://localhost:11434/v1" });
    expect(getProviderConfig()).toEqual({
      provider: "custom",
      apiKey: "",
      model: "m",
      baseUrl: "http://localhost:11434/v1",
    });
  });
});

describe("armazenamento indisponível", () => {
  it("getSettings tolera erro de leitura e saveSettings cai para memória", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("bloqueado", "SecurityError");
      },
    });
    try {
      expect(getSettings()).toEqual(DEFAULT_SETTINGS);
      expect(saveSettings({ theme: "dark" }).theme).toBe("dark");
      expect(getSettings().theme).toBe("dark");
      setApiKey("gemini", "k", true);
      expect(getApiKey("gemini")).toBe("k");
    } finally {
      if (original) Object.defineProperty(globalThis, "localStorage", original);
    }
    clearApiKeys();
    saveSettings({ theme: "system" });
    expect(getSettings().theme).toBe("system");
  });
});
