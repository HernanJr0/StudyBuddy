import { useState } from "preact/hooks";
import { errorMessage, toAppError } from "../../core";
import { store } from "../../store";
import { Button, Dialog, Notice, type Tone } from "../kit";
import { t } from "./messages";

/**
 * Apagar todos os pacotes, tentativas e marcações deste aparelho. O título
 * da seção fica a cargo de quem a envolve (veja `Disclosure` em
 * SettingsPage): esta é a única seção de Configurações que não pode ser
 * minimizada.
 */
export function DataSection() {
  const [confirm, setConfirm] = useState(false);
  const [result, setResult] = useState<{ tone: Tone; text: string } | null>(null);

  async function clearAll() {
    setConfirm(false);
    try {
      await store.clearAll();
      setResult({ tone: "ok", text: t("setClearAllDone") });
    } catch (e) {
      setResult({ tone: "bad", text: errorMessage(toAppError(e, "store/unavailable")) });
    }
  }

  return (
    <>
      <p>{t("setDataText")}</p>
      <div>
        <Button variant="danger" icon="trash" class="px-3 text-sm" onClick={() => setConfirm(true)}>
          {t("setClearAll")}
        </Button>
      </div>
      {result && (
        <Notice tone={result.tone} live>
          {result.text}
        </Notice>
      )}
      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title={t("setClearAllTitle")}
        actions={
          <>
            <Button onClick={() => setConfirm(false)}>{t("genCancel")}</Button>
            <Button variant="danger" onClick={clearAll}>
              {t("setClearAllConfirm")}
            </Button>
          </>
        }
      >
        <p>{t("setClearAllText")}</p>
      </Dialog>
    </>
  );
}
