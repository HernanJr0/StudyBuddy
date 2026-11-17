import { useEffect, useState } from "preact/hooks";
import type { PackTab } from "../../core";

export type Route =
  | { name: "home" }
  | { name: "settings" }
  | { name: "history" }
  | { name: "pack"; id: string; tab?: PackTab }
  | { name: "open"; payload: string }
  | { name: "example" }
  | { name: "kit" }
  | { name: "aiGuide" }
  | { name: "privacy" }
  | { name: "about" }
  | { name: "review" }
  | { name: "notFound" };

const TABS: readonly string[] = ["resumo", "flashcards", "quiz"];

function safeDecode(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}

export function parseRoute(hash: string): Route {
  if (hash === "" || hash === "#" || hash === "#/") return { name: "home" };
  if (hash.startsWith("#/abrir/")) {
    const payload = hash.slice("#/abrir/".length);
    return payload ? { name: "open", payload } : { name: "notFound" };
  }
  const path = hash.replace(/\/+$/, "");
  switch (path) {
    case "#/configuracoes":
      return { name: "settings" };
    case "#/historico":
      return { name: "history" };
    case "#/exemplo":
      return { name: "example" };
    case "#/kit":
      return { name: "kit" };
    case "#/uso-responsavel":
      return { name: "aiGuide" };
    case "#/privacidade":
      return { name: "privacy" };
    case "#/sobre":
      return { name: "about" };
    case "#/revisar":
      return { name: "review" };
  }
  const pack = path.match(/^#\/pacote\/([^/]+)(?:\/([^/]+))?$/);
  if (pack?.[1]) {
    const id = safeDecode(pack[1]);
    const tab = pack[2];
    if (id === null || (tab !== undefined && !TABS.includes(tab))) return { name: "notFound" };
    return tab ? { name: "pack", id, tab: tab as PackTab } : { name: "pack", id };
  }
  return { name: "notFound" };
}

/** Identifica "a mesma página": trocar de aba dentro do pacote não conta como trocar de rota. */
export function routeKey(route: Route): string {
  switch (route.name) {
    case "pack":
      return `pack:${route.id}`;
    case "open":
      return `open:${route.payload}`;
    default:
      return route.name;
  }
}

export function useRoute(): Route {
  const [hash, setHash] = useState(() => location.hash);
  useEffect(() => {
    const onChange = () => setHash(location.hash);
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return parseRoute(hash);
}

export function navigate(hash: string): void {
  location.hash = hash;
}
