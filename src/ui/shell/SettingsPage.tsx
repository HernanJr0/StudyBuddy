import { useEffect, useRef, useState } from "preact/hooks";
import {
  errorMessage,
  getProvider,
  type ModelInfo,
  PROVIDERS,
  type ProviderId,
  toAppError,
} from "../../core";
import { llm } from "../../llm";
import { store } from "../../store";
import { Button, Dialog, Notice, Select, TextInput, type Tone } from "../kit";
import { AppearanceSection } from "./AppearanceSection";
import { DataSection } from "./DataSection";
import { ExternalLink } from "./ExternalLink";
import { t } from "./messages";

interface Feedback {
  tone: Tone;
  text: string;
}

interface FieldErrors {
  key?: string | undefined;
  baseUrl?: string | undefined;
  model?: string | undefined;
}

function validUrl(value: string): boolean {
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function SettingsPage() {
  const initial = store.getSettings();
  const [provider, setProvider] = useState<ProviderId>(initial.provider);
  const [apiKey, setApiKey] = useState(() => store.getApiKey(initial.provider));
  const [showKey, setShowKey] = useState(false);
  const [remember, setRemember] = useState(initial.rememberKey);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [busy, setBusy] = useState<"models" | "test" | null>(null);
  const [confirmKey, setConfirmKey] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const info = getProvider(provider);
  const keyOptional = info.keyOptional === true;

  function onProviderChange(next: ProviderId) {
    abortRef.current?.abort();
    setProvider(next);
    setApiKey(store.getApiKey(next));
    setShowKey(false);
    setModel("");
    setModels([]);
    setErrors({});
    setFeedback(null);
    setBusy(null);
  }

  function focusInvalid() {
    setTimeout(
      () => rootRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(),
      60,
    );
  }

  /** Confere o que é preciso para falar com o provedor. */
  function checkConnection(needModel: boolean): boolean {
    const next: FieldErrors = {};
    if (!keyOptional && !apiKey.trim()) next.key = t("setKeyMissing");
    if (provider === "custom" && !validUrl(baseUrl)) next.baseUrl = t("setBaseUrlInvalid");
    if (needModel && !model.trim()) next.model = t("setModelMissing");
    setErrors(next);
    if (Object.keys(next).length > 0) {
      focusInvalid();
      return false;
    }
    return true;
  }

  function connection() {
    return {
      provider,
      apiKey: apiKey.trim(),
      ...(provider === "custom" ? { baseUrl: baseUrl.trim() } : {}),
    };
  }

  function begin(kind: "models" | "test"): AbortSignal {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(kind);
    setFeedback(null);
    return controller.signal;
  }

  async function fetchModels() {
    if (!checkConnection(false)) return;
    const signal = begin("models");
    try {
      const list = await llm.listModels(connection(), { signal });
      if (signal.aborted) return;
      setModels(list);
      if (list.length > 0 && !model.trim()) setModel(list[0]?.id ?? "");
      setFeedback(
        list.length > 0
          ? { tone: "ok", text: t("setModelsFound", { n: list.length }) }
          : { tone: "warn", text: t("setModelsNone") },
      );
    } catch (e) {
      if (signal.aborted) return;
      setFeedback({ tone: "bad", text: errorMessage(toAppError(e)) });
    } finally {
      if (!signal.aborted) setBusy(null);
    }
  }

  async function testConnection() {
    if (!checkConnection(true)) return;
    const signal = begin("test");
    try {
      await llm.testConnection({ ...connection(), model: model.trim() }, { signal });
      if (signal.aborted) return;
      setFeedback({ tone: "ok", text: t("setTestOk") });
    } catch (e) {
      if (signal.aborted) return;
      setFeedback({ tone: "bad", text: errorMessage(toAppError(e)) });
    } finally {
      if (!signal.aborted) setBusy(null);
    }
  }

  function save(e: Event) {
    e.preventDefault();
    if (!checkConnection(true)) return;
    store.saveSettings({
      provider,
      model: model.trim(),
      baseUrl: provider === "custom" ? baseUrl.trim() : "",
      rememberKey: remember,
    });
    store.setApiKey(provider, apiKey.trim(), remember);
    setFeedback({ tone: "ok", text: t("setSaved") });
  }

  function deleteKeys() {
    store.clearApiKeys();
    setApiKey("");
    setConfirmKey(false);
    setFeedback({ tone: "ok", text: t("setDeleteKeyDone") });
  }

  return (
    <div ref={rootRef} class="flex flex-col gap-8">
      <h1 class="text-2xl font-bold">{t("setTitle")}</h1>

      <form class="flex flex-col gap-8" onSubmit={save} noValidate>
        <section class="flex flex-col gap-4" aria-labelledby="cfg-provedor">
          <h2 id="cfg-provedor" class="text-xl font-bold">
            {t("setProviderTitle")}
          </h2>

          <Select
            label={t("setProviderLabel")}
            value={provider}
            onChange={(e) => onProviderChange(e.currentTarget.value as ProviderId)}
          >
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </Select>

          <div class="flex flex-col gap-2">
            <div class="flex flex-wrap items-center gap-x-4">
              {info.keyUrl && <ExternalLink href={info.keyUrl}>{t("setCreateKey")}</ExternalLink>}
              {info.termsUrl && <ExternalLink href={info.termsUrl}>{t("setTerms")}</ExternalLink>}
            </div>
            {info.freeTier && (
              <p class="inline-flex w-fit items-center gap-2 rounded-lg border-2 border-ok bg-ok-bg px-3 py-1 font-semibold text-ok">
                <span aria-hidden="true">✓</span>
                {t("setFreeTier")}
              </p>
            )}
            {info.freeTier && <p class="text-sm text-muted">{t("setFreeTierNote")}</p>}
          </div>

          {info.trainsOnFreeTier && (
            <Notice tone="warn" title={t("setTrainTitle")}>
              {t("setTrainText")}
            </Notice>
          )}

          <Notice tone="info">{t("setKeyRule")}</Notice>

          {provider === "custom" && (
            <TextInput
              label={t("setBaseUrlLabel")}
              hint={t("setBaseUrlHint")}
              type="url"
              inputMode="url"
              autocomplete="off"
              spellcheck={false}
              value={baseUrl}
              error={errors.baseUrl}
              onInput={(e) => setBaseUrl(e.currentTarget.value)}
            />
          )}

          <div class="flex flex-col gap-2">
            <TextInput
              label={keyOptional ? t("setKeyLabelOptional") : t("setKeyLabel")}
              hint={t("setKeyHint")}
              type={showKey ? "text" : "password"}
              autocomplete="off"
              spellcheck={false}
              value={apiKey}
              error={errors.key}
              onInput={(e) => setApiKey(e.currentTarget.value)}
            />
            <div>
              <Button onClick={() => setShowKey((v) => !v)}>
                {showKey ? t("setHideKey") : t("setShowKey")}
              </Button>
            </div>
          </div>

          <label class="flex min-h-11 items-start gap-3 py-1">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.currentTarget.checked)}
              class="mt-1 size-5 shrink-0 accent-primary"
            />
            <span>
              <span class="block font-semibold">{t("setRemember")}</span>
              <span class="block text-sm text-muted">{t("setRememberHint")}</span>
            </span>
          </label>
        </section>

        <section class="flex flex-col gap-4" aria-labelledby="cfg-modelo">
          <h2 id="cfg-modelo" class="text-xl font-bold">
            {t("setModelTitle")}
          </h2>

          <div>
            <Button onClick={fetchModels} disabled={busy !== null}>
              {busy === "models" ? t("setBusyModels") : t("setFetchModels")}
            </Button>
          </div>

          {models.length > 0 && (
            <Select
              label={t("setModelsSelect")}
              value={models.some((m) => m.id === model) ? model : ""}
              onChange={(e) => {
                if (e.currentTarget.value) setModel(e.currentTarget.value);
              }}
            >
              <option value="">{t("setModelsPlaceholder")}</option>
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </Select>
          )}

          <TextInput
            label={t("setModelLabel")}
            hint={t("setModelHint")}
            autocomplete="off"
            spellcheck={false}
            value={model}
            error={errors.model}
            onInput={(e) => setModel(e.currentTarget.value)}
          />

          <div>
            <Button onClick={testConnection} disabled={busy !== null}>
              {busy === "test" ? t("setBusyTest") : t("setTestConnection")}
            </Button>
          </div>
        </section>

        <div class="flex flex-col gap-3">
          <div class="flex flex-wrap gap-2">
            <Button type="submit" variant="primary">
              {t("setSave")}
            </Button>
            <Button variant="danger" icon="trash" onClick={() => setConfirmKey(true)}>
              {t("setDeleteKey")}
            </Button>
          </div>
          {feedback && (
            <Notice tone={feedback.tone} live>
              {feedback.text}
            </Notice>
          )}
        </div>
      </form>

      <AppearanceSection />

      <DataSection />

      <Dialog
        open={confirmKey}
        onClose={() => setConfirmKey(false)}
        title={t("setDeleteKeyTitle")}
        actions={
          <>
            <Button onClick={() => setConfirmKey(false)}>{t("genCancel")}</Button>
            <Button variant="danger" onClick={deleteKeys}>
              {t("setDeleteKeyConfirm")}
            </Button>
          </>
        }
      >
        <p>{t("setDeleteKeyText")}</p>
      </Dialog>
    </div>
  );
}
