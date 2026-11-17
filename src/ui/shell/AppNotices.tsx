import { useEffect, useState } from "preact/hooks";
import { applyUpdate, isUpdateReady, UPDATE_READY_EVENT, useOnline } from "../../pwa";
import { Button, Notice } from "../kit";
import { t } from "./messages";

/** Avisos globais: sem internet e versão nova disponível. */
export function AppNotices() {
  const online = useOnline();
  const [update, setUpdate] = useState(isUpdateReady);

  useEffect(() => {
    const on = () => setUpdate(true);
    window.addEventListener(UPDATE_READY_EVENT, on);
    setUpdate(isUpdateReady());
    return () => window.removeEventListener(UPDATE_READY_EVENT, on);
  }, []);

  if (online && !update) return null;
  return (
    <div class="flex flex-col gap-3 pt-4">
      {!online && (
        <Notice tone="warn" live>
          {t("offlineNotice")}
        </Notice>
      )}
      {update && (
        <Notice tone="info" live title={t("updateTitle")}>
          <p>{t("updateText")}</p>
          <div class="mt-3">
            <Button variant="primary" onClick={applyUpdate}>
              {t("updateButton")}
            </Button>
          </div>
        </Notice>
      )}
    </div>
  );
}
