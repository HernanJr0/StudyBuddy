import { useEffect, useId, useRef, useState } from "preact/hooks";
import { type Attempt, type Question, type StudyPack, tCommon } from "../../core";
import { store } from "../../store";
import { announce, Button, Icon, Notice } from "../kit";
import { ConfirmRemoveDialog, QuestionEditDialog } from "./CurateDialog";
import { t } from "./messages";
import { type AttemptAnswer, formatDateTime, newAttemptId, percent, shuffle } from "./util";

interface Props {
  pack: StudyPack;
  commit: (next: StudyPack) => Promise<boolean>;
}

/** Uma questão da tentativa, com a ordem embaralhada das alternativas. */
interface Item {
  id: string;
  /** perm[posição exibida] = índice original da alternativa. */
  perm: number[];
}

interface Session {
  scope: Attempt["scope"];
  items: Item[];
}

function makeSession(questions: Question[], scope: Attempt["scope"]): Session {
  return {
    scope,
    items: shuffle(questions).map((q) => ({ id: q.id, perm: shuffle([0, 1, 2, 3]) })),
  };
}

export function QuizView({ pack, commit }: Props) {
  const [session, setSession] = useState<Session>(() => makeSession(pack.questions, "all"));
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [answers, setAnswers] = useState<AttemptAnswer[]>([]);
  const [finished, setFinished] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [saveFailed, setSaveFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [focusTick, setFocusTick] = useState(0);

  const stemRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);
  const hintId = useId();

  async function loadAttempts() {
    try {
      const list = await store.listAttempts(pack.id);
      setAttempts([...list].sort((a, b) => b.at.localeCompare(a.at)));
    } catch {
      setAttempts([]);
    }
  }

  useEffect(() => {
    void loadAttempts();
  }, []);

  // Foco gerenciado: no enunciado da questão nova ou no título do resultado.
  useEffect(() => {
    if (focusTick === 0) return;
    (finished ? doneRef.current : stemRef.current)?.focus();
  }, [focusTick]);

  const byId = new Map(pack.questions.map((q) => [q.id, q]));
  const item = session.items[index];
  const question = item ? byId.get(item.id) : undefined;

  function begin(questions: Question[], scope: Attempt["scope"]) {
    setSession(makeSession(questions, scope));
    setIndex(0);
    setSelected(null);
    setAnswered(false);
    setAnswers([]);
    setFinished(false);
    setSaveFailed(false);
    setFocusTick((n) => n + 1);
  }

  async function submit(e: Event) {
    e.preventDefault();
    if (!item || !question) return;
    if (selected === null) {
      announce(t("chooseFirst"));
      return;
    }
    if (answered) return;
    const chosenIndex = item.perm[selected] ?? 0;
    const correct = chosenIndex === question.correctIndex;
    const nextAnswers = [...answers, { questionId: question.id, chosenIndex, correct }];
    setAnswers(nextAnswers);
    setAnswered(true);
    announce(correct ? t("correct") : t("incorrect"));
    requestAnimationFrame(() => resultRef.current?.focus());

    if (index === session.items.length - 1) {
      const attempt: Attempt = {
        id: newAttemptId(),
        packId: pack.id,
        at: new Date().toISOString(),
        scope: session.scope,
        total: nextAnswers.length,
        correct: nextAnswers.filter((a) => a.correct).length,
        answers: nextAnswers,
      };
      try {
        await store.addAttempt(attempt);
        await loadAttempts();
      } catch {
        setSaveFailed(true);
      }
    }
  }

  function next() {
    if (index >= session.items.length - 1) {
      setFinished(true);
    } else {
      setIndex(index + 1);
      setSelected(null);
      setAnswered(false);
    }
    setFocusTick((n) => n + 1);
  }

  async function saveQuestion(q: Question) {
    const ok = await commit({
      ...pack,
      questions: pack.questions.map((x) => (x.id === q.id ? q : x)),
    });
    if (!ok) return;
    setEditing(false);
    announce(t("questionSaved"));
  }

  async function removeQuestion() {
    if (!question) return;
    const remaining = pack.questions.filter((x) => x.id !== question.id);
    const ok = await commit({ ...pack, questions: remaining });
    setRemoving(false);
    if (!ok) return;
    announce(t("questionRemoved"));
    begin(remaining, "all");
  }

  const history = (
    <section class="flex flex-col gap-2 border-t border-line pt-6" aria-labelledby="sb-history">
      <h2 id="sb-history" class="text-lg font-bold">
        {t("historyTitle")}
      </h2>
      {attempts.length === 0 ? (
        <p class="text-muted">{t("historyEmpty")}</p>
      ) : (
        <ul class="flex flex-col gap-1">
          {attempts.map((a) => (
            <li key={a.id}>
              {t("historyItem", {
                date: formatDateTime(a.at),
                correct: a.correct,
                total: a.total,
                percent: percent(a.correct, a.total),
              })}{" "}
              <span class="text-muted">
                ({a.scope === "all" ? t("scopeAll") : t("scopeWrong")})
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  if (pack.questions.length === 0) {
    return (
      <div class="flex flex-col gap-6">
        <Notice tone="info" title={t("quizEmptyTitle")}>
          {t("quizEmpty")}
        </Notice>
        {history}
      </div>
    );
  }

  if (finished) {
    const total = answers.length;
    const correctCount = answers.filter((a) => a.correct).length;
    const wrongAnswers = answers.filter((a) => !a.correct && byId.has(a.questionId));
    return (
      <div class="flex flex-col gap-6">
        <div class="flex flex-col gap-4">
          <h2 ref={doneRef} tabIndex={-1} class="text-xl font-bold">
            {t("quizDoneTitle")}
          </h2>
          <p class="text-lg font-semibold">
            {t("quizScore", {
              correct: correctCount,
              total,
              percent: percent(correctCount, total),
            })}
          </p>
          {saveFailed && (
            <Notice tone="warn" live>
              {t("attemptError")}
            </Notice>
          )}
          {wrongAnswers.length === 0 ? (
            <p>{t("noneWrong")}</p>
          ) : (
            <section class="flex flex-col gap-3" aria-labelledby="sb-wrong">
              <h3 id="sb-wrong" class="text-lg font-bold">
                {t("wrongListTitle")}
              </h3>
              <ul class="flex flex-col gap-3">
                {wrongAnswers.map((a) => {
                  const q = byId.get(a.questionId);
                  if (!q) return null;
                  return (
                    <li key={a.questionId} class="rounded-lg border-2 border-line p-3">
                      <p class="font-semibold">{q.stem}</p>
                      <p class="flex items-start gap-2 text-bad">
                        <Icon name="x" class="mt-1 shrink-0" />
                        <span>{t("yourChoice", { text: q.options[a.chosenIndex] ?? "" })}</span>
                      </p>
                      <p class="flex items-start gap-2 text-ok">
                        <Icon name="check" class="mt-1 shrink-0" />
                        <span>{t("rightChoice", { text: q.options[q.correctIndex] ?? "" })}</span>
                      </p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
          <div class="flex flex-wrap gap-2">
            {wrongAnswers.length > 0 && (
              <Button
                variant="primary"
                onClick={() =>
                  begin(
                    wrongAnswers.flatMap((a) => {
                      const q = byId.get(a.questionId);
                      return q ? [q] : [];
                    }),
                    "wrong",
                  )
                }
              >
                {t("retryWrong")}
              </Button>
            )}
            <Button
              variant={wrongAnswers.length > 0 ? "secondary" : "primary"}
              onClick={() => begin(pack.questions, "all")}
            >
              {t("retryAll")}
            </Button>
          </div>
        </div>
        {history}
      </div>
    );
  }

  if (!item || !question) return null;

  const chosenOriginal = answered && selected !== null ? item.perm[selected] : undefined;
  const wasCorrect = chosenOriginal === question.correctIndex;
  const isLast = index === session.items.length - 1;

  return (
    <div class="flex flex-col gap-6">
      <div class="flex flex-col gap-4">
        <p class="font-semibold text-muted">
          {t("questionCounter", { n: index + 1, total: session.items.length })}
        </p>
        <h2 id="sb-stem" ref={stemRef} tabIndex={-1} class="text-xl font-bold">
          {question.stem}
        </h2>

        <form class="flex flex-col gap-4" onSubmit={(e) => void submit(e)}>
          <fieldset class="flex min-w-0 flex-col gap-2" aria-describedby="sb-stem">
            <legend class="mb-1 text-sm font-semibold text-muted">{t("choose")}</legend>
            {item.perm.map((original, pos) => {
              const text = question.options[original] ?? "";
              const isChosen = answered && selected === pos;
              const isRight = answered && original === question.correctIndex;
              const border = isRight
                ? "border-ok bg-ok-bg"
                : isChosen
                  ? "border-bad bg-bad-bg"
                  : "border-line";
              return (
                <label
                  key={`${question.id}-${original}`}
                  class={`flex min-h-11 cursor-pointer items-start gap-3 rounded-lg border-2 p-3 ${border}`}
                >
                  <input
                    type="radio"
                    name={`q-${question.id}`}
                    value={String(pos)}
                    checked={selected === pos}
                    disabled={answered}
                    class="mt-1 h-5 w-5 shrink-0 accent-primary"
                    onChange={() => setSelected(pos)}
                  />
                  <span class="min-w-0 flex-1">
                    <span class="block">{text}</span>
                    {isChosen && (
                      <span
                        class={`mt-1 flex items-center gap-1 text-sm font-semibold ${isRight ? "text-ok" : "text-bad"}`}
                      >
                        <Icon name={isRight ? "check" : "x"} />
                        {t("yourAnswer")}
                      </span>
                    )}
                    {isRight && (
                      <span class="mt-1 flex items-center gap-1 text-sm font-semibold text-ok">
                        <Icon name="check" />
                        {t("correctAnswer")}
                      </span>
                    )}
                  </span>
                </label>
              );
            })}
          </fieldset>

          {!answered && (
            <div class="flex flex-col gap-2">
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  aria-disabled={selected === null ? true : undefined}
                  aria-describedby={selected === null ? hintId : undefined}
                >
                  {t("answer")}
                </Button>
              </div>
              {selected === null && (
                <p id={hintId} class="text-sm text-muted">
                  {t("chooseFirst")}
                </p>
              )}
            </div>
          )}
        </form>

        {answered && (
          <div ref={resultRef} tabIndex={-1} class="flex flex-col gap-3">
            <Notice
              tone={wasCorrect ? "ok" : "bad"}
              title={wasCorrect ? t("correct") : t("incorrect")}
            >
              {!wasCorrect && (
                <p class="font-semibold">
                  {t("rightWas", { text: question.options[question.correctIndex] ?? "" })}
                </p>
              )}
              <p>{question.explanation}</p>
              <p class="mt-1 text-sm text-muted">{t("sourcePage", { n: question.page })}</p>
            </Notice>
            {!question.verified && <Notice tone="warn">{tCommon("unverified")}</Notice>}
            {saveFailed && (
              <Notice tone="warn" live>
                {t("attemptError")}
              </Notice>
            )}
            <div>
              <Button variant="primary" icon="forward" onClick={next}>
                {isLast ? t("seeResult") : t("nextQuestion")}
              </Button>
            </div>
          </div>
        )}
      </div>

      <div class="flex flex-wrap gap-2 border-t border-line pt-4">
        <Button icon="edit" onClick={() => setEditing(true)}>
          {t("editQuestion")}
        </Button>
        <Button variant="danger" icon="trash" onClick={() => setRemoving(true)}>
          {t("removeQuestion")}
        </Button>
      </div>

      {history}

      <QuestionEditDialog
        open={editing}
        question={question}
        onClose={() => setEditing(false)}
        onSave={(q) => void saveQuestion(q)}
      />
      <ConfirmRemoveDialog
        open={removing}
        title={t("confirmRemoveQuestionTitle")}
        excerpt={question.stem}
        onClose={() => setRemoving(false)}
        onConfirm={() => void removeQuestion()}
      />
    </div>
  );
}
