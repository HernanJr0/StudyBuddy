import type { ThemeChoice } from "../../core";

export const FONT_SCALES = [1, 1.15, 1.3] as const;

/** Aplica o tema. "system" segue a preferência do aparelho. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
}

export function applyFontScale(scale: number): void {
  const safe = Math.min(1.3, Math.max(1, scale));
  document.documentElement.style.setProperty("--sb-font-scale", String(safe));
}
