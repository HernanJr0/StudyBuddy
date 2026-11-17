import { useEffect, useRef, useState } from "preact/hooks";
import { type PackSummary, ROUTES } from "../../core";
import { store } from "../../store";
import { announce, Button, ButtonLink, Dialog, Notice } from "../kit";
import { ImportPack } from "./ImportPack";
import { t } from "./messages";

function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
}

function Details({ pack }: { pack: PackSummary }) {
  const parts = [
    t("histSaved", { date: formatDate(pack.savedAt) }),
    pack.origin === "generated" ? t("histOriginGenerated") : t("histOriginImported"),
    pack.flashcardCount === 1 ? t("histCards1") : t("histCards", { n: pack.flashcardCount }),
    pack.questionCount === 1 ? t("histQuestions1") : t("histQuestions", { n: pack.questionCount }),
  ];
  if (pack.lastScore) {
    parts.push(
      t("histLastScore", { correct: pack.lastScore.correct, total: pack.lastScore.total }),
    );
  }
  return <p class="text-sm text-muted">{parts.join(" · ")}</p>;
}

export function HistoryPage() {
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [toDelete, setToDelete] = useState<PackSummary | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  async function load() {
    try {
      setPacks(await store.listPacks());
      setFailed(false);
    } catch {
      setFailed(true);
      setPacks([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function confirmDelete() {
    const target = toDelete;
    setToDelete(null);
    if (!target) return;
    try {
      await store.deletePack(target.id);
      await load();
      announce(t("histDeleted"));
    } catch {
      setFailed(true);
    }
    // O botão que abriu o diálogo saiu da tela: o foco vai para o título.
    setTimeout(() => headingRef.current?.focus(), 60);
  }

  return (
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <h1 ref={headingRef} tabIndex={-1} class="text-2xl font-bold outline-none">
          {t("histTitle")}
        </h1>
        <p class="text-muted">{t("histIntro")}</p>
      </div>

      {failed && (
        <Notice tone="bad" live>
          {t("histLoadError")}
        </Notice>
      )}

      {packs === null && <p role="status">{t("histLoading")}</p>}

      {packs?.length === 0 && !failed && (
        <section class="flex flex-col gap-3 rounded-lg border-2 border-line p-4">
          <h2 class="text-xl font-bold">{t("histEmptyTitle")}</h2>
          <p>{t("histEmptyText")}</p>
          <div>
            <ButtonLink href={ROUTES.home} variant="primary">
              {t("histGoHome")}
            </ButtonLink>
          </div>
        </section>
      )}

      {packs && packs.length > 0 && (
        <ul class="flex flex-col gap-3">
          {packs.map((pack) => (
            <li
              key={pack.id}
              class="flex flex-col gap-2 rounded-lg border-2 border-line p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div class="flex min-w-0 flex-col gap-1">
                <h2 class="text-lg font-bold break-words">
                  <a href={ROUTES.pack(pack.id)} class="inline-flex min-h-11 items-center">
                    {pack.title}
                  </a>
                </h2>
                <Details pack={pack} />
              </div>
              <div>
                <Button variant="danger" icon="trash" onClick={() => setToDelete(pack)}>
                  {t("histDelete")}
                  <span class="sr-only"> {pack.title}</span>
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ImportPack />

      <Dialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={t("histDeleteTitle")}
        actions={
          <>
            <Button onClick={() => setToDelete(null)}>{t("genCancel")}</Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t("histDelete")}
            </Button>
          </>
        }
      >
        {toDelete && <p>{t("histDeleteText", { title: toDelete.title })}</p>}
      </Dialog>
    </div>
  );
}
