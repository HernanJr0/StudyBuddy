import { useEffect, useRef, useState } from "preact/hooks";
import { type Flashcard, type StudyPack, tCommon } from "../../core";
import { store } from "../../store";
import { announce, Button, Notice } from "../kit";
import { recordGrade } from "../review/record";
import { gradeForMark } from "../review/scheduler";
import { CardEditDialog, ConfirmRemoveDialog } from "./CurateDialog";
import { t } from "./messages";

interface Props {
  pack: StudyPack;
  commit: (next: StudyPack) => Promise<boolean>;
}

type Mode = "all" | "last" | "wrong";

export function FlashcardsView({ pack, commit }: Props) {
  const allIds = pack.flashcards.map((c) => c.id);
  const [deck, setDeck] = useState<string[]>(allIds);
  const [mode, setMode] = useState<Mode>("all");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<Record<string, boolean>>({});
  const [finished, setFinished] = useState(false);
  const [lastWrong, setLastWrong] = useState<string[]>([]);
  const [markFailed, setMarkFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  const cardRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  async function loadMarks() {
    try {
      const marks = await store.listCardMarks(pack.id);
      const latest = new Map<string, { known: boolean; at: string }>();
      for (const m of marks) {
        const prev = latest.get(m.cardId);
        if (!prev || m.at >= prev.at) latest.set(m.cardId, { known: m.known, at: m.at });
      }
      const ids = pack.flashcards.map((c) => c.id);
      setLastWrong(ids.filter((id) => latest.get(id)?.known === false));
    } catch {
      setLastWrong([]);
    }
  }

  useEffect(() => {
    void loadMarks();
  }, []);

  // Foco gerenciado: depois de avançar, no cartão; no fim, no título do resultado.
  useEffect(() => {
    if (focusTick === 0) return;
    (finished ? doneRef.current : cardRef.current)?.focus();
  }, [focusTick]);

  function start(ids: string[], nextMode: Mode) {
    setDeck(ids);
    setMode(nextMode);
    setIndex(0);
    setRevealed(false);
    setResults({});
    setFinished(false);
    setMarkFailed(false);
    setFocusTick((n) => n + 1);
  }

  function go(to: number) {
    if (to < 0) return;
    if (to >= deck.length) {
      setFinished(true);
      setFocusTick((n) => n + 1);
      void loadMarks();
      return;
    }
    setIndex(to);
    setRevealed(false);
    setFocusTick((n) => n + 1);
  }

  const byId = new Map(pack.flashcards.map((c) => [c.id, c]));
  const current: Flashcard | undefined = byId.get(deck[index] ?? "");

  function reveal() {
    if (!current) return;
    setRevealed(true);
    announce(t("answerAnnounce", { text: current.back }));
    requestAnimationFrame(() => backRef.current?.focus());
  }

  async function mark(known: boolean) {
    if (!current) return;
    setResults((r) => ({ ...r, [current.id]: known }));
    try {
      await store.saveCardMark({
        packId: pack.id,
        cardId: current.id,
        known,
        at: new Date().toISOString(),
      });
      // Também agenda a próxima revisão (Errei = Again, Acertei = Good).
      await recordGrade(pack.id, current.id, gradeForMark(known));
    } catch {
      setMarkFailed(true);
    }
    go(index + 1);
  }

  async function saveCard(card: Flashcard) {
    const ok = await commit({
      ...pack,
      flashcards: pack.flashcards.map((c) => (c.id === card.id ? card : c)),
    });
    if (!ok) return;
    setEditing(false);
    announce(t("cardSaved"));
    setFocusTick((n) => n + 1);
  }

  async function removeCard() {
    if (!current) return;
    const remaining = pack.flashcards.filter((c) => c.id !== current.id);
    const ok = await commit({ ...pack, flashcards: remaining });
    setRemoving(false);
    if (!ok) return;
    announce(t("cardRemoved"));
    const rest = deck.filter((id) => id !== current.id);
    if (rest.length === 0) {
      start(
        remaining.map((c) => c.id),
        "all",
      );
      return;
    }
    setDeck(rest);
    setIndex(Math.min(index, rest.length - 1));
    setRevealed(false);
    setFinished(false);
    setFocusTick((n) => n + 1);
  }

  if (pack.flashcards.length === 0) {
    return (
      <Notice tone="info" title={t("cardsEmptyTitle")}>
        {t("cardsEmpty")}
      </Notice>
    );
  }

  if (finished) {
    const correct = deck.filter((id) => results[id]).length;
    const wrong = deck.filter((id) => !results[id] && byId.has(id));
    return (
      <div class="flex flex-col gap-4">
        <h2 ref={doneRef} tabIndex={-1} class="text-xl font-bold">
          {t("cardsDoneTitle")}
        </h2>
        <p class="text-lg font-semibold">{t("cardsScore", { correct, total: deck.length })}</p>
        <div class="flex flex-wrap gap-2">
          {wrong.length > 0 && (
            <Button variant="primary" onClick={() => start(wrong, "wrong")}>
              {t("reviewWrong")}
            </Button>
          )}
          <Button
            variant={wrong.length > 0 ? "secondary" : "primary"}
            onClick={() => start(allIds, "all")}
          >
            {t("restart")}
          </Button>
        </div>
      </div>
    );
  }

  if (!current) return null;

  return (
    <div class="flex flex-col gap-4">
      {mode === "all" && lastWrong.length > 0 && (
        <div>
          <Button onClick={() => start(lastWrong, "last")}>
            {t("reviewLast", { n: lastWrong.length })}
          </Button>
        </div>
      )}
      <h2 class="text-lg font-bold">{t("cardCounter", { n: index + 1, total: deck.length })}</h2>
      <p class="text-sm text-muted">{t("practiceHint")}</p>

      <div
        ref={cardRef}
        tabIndex={-1}
        class="flex flex-col gap-4 rounded-xl border-2 border-line bg-surface p-5"
      >
        <div>
          <p class="text-sm font-semibold text-muted">{t("cardFront")}</p>
          <p class="text-xl font-semibold">{current.front}</p>
        </div>
        {revealed && (
          <div
            ref={backRef}
            tabIndex={-1}
            class="sb-reveal flex flex-col gap-2 border-t-2 border-line pt-4"
          >
            <p class="text-sm font-semibold text-muted">{t("cardBack")}</p>
            <p class="text-lg">{current.back}</p>
            <p class="text-sm text-muted">{t("sourcePage", { n: current.page })}</p>
            {!current.verified && <Notice tone="warn">{tCommon("unverified")}</Notice>}
          </div>
        )}
      </div>

      {revealed ? (
        <div class="flex flex-wrap gap-2">
          <Button variant="danger" icon="x" onClick={() => void mark(false)}>
            {t("missed")}
          </Button>
          <Button variant="primary" icon="check" onClick={() => void mark(true)}>
            {t("got")}
          </Button>
        </div>
      ) : (
        <div>
          <Button variant="primary" onClick={reveal}>
            {t("showAnswer")}
          </Button>
        </div>
      )}
      {markFailed && (
        <Notice tone="warn" live>
          {t("markError")}
        </Notice>
      )}

      <div class="flex flex-wrap gap-2">
        <Button
          icon="back"
          aria-disabled={index === 0 ? true : undefined}
          onClick={() => index > 0 && go(index - 1)}
        >
          {t("previous")}
        </Button>
        <Button icon="forward" onClick={() => go(index + 1)}>
          {index === deck.length - 1 ? t("seeResult") : t("next")}
        </Button>
      </div>

      <div class="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button icon="edit" onClick={() => setEditing(true)}>
          {t("editCard")}
        </Button>
        <Button variant="danger" icon="trash" onClick={() => setRemoving(true)}>
          {t("removeCard")}
        </Button>
      </div>

      <CardEditDialog
        open={editing}
        card={current}
        onClose={() => setEditing(false)}
        onSave={(c) => void saveCard(c)}
      />
      <ConfirmRemoveDialog
        open={removing}
        title={t("confirmRemoveCardTitle")}
        excerpt={current.front}
        onClose={() => setRemoving(false)}
        onConfirm={() => void removeCard()}
      />
    </div>
  );
}
