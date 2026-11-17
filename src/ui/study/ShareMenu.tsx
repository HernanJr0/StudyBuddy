import { useState } from "preact/hooks";
import { errorMessage, isAppError, type StudyPack } from "../../core";
import { store } from "../../store";
import { announce, Button, Notice } from "../kit";
import { t } from "./messages";
import { downloadBlob } from "./util";

export function ShareMenu({ pack }: { pack: StudyPack }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);

  function fail(e: unknown) {
    setError(isAppError(e) ? errorMessage(e) : t("shareError"));
  }

  function done(text: string) {
    setError(null);
    setMessage(text);
    announce(text);
  }

  function saveFile() {
    try {
      const { blob, fileName } = store.packToFile(pack);
      downloadBlob(blob, fileName);
      setLink(null);
      done(t("downloaded"));
    } catch (e) {
      fail(e);
    }
  }

  function exportAnki() {
    try {
      const { blob, fileName } = store.flashcardsToAnkiCsv(pack);
      downloadBlob(blob, fileName);
      setLink(null);
      done(t("ankiDone"));
    } catch (e) {
      fail(e);
    }
  }

  async function copyLink() {
    let url: string;
    try {
      url = await store.packToLink(pack, location.origin + location.pathname);
    } catch (e) {
      fail(e);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setLink(null);
      done(t("linkCopied"));
    } catch {
      setError(null);
      setMessage(null);
      setLink(url);
      announce(t("linkFallback"));
    }
  }

  return (
    <section class="flex flex-col gap-3" aria-labelledby="sb-share">
      <h2 id="sb-share" class="text-lg font-bold">
        {t("shareTitle")}
      </h2>
      <div class="flex flex-wrap gap-2">
        <Button icon="download" onClick={saveFile}>
          {t("download")}
        </Button>
        <Button icon="share" onClick={copyLink}>
          {t("copyLink")}
        </Button>
        {pack.flashcards.length > 0 && (
          <Button icon="download" onClick={exportAnki}>
            {t("anki")}
          </Button>
        )}
      </div>
      <p class="text-sm text-muted">
        {t("shareNote")} {t("linkWarning")}
      </p>
      {message && <p class="font-semibold text-ok">{message}</p>}
      {error && (
        <Notice tone="bad" live>
          {error}
        </Notice>
      )}
      {link && (
        <div class="flex flex-col gap-1">
          <label for="sb-link" class="font-semibold">
            {t("linkFieldLabel")}
          </label>
          <p class="text-sm text-muted">{t("linkFallback")}</p>
          <input
            id="sb-link"
            type="text"
            readOnly
            value={link}
            class="block min-h-11 w-full rounded-lg border-2 border-line bg-bg px-3 py-2 text-base text-fg"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      )}
    </section>
  );
}
