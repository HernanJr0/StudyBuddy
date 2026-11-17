/**
 * PWA: registra o service worker (só em produção) e avisa quando há versão nova.
 *
 * Interface:
 * - ouvir `window` "studybuddy:update-ready" e mostrar um aviso com botão que chama `applyUpdate()`;
 * - usar `useOnline()` para avisar que, sem internet, só dá para estudar os pacotes salvos.
 */
export { useOnline } from "./useOnline";

export const UPDATE_READY_EVENT = "studybuddy:update-ready";

let registration: ServiceWorkerRegistration | undefined;
let updateReady = false;

function markReady(): void {
  updateReady = true;
  window.dispatchEvent(new CustomEvent(UPDATE_READY_EVENT));
}

/** Há uma versão nova baixada, esperando para ser ativada? */
export function isUpdateReady(): boolean {
  return updateReady;
}

/** Ativa a versão nova e recarrega a página. */
export function applyUpdate(): void {
  const waiting = registration?.waiting;
  if (!waiting) {
    window.location.reload();
    return;
  }
  navigator.serviceWorker.addEventListener("controllerchange", () => window.location.reload(), {
    once: true,
  });
  waiting.postMessage("SKIP_WAITING");
}

export function registerPwa(): void {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return;
  const start = () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        registration = reg;
        // Só é "atualização" se já havia um service worker controlando a página.
        if (reg.waiting && navigator.serviceWorker.controller) markReady();
        reg.addEventListener("updatefound", () => {
          const worker = reg.installing;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "installed" && navigator.serviceWorker.controller) markReady();
          });
        });
        document.addEventListener("visibilitychange", () => {
          if (document.visibilityState === "visible") reg.update().catch(() => {});
        });
      })
      .catch(() => {});
  };
  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });
}
