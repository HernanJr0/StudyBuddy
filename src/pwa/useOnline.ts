import { useEffect, useState } from "preact/hooks";

function read(): boolean {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

/** Estado simples de conexão: `false` quando o navegador diz que está sem internet. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(read);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setOnline(read());
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}
