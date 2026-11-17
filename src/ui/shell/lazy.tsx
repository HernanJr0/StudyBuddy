import type { ComponentType } from "preact";
import { useEffect, useState } from "preact/hooks";
import { tCommon } from "../../core";

/**
 * Carrega uma página sob demanda (import dinâmico), para manter a primeira
 * carga leve. Enquanto carrega, mostra um status acessível.
 */
export function lazyPage<P extends object>(
  load: () => Promise<ComponentType<P>>,
): ComponentType<P> {
  let cached: ComponentType<P> | null = null;
  return function LazyPage(props: P) {
    const [Comp, setComp] = useState<ComponentType<P> | null>(() => cached);
    useEffect(() => {
      if (cached) return;
      let alive = true;
      load().then((c) => {
        cached = c;
        if (alive) setComp(() => c);
      });
      return () => {
        alive = false;
      };
    }, []);
    if (!Comp) return <p role="status">{tCommon("loading")}</p>;
    return <Comp {...props} />;
  };
}
