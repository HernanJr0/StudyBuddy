import { useEffect, useState } from "preact/hooks";
import { loadQueue } from "./queue";

const CHANGED = "studybuddy:packs-changed";

/** Quantidade de flashcards com revisão vencida (para a barra lateral). */
export function useDueCount(): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let alive = true;
    const refresh = () => {
      loadQueue(new Date())
        .then((q) => {
          if (alive) setCount(q.due.length);
        })
        .catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    refresh();
    window.addEventListener(CHANGED, refresh);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", onVisible);
    const timer = setInterval(refresh, 60_000);
    return () => {
      alive = false;
      window.removeEventListener(CHANGED, refresh);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(timer);
    };
  }, []);
  return count;
}
