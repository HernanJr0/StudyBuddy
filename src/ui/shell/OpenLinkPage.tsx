import { useEffect, useState } from "preact/hooks";
import { errorMessage, ROUTES, toAppError } from "../../core";
import { examplePack } from "../../core/fixtures";
import { store } from "../../store";
import { ButtonLink, Notice } from "../kit";
import { t } from "./messages";

function Failure({ message }: { message: string }) {
  return (
    <div class="flex flex-col gap-4">
      <h1 class="text-2xl font-bold">{t("openErrorTitle")}</h1>
      <Notice tone="bad" live>
        {message}
      </Notice>
      <div>
        <ButtonLink href={ROUTES.home} variant="primary">
          {t("goHome")}
        </ButtonLink>
      </div>
    </div>
  );
}

/** #/abrir/<conteúdo>: lê o pacote do próprio endereço, salva e abre. */
export function OpenLinkPage({ payload }: { payload: string }) {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setError(null);
    (async () => {
      try {
        const pack = await store.packFromLinkPayload(payload);
        await store.savePack(pack, "imported");
        if (active) location.replace(ROUTES.pack(pack.id));
      } catch (e) {
        if (active) setError(errorMessage(toAppError(e, "share/invalid")));
      }
    })();
    return () => {
      active = false;
    };
  }, [payload]);

  if (error) return <Failure message={error} />;
  return (
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold">{t("titleOpen")}</h1>
      <p role="status">{t("openLoading")}</p>
    </div>
  );
}

/** #/exemplo: salva o pacote de exemplo e abre, para experimentar sem chave. */
export function ExamplePage() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    store
      .savePack(examplePack, "imported")
      .then(() => {
        if (active) location.replace(ROUTES.pack(examplePack.id));
      })
      .catch((e: unknown) => {
        if (active) setError(errorMessage(toAppError(e, "store/unavailable")));
      });
    return () => {
      active = false;
    };
  }, []);

  if (error) return <Failure message={error} />;
  return (
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-bold">{t("titleExample")}</h1>
      <p role="status">{t("exampleLoading")}</p>
    </div>
  );
}
