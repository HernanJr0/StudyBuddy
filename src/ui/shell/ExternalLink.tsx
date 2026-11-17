import type { ComponentChildren } from "preact";
import { t } from "./messages";

/** Link para outro site: abre em nova aba e avisa isso no texto. */
export function ExternalLink({ href, children }: { href: string; children: ComponentChildren }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      class="inline-flex min-h-11 items-center gap-1"
    >
      <span>{children}</span>
      <span class="text-sm text-muted">{t("setNewTab")}</span>
    </a>
  );
}
