import { useState } from "preact/hooks";
import type { ThemeChoice } from "../../core";
import { store } from "../../store";
import { applyFontScale, applyTheme, FONT_SCALES, Select } from "../kit";
import { t } from "./messages";

const THEMES: Array<{ value: ThemeChoice; label: Parameters<typeof t>[0] }> = [
  { value: "system", label: "setThemeSystem" },
  { value: "light", label: "setThemeLight" },
  { value: "dark", label: "setThemeDark" },
];

const SCALE_LABELS: Record<number, Parameters<typeof t>[0]> = {
  1: "setFont1",
  1.15: "setFont115",
  1.3: "setFont13",
};

/**
 * Tema e tamanho do texto: aplicam na hora e ficam salvos. O título da
 * seção fica a cargo de quem a envolve (veja `Disclosure` em SettingsPage).
 */
export function AppearanceSection() {
  const initial = store.getSettings();
  const [theme, setTheme] = useState<ThemeChoice>(initial.theme);
  const [scale, setScale] = useState(initial.fontScale);

  return (
    <>
      <Select
        label={t("setThemeLabel")}
        value={theme}
        onChange={(e) => {
          const next = e.currentTarget.value as ThemeChoice;
          setTheme(next);
          applyTheme(next);
          store.saveSettings({ theme: next });
        }}
      >
        {THEMES.map((o) => (
          <option key={o.value} value={o.value}>
            {t(o.label)}
          </option>
        ))}
      </Select>
      <Select
        label={t("setFontLabel")}
        value={String(scale)}
        onChange={(e) => {
          const next = Number(e.currentTarget.value);
          setScale(next);
          applyFontScale(next);
          store.saveSettings({ fontScale: next });
        }}
      >
        {FONT_SCALES.map((s) => (
          <option key={s} value={String(s)}>
            {t(SCALE_LABELS[s] ?? "setFont1")} ({Math.round(s * 100)}%)
          </option>
        ))}
      </Select>
    </>
  );
}
