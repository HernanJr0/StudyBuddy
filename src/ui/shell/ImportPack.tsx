import { useState } from "preact/hooks";
import { errorMessage, ROUTES, toAppError } from "../../core";
import { store } from "../../store";
import { announce, CONTROL_CLASS, cx, Field } from "../kit";
import { t } from "./messages";
import { navigate } from "./router";

const FILE_CLASS =
  "file:mr-3 file:min-h-9 file:rounded-md file:border-0 file:bg-primary file:px-3 file:text-on-primary file:font-semibold";

/** Abre um pacote recebido por arquivo (.json) e o guarda neste aparelho. */
export function ImportPack() {
  const [error, setError] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  async function onChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    setError(undefined);
    setBusy(true);
    try {
      const pack = await store.packFromFile(file);
      await store.savePack(pack, "imported");
      navigate(ROUTES.pack(pack.id));
    } catch (err) {
      const message = errorMessage(toAppError(err, "share/invalid"));
      setError(message);
      announce(message, { assertive: true });
      input.value = "";
    } finally {
      setBusy(false);
    }
  }

  return (
    <section class="flex flex-col gap-5 rounded-xl border border-line bg-surface p-6 shadow-md">
      <h2 class="text-xl font-bold">{t("importLabel")}</h2>
      <Field label={t("importLabel")} hint={t("importHint")} error={error}>
        {(a11y) => (
          <input
            type="file"
            accept=".json,application/json"
            class={cx(CONTROL_CLASS, FILE_CLASS)}
            disabled={busy}
            onChange={onChange}
            {...a11y}
          />
        )}
      </Field>
      {busy && (
        <p role="status" class="text-sm text-muted">
          {t("importBusy")}
        </p>
      )}
    </section>
  );
}
