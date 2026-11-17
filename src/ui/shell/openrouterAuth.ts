/**
 * Conexão com o OpenRouter pelo fluxo OAuth PKCE (https://openrouter.ai/docs/use-cases/oauth-pkce).
 * Tudo no navegador: o verifier fica na sessão da aba e a chave nunca passa pela URL nem por log.
 */
import { ROUTES } from "../../core";
import { store } from "../../store";
import { navigate } from "./router";

const VERIFIER_KEY = "sb.openrouter.verifier";
const AUTH_URL = "https://openrouter.ai/auth";
const EXCHANGE_URL = "https://openrouter.ai/api/v1/auth/keys";

export type OAuthResult = { kind: "ok" } | { kind: "error" };
type Listener = () => void;

let pending: OAuthResult | null = null;
let working = false;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l();
}

/** Há uma troca de código em andamento? */
export function oauthWorking(): boolean {
  return working;
}

/** Entrega (uma única vez) o resultado da última conexão, se houver. */
export function takeOAuthResult(): OAuthResult | null {
  const r = pending;
  pending = null;
  return r;
}

export function subscribeOAuth(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function base64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

/** Endereço de retorno: origem e caminho atuais, sem query nem hash. */
export function callbackUrl(): string {
  return location.origin + location.pathname;
}

/** Guarda o verifier e leva o usuário ao login do OpenRouter. */
export async function startOpenRouterConnect(): Promise<void> {
  const bytes = new Uint8Array(48);
  crypto.getRandomValues(bytes);
  const verifier = base64url(bytes);
  const challenge = await createChallenge(verifier);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  const url = new URL(AUTH_URL);
  url.searchParams.set("callback_url", callbackUrl());
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  location.assign(url.toString());
}

function cleanUrl() {
  history.replaceState(history.state, "", location.pathname + location.hash);
}

let handled = false;

/** Chamada uma vez ao montar o App: conclui a conexão se o OpenRouter acabou de voltar. */
export async function handleOAuthReturn(): Promise<void> {
  if (handled) return;
  handled = true;
  const code = new URLSearchParams(location.search).get("code");
  if (code === null) return;
  cleanUrl();
  let verifier: string | null = null;
  try {
    verifier = sessionStorage.getItem(VERIFIER_KEY);
    sessionStorage.removeItem(VERIFIER_KEY);
  } catch {
    verifier = null;
  }
  if (!code || !verifier) return;

  working = true;
  navigate(ROUTES.settings);
  emit();
  try {
    const res = await fetch(EXCHANGE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, code_verifier: verifier, code_challenge_method: "S256" }),
    });
    if (!res.ok) throw new Error("exchange");
    const data = (await res.json()) as { key?: unknown };
    if (typeof data.key !== "string" || !data.key) throw new Error("exchange");
    store.setApiKey("openrouter", data.key, true);
    store.saveSettings({ provider: "openrouter", rememberKey: true });
    pending = { kind: "ok" };
  } catch {
    pending = { kind: "error" };
  } finally {
    working = false;
    emit();
  }
}
