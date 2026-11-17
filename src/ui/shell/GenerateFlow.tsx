import { useEffect, useRef, useState } from "preact/hooks";
import {
  AppError,
  type ErrorCode,
  errorMessage,
  type GenerationStage,
  getProvider,
  LIMITS,
  type ProviderInfo,
  ROUTES,
  toAppError,
} from "../../core";
import { llm } from "../../llm";
import { pdf } from "../../pdf";
import { store } from "../../store";
import {
  announce,
  Button,
  ButtonLink,
  CONTROL_CLASS,
  cx,
  Dialog,
  Field,
  Notice,
  Progress,
  TextArea,
  TextInput,
} from "../kit";
import { t } from "./messages";
import { navigate } from "./router";

type Mode = "pdf" | "text";

interface FieldErrors {
  file?: string | undefined;
  text?: string | undefined;
  cards?: string | undefined;
  questions?: string | undefined;
}

interface Failure {
  code: ErrorCode;
  message: string;
}

const STAGES: GenerationStage[] = ["preparing", "requesting", "validating", "verifying"];

const STAGE_TEXT: Record<GenerationStage, Parameters<typeof t>[0]> = {
  preparing: "genStagePreparing",
  requesting: "genStageRequesting",
  validating: "genStageValidating",
  verifying: "genStageVerifying",
  done: "genStageDone",
};

const SETTINGS_ERRORS: ErrorCode[] = ["llm/no-config", "llm/invalid-key", "llm/model-not-found"];

const FILE_CLASS =
  "file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-primary file:px-3 file:text-on-primary file:font-semibold";

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`;
}

function parseCount(value: string, min: number, max: number): number | null {
  if (!/^\d+$/.test(value.trim())) return null;
  const n = Number(value);
  return n >= min && n <= max ? n : null;
}

function toFailure(err: AppError): Failure {
  const pages = Number(err.detail);
  const params =
    err.code === "pdf/too-many-pages"
      ? { pages: Number.isFinite(pages) ? pages : t("genManyPages") }
      : undefined;
  return { code: err.code, message: errorMessage(err, params) };
}

interface Counts {
  cards: number;
  questions: number;
}

export function GenerateFlow() {
  const [mode, setMode] = useState<Mode>("pdf");
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [cards, setCards] = useState(String(LIMITS.flashcards.default));
  const [questions, setQuestions] = useState(String(LIMITS.questions.default));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [failure, setFailure] = useState<Failure | null>(null);
  const [running, setRunning] = useState(false);
  const [stage, setStage] = useState<GenerationStage>("preparing");
  const [consentFor, setConsentFor] = useState<ProviderInfo | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  function focusLater(selector: string) {
    setTimeout(() => rootRef.current?.querySelector<HTMLElement>(selector)?.focus(), 60);
  }

  function validate(): Counts | null {
    const next: FieldErrors = {};
    if (mode === "pdf" && !file) next.file = t("genFileMissing");
    if (mode === "text" && !text.trim()) next.text = t("genTextMissing");
    const nCards = parseCount(cards, LIMITS.flashcards.min, LIMITS.flashcards.max);
    const nQuestions = parseCount(questions, LIMITS.questions.min, LIMITS.questions.max);
    if (nCards === null) {
      next.cards = t("genCountError", { min: LIMITS.flashcards.min, max: LIMITS.flashcards.max });
    }
    if (nQuestions === null) {
      next.questions = t("genCountError", {
        min: LIMITS.questions.min,
        max: LIMITS.questions.max,
      });
    }
    setErrors(next);
    if (Object.keys(next).length > 0 || nCards === null || nQuestions === null) {
      focusLater('[aria-invalid="true"]');
      return null;
    }
    return { cards: nCards, questions: nQuestions };
  }

  function onSubmit(e: Event) {
    e.preventDefault();
    setFailure(null);
    const counts = validate();
    if (!counts) return;
    const config = store.getProviderConfig();
    if (!config) {
      setFailure(toFailure(new AppError("llm/no-config")));
      return;
    }
    if (!store.getSettings().consentedProviders.includes(config.provider)) {
      setConsentFor(getProvider(config.provider));
      return;
    }
    void run(counts);
  }

  function confirmConsent() {
    const info = consentFor;
    const counts = validate();
    setConsentFor(null);
    if (!info || !counts) return;
    const known = store.getSettings().consentedProviders;
    store.saveSettings({ consentedProviders: [...new Set([...known, info.id])] });
    void run(counts);
  }

  async function run(counts: Counts) {
    const controller = new AbortController();
    const { signal } = controller;
    abortRef.current = controller;
    setRunning(true);
    setStage("preparing");
    setFailure(null);
    try {
      const config = store.getProviderConfig();
      if (!config) throw new AppError("llm/no-config");
      const doc =
        mode === "pdf" && file ? await pdf.extractPdf(file, { signal }) : pdf.fromText(text);
      if (signal.aborted) throw new AppError("llm/cancelled");
      const pack = await llm.generateStudyPack(
        doc,
        { flashcards: counts.cards, questions: counts.questions },
        config,
        { signal, onProgress: setStage },
      );
      if (signal.aborted) throw new AppError("llm/cancelled");
      await store.savePack(pack, "generated");
      announce(t("genDone"));
      navigate(ROUTES.pack(pack.id));
    } catch (e) {
      const err = toAppError(e);
      if (signal.aborted || err.code === "llm/cancelled") {
        announce(t("genCancelled"));
        focusLater('button[type="submit"]');
      } else {
        setFailure(toFailure(err));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setRunning(false);
    }
  }

  const stageIndex = Math.max(0, STAGES.indexOf(stage));

  return (
    <div ref={rootRef} class="flex flex-col gap-4">
      <h2 class="text-xl font-bold">{t("genTitle")}</h2>
      <form class="flex flex-col gap-5" onSubmit={onSubmit} noValidate>
        <fieldset disabled={running} class="flex min-w-0 flex-col gap-5">
          <fieldset class="flex min-w-0 flex-col gap-2">
            <legend class="font-semibold">{t("genSourceLegend")}</legend>
            <div class="flex flex-col gap-2 sm:flex-row">
              {(["pdf", "text"] as const).map((m) => (
                <label
                  key={m}
                  class={cx(
                    "flex min-h-11 flex-1 cursor-pointer items-center gap-3 rounded-lg border-2 px-3 py-2 font-semibold",
                    mode === m ? "border-primary bg-surface" : "border-line",
                  )}
                >
                  <input
                    type="radio"
                    name="fonte"
                    value={m}
                    checked={mode === m}
                    onChange={() => setMode(m)}
                    class="size-5 accent-primary"
                  />
                  {m === "pdf" ? t("genSourcePdf") : t("genSourceText")}
                </label>
              ))}
            </div>
          </fieldset>

          <div hidden={mode !== "pdf"} class="flex flex-col gap-2">
            <Field
              label={t("genFileLabel")}
              hint={t("genFileHint", {
                mb: LIMITS.maxFileBytes / 1024 / 1024,
                pages: LIMITS.maxPages,
              })}
              error={errors.file}
            >
              {(a11y) => (
                <input
                  type="file"
                  accept="application/pdf"
                  class={cx(CONTROL_CLASS, FILE_CLASS)}
                  onChange={(e) => {
                    setFile((e.currentTarget as HTMLInputElement).files?.[0] ?? null);
                    setErrors((prev) => ({ ...prev, file: undefined }));
                  }}
                  {...a11y}
                />
              )}
            </Field>
            {file && (
              <p class="text-sm" aria-live="polite">
                {t("genFileChosen", { name: file.name, size: formatSize(file.size) })}
              </p>
            )}
          </div>

          <div hidden={mode !== "text"}>
            <TextArea
              label={t("genTextLabel")}
              hint={t("genTextHint")}
              error={errors.text}
              value={text}
              rows={8}
              onInput={(e) => setText(e.currentTarget.value)}
            />
          </div>

          <div class="grid gap-5 sm:grid-cols-2">
            <TextInput
              label={t("genCardsLabel")}
              type="number"
              inputMode="numeric"
              min={LIMITS.flashcards.min}
              max={LIMITS.flashcards.max}
              hint={t("genCountHint", { ...LIMITS.flashcards })}
              error={errors.cards}
              value={cards}
              onInput={(e) => setCards(e.currentTarget.value)}
            />
            <TextInput
              label={t("genQuestionsLabel")}
              type="number"
              inputMode="numeric"
              min={LIMITS.questions.min}
              max={LIMITS.questions.max}
              hint={t("genCountHint", { ...LIMITS.questions })}
              error={errors.questions}
              value={questions}
              onInput={(e) => setQuestions(e.currentTarget.value)}
            />
          </div>

          <Button type="submit" variant="primary" block>
            {t("genSubmit")}
          </Button>
        </fieldset>
      </form>

      {running && (
        <div class="flex flex-col gap-3">
          <Progress
            label={t("genStep", {
              n: stageIndex + 1,
              total: STAGES.length,
              text: t(STAGE_TEXT[stage]),
            })}
          />
          <div>
            <Button onClick={() => abortRef.current?.abort()}>{t("genCancel")}</Button>
          </div>
        </div>
      )}

      {failure && (
        <Notice tone="bad" live title={t("genErrorTitle")}>
          <p>{failure.message}</p>
          {SETTINGS_ERRORS.includes(failure.code) && (
            <div class="mt-3">
              <ButtonLink href={ROUTES.settings}>{t("genErrorSettingsLink")}</ButtonLink>
            </div>
          )}
        </Notice>
      )}

      <Dialog
        open={consentFor !== null}
        onClose={() => setConsentFor(null)}
        title={t("consentTitle")}
        actions={
          <>
            <Button onClick={() => setConsentFor(null)}>{t("genCancel")}</Button>
            <Button variant="primary" onClick={confirmConsent}>
              {t("consentConfirm")}
            </Button>
          </>
        }
      >
        {consentFor && (
          <>
            <p>{t("consentSend", { provider: consentFor.label })}</p>
            <p>{t("consentDirect")}</p>
            {consentFor.trainsOnFreeTier && (
              <Notice tone="warn">{t("consentTrain", { provider: consentFor.label })}</Notice>
            )}
            <p class="text-sm text-muted">{t("consentOnce")}</p>
          </>
        )}
      </Dialog>
    </div>
  );
}
