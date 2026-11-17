import { useCallback, useEffect, useState } from "preact/hooks";
import {
  errorMessage,
  isAppError,
  type PackTab,
  ROUTES,
  type StudyPack,
  tCommon,
} from "../../core";
import { store } from "../../store";
import { ButtonLink, Notice, Tabs } from "../kit";
import { FlashcardsView } from "./FlashcardsView";
import { t } from "./messages";
import { QuizView } from "./QuizView";
import { ShareMenu } from "./ShareMenu";
import { SummaryView } from "./SummaryView";
import { formatDate } from "./util";
import "./study.css";

export interface PackScreenProps {
  packId: string;
  tab?: PackTab | undefined;
}

type Load = { state: "loading" } | { state: "missing" } | { state: "error" } | { state: "ready" };

export function PackScreen({ packId, tab }: PackScreenProps) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [pack, setPack] = useState<StudyPack | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoad({ state: "loading" });
    setPack(null);
    store
      .getPack(packId)
      .then((found) => {
        if (cancelled) return;
        if (found) {
          setPack(found);
          setLoad({ state: "ready" });
        } else {
          setLoad({ state: "missing" });
        }
      })
      .catch(() => {
        if (!cancelled) setLoad({ state: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [packId]);

  /** Grava uma alteração de curadoria; só atualiza a tela se o salvamento der certo. */
  const commit = useCallback(async (next: StudyPack): Promise<boolean> => {
    try {
      await store.updatePack(next);
      setPack(next);
      setSaveError(null);
      return true;
    } catch (e) {
      setSaveError(isAppError(e) ? errorMessage(e) : t("saveError"));
      return false;
    }
  }, []);

  if (load.state === "loading") {
    return (
      <p role="status" class="py-8">
        {tCommon("loading")}
      </p>
    );
  }

  if (load.state === "missing" || load.state === "error" || !pack) {
    return (
      <div class="flex flex-col gap-4 py-4">
        <h1 class="text-2xl font-bold">{t("notFoundTitle")}</h1>
        <Notice tone={load.state === "error" ? "bad" : "warn"}>
          {load.state === "error" ? t("loadError") : t("notFoundText")}
        </Notice>
        <div>
          <ButtonLink href={ROUTES.home} variant="primary">
            {t("notFoundLink")}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const selected: PackTab = tab ?? "resumo";
  const sourceKey = pack.source.provider === "exemplo" ? "sourceImported" : "source";

  return (
    <div class="flex flex-col gap-4 py-4">
      <header class="flex flex-col gap-2">
        <h1 class="text-2xl font-bold">{pack.title}</h1>
        <p class="text-muted">
          {t(sourceKey, { model: pack.source.model, date: formatDate(pack.createdAt) })}
        </p>
        <Notice tone="info">{tCommon("aiNotice")}</Notice>
      </header>

      <ShareMenu pack={pack} />

      {saveError && (
        <Notice tone="bad" live>
          {saveError}
        </Notice>
      )}

      <Tabs
        label={t("tabsLabel")}
        selected={selected}
        onSelect={(id) => {
          location.hash = ROUTES.pack(pack.id, id);
        }}
        tabs={[
          { id: "resumo", label: t("tabSummary"), content: <SummaryView pack={pack} /> },
          {
            id: "flashcards",
            label: t("tabFlashcards"),
            content: <FlashcardsView pack={pack} commit={commit} />,
          },
          { id: "quiz", label: t("tabQuiz"), content: <QuizView pack={pack} commit={commit} /> },
        ]}
      />
    </div>
  );
}
