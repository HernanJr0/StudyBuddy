/** Junta classes, ignorando valores vazios. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

let liveRegion: HTMLElement | null = null;
let assertiveRegion: HTMLElement | null = null;

function region(assertive: boolean): HTMLElement {
  const existing = assertive ? assertiveRegion : liveRegion;
  if (existing?.isConnected) return existing;
  const el = document.createElement("div");
  el.setAttribute("aria-live", assertive ? "assertive" : "polite");
  el.setAttribute("aria-atomic", "true");
  el.className = "sr-only";
  document.body.append(el);
  if (assertive) assertiveRegion = el;
  else liveRegion = el;
  return el;
}

/**
 * Anuncia uma mudança de estado a leitores de tela (ex.: "Resposta correta",
 * "Pacote gerado"). Use `assertive` só para erros que interrompem a tarefa.
 */
export function announce(message: string, options?: { assertive?: boolean }): void {
  const el = region(options?.assertive ?? false);
  // Limpar antes garante que a mesma mensagem seja lida de novo.
  el.textContent = "";
  setTimeout(() => {
    el.textContent = message;
  }, 50);
}
