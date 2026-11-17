/**
 * Casca da aplicação — VERSÃO PROVISÓRIA (Etapa 0).
 * A frente E substitui este arquivo pelo layout e pelas rotas definitivas
 * (ROUTES em core/contracts.ts), mantendo a exportação `App` e a rota #/kit.
 */
import { useEffect, useState } from "preact/hooks";
import { plural, tCommon } from "../../core";
import { examplePack } from "../../core/fixtures";
import { ButtonLink, Notice } from "../kit";
import { Showcase } from "../kit/Showcase";

function useHash(): string {
  const [hash, setHash] = useState(() => location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(location.hash || "#/");
    addEventListener("hashchange", onChange);
    return () => removeEventListener("hashchange", onChange);
  }, []);
  return hash;
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
        <a href="#/" class="text-xl font-bold text-fg no-underline">
          {tCommon("appName")}
        </a>
      </header>
      <main id="conteudo" tabIndex={-1} class="flex-1 pb-12">
        {hash === "#/kit" ? (
          <Showcase />
        ) : (
          <div class="flex flex-col gap-4">
            <h1 class="text-2xl font-bold">Em construção</h1>
            <p>
              A base do projeto está pronta. Pacote de exemplo: <strong>{examplePack.title}</strong>
              , com {plural(examplePack.flashcards.length, "flashcard", "flashcards")} e{" "}
              {plural(examplePack.questions.length, "questão", "questões")}.
            </p>
            <Notice tone="info">{tCommon("aiNotice")}</Notice>
            <ButtonLink href="#/kit" variant="primary">
              Ver componentes base
            </ButtonLink>
          </div>
        )}
      </main>
    </div>
  );
}
