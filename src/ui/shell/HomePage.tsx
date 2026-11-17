import { ROUTES } from "../../core";
import { store } from "../../store";
import { ButtonLink, Notice } from "../kit";
import { GenerateFlow } from "./GenerateFlow";
import { ImportPack } from "./ImportPack";
import { t } from "./messages";

export function HomePage() {
  const configured = store.getProviderConfig() !== null;

  return (
    <div class="flex flex-col gap-8">
      <section class="flex flex-col gap-3">
        <h1 class="text-2xl font-bold">{t("homeTitle")}</h1>
        <p>{t("homeIntro")}</p>
      </section>

      {configured ? (
        <GenerateFlow />
      ) : (
        <Notice tone="warn" title={t("homeNoProviderTitle")}>
          <p>{t("homeNoProviderText")}</p>
          <div class="mt-3">
            <ButtonLink href={ROUTES.settings} variant="primary" icon="settings">
              {t("homeGoSettings")}
            </ButtonLink>
          </div>
        </Notice>
      )}

      <section class="flex flex-col gap-4" aria-labelledby="home-outros">
        <div class="flex flex-col gap-1">
          <h2 id="home-outros" class="text-xl font-bold">
            {t("homeOthersTitle")}
          </h2>
          <p class="text-muted">{t("homeOthersText")}</p>
        </div>
        <div>
          <ButtonLink href={ROUTES.example}>{t("homeExample")}</ButtonLink>
        </div>
        <ImportPack />
      </section>
    </div>
  );
}
