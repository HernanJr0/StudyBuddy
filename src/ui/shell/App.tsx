/**
 * Casca da aplicação — VERSÃO PROVISÓRIA (Etapa 0).
 * A frente E substitui este arquivo pelo layout e pelas rotas definitivas
 * (ROUTES em core/contracts.ts), mantendo a exportação `App` e as rotas
 * #/kit, #/exemplo e #/pacote/:id/:aba.
 */
import { useEffect, useState } from "preact/hooks";
import { type PackTab, ROUTES, tCommon } from "../../core";
import { examplePack } from "../../core/fixtures";
import { store } from "../../store";
import { ButtonLink, Notice } from "../kit";
import { Showcase } from "../kit/Showcase";
import { PackScreen } from "../study";

function useHash(): string {
  const [hash, setHash] = useState(() => location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(location.hash || "#/");
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return hash;
}

function OpenExample() {
  useEffect(() => {
    store.savePack(examplePack, "imported").then(() => {
      location.replace(ROUTES.pack(examplePack.id));
    });
  }, []);
  return <p role="status">{tCommon("loading")}</p>;
}

function Page({ hash }: { hash: string }) {
  if (hash === ROUTES.kit) return <Showcase />;
  if (hash === ROUTES.example) return <OpenExample />;
  const pack = hash.match(/^#\/pacote\/([^/]+)(?:\/(resumo|flashcards|quiz))?$/);
  if (pack?.[1]) {
    return <PackScreen packId={decodeURIComponent(pack[1])} tab={pack[2] as PackTab | undefined} />;
  }
  return (
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">Em construção</h1>
      <Notice tone="info">{tCommon("aiNotice")}</Notice>
      <ButtonLink href={ROUTES.example} variant="primary">
        Ver um pacote de exemplo
      </ButtonLink>
      <ButtonLink href={ROUTES.kit}>Ver componentes base</ButtonLink>
    </div>
  );
}

export function App() {
  const hash = useHash();

  return (
    <div class="mx-auto flex min-h-dvh max-w-2xl flex-col px-4">
      <a
        href="#conteudo"
        class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:rounded-lg focus:bg-bg focus:p-3"
      >
        Pular para o conteúdo
      </a>
      <header class="flex items-center justify-between py-4">
        <a href={ROUTES.home} class="text-xl font-bold text-fg no-underline">
          {tCommon("appName")}
        </a>
      </header>
      <main id="conteudo" tabIndex={-1} class="flex-1 pb-12">
        <Page hash={hash} />
      </main>
    </div>
  );
}
