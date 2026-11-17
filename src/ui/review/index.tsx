import { useEffect, useRef, useState } from "preact/hooks";
import { ROUTES, tCommon } from "../../core";
import { announce, Button, ButtonLink, Notice } from "../kit";
import { t } from "./messages";
import { type DueItem, loadQueue } from "./queue";
import { recordGrade } from "./record";
import { GRADES, type GradeKey, previewIntervals } from "./scheduler";


export { useDueCount } from "./useDueCount";

function formatWhen(date: Date): string {
  return date.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
}

export function ReviewPage() {
  const [items, setItems] = useState<DueItem[] | null>(null);
  const [nextDue, setNextDue] = useState<Date | null>(null);
  const [failed, setFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [now, setNow] = useState(() => new Date());
  const [focusTick, setFocusTick] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  async function load() {
    setFailed(false);
    try {
      const at = new Date();
      const q = await loadQueue(at);
      setNow(at);
      setItems(q.due);
      setNextDue(q.nextDue);
      setIndex(0);
      setRevealed(false);
    } catch {
      setFailed(true);
      setItems([]);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const finished = items !== null && index >= items.length;
  const current = items?.[index];

  // Foco gerenciado: no cartão a cada avanço; no fim, no título do resultado.
  useEffect(() => {
    if (focusTick === 0) return;
    (finished ? doneRef.current : cardRef.current)?.focus();
  }, [focusTick]);

  function reveal() {
    if (!current) return;
    setRevealed(true);
    announce(t("answerAnnounce", { text: current.card.back }));
    requestAnimationFrame(() => backRef.current?.focus());
  }

  async function grade(key: GradeKey) {
    if (!current || !items) return;
    setSaveFailed(false);
    const at = new Date();
    try {
      await recordGrade(current.packId, current.card.id, key, at);
    } catch {
      setSaveFailed(true);
      return;
    }
    setReviewed((n) => n + 1);
    if (index + 1 >= items.length) {
      // Os cartões avaliados já têm nova data: confere qual é a próxima.
      try {
        setNextDue((await loadQueue(new Date())).nextDue);
      } catch {
        /* a tela final funciona sem a data */
      }
    }
    setNow(at);
    setIndex(index + 1);
    setRevealed(false);
    setFocusTick((n) => n + 1);
  }

  const intervals = current ? previewIntervals(current.state, now) : null;

  return (
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-2">
        <h1 class="text-2xl font-bold">{t("title")}</h1>
        <p class="text-muted">{t("intro")}</p>
      </div>

      {failed && (
        <Notice tone="bad" live>
          <p>{t("loadError")}</p>
          <Button class="mt-2" onClick={() => void load()}>
            {t("retry")}
          </Button>
        </Notice>
      )}

      {items === null && <p role="status">{t("loading")}</p>}

      {items !== null && !failed && finished && (
        <div class="flex flex-col gap-4">
          <h2 ref={doneRef} tabIndex={-1} class="text-xl font-bold outline-none">
            {t("doneTitle")}
          </h2>
          {reviewed > 0 ? (
            <p>
              {t("doneCount", {
                n: reviewed === 1 ? t("cardRevised1") : t("cardRevisedN", { n: reviewed }),
              })}
            </p>
          ) : (
            <p class="text-muted">{t("emptyHint")}</p>
          )}
          <p>{nextDue ? t("next", { date: formatWhen(nextDue) }) : t("noNext")}</p>
          <div>
            <ButtonLink variant="primary" icon="back" href={ROUTES.home}>
              {t("home")}
            </ButtonLink>
          </div>
        </div>
      )}

      {current && intervals && !failed && (
        <div class="flex flex-col gap-4">
          <h2 class="text-lg font-bold">
            {t("counter", { n: index + 1, total: items?.length ?? 0 })}
          </h2>
          <p class="text-sm text-muted">
            {t("fromPack")}:{" "}
            <a href={ROUTES.pack(current.packId, "flashcards")} class="font-semibold">
              {current.packTitle}
            </a>
          </p>

          <div
            ref={cardRef}
            tabIndex={-1}
            class="flex flex-col gap-4 rounded-xl border-2 border-line bg-surface p-5"
          >
            <div>
              <p class="text-sm font-semibold text-muted">{t("front")}</p>
              <p class="text-xl font-semibold">{current.card.front}</p>
            </div>
            {revealed && (
              <div
                ref={backRef}
                tabIndex={-1}
                class="sb-reveal flex flex-col gap-2 border-t-2 border-line pt-4"
              >
                <p class="text-sm font-semibold text-muted">{t("back")}</p>
                <p class="text-lg">{current.card.back}</p>
                {!current.card.verified && <Notice tone="warn">{tCommon("unverified")}</Notice>}
              </div>
            )}
          </div>

          {revealed ? (
            <fieldset class="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
              <legend class="mb-2 p-0 text-sm font-semibold text-muted">{t("gradeGroup")}</legend>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {GRADES.map((g) => (
                  <Button
                    key={g.key}
                    variant={
                      g.key === "good" ? "primary" : g.key === "again" ? "danger" : "secondary"
                    }
                    icon={g.key === "again" ? "x" : g.key === "easy" ? "check" : undefined}
                    class="flex-col gap-0"
                    onClick={() => void grade(g.key)}
                  >
                    <span>{g.label}</span>
                    <span class="text-sm font-normal">{intervals[g.key]}</span>
                  </Button>
                ))}
              </div>
            </fieldset>
          ) : (
            <div>
              <Button variant="primary" onClick={reveal}>
                {t("showAnswer")}
              </Button>
            </div>
          )}
          {saveFailed && (
            <Notice tone="warn" live>
              {t("saveError")}
            </Notice>
          )}
        </div>
      )}
    </div>
  );
}
