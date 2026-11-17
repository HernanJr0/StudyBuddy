import type { ComponentChildren } from "preact";
import { Icon, type IconName } from "./Icon";
import { cx } from "./util";

export type Tone = "info" | "ok" | "bad" | "warn";

const TONES: Record<Tone, { box: string; icon: IconName; prefix: string }> = {
  info: { box: "border-info bg-info-bg text-info", icon: "info", prefix: "Informação" },
  ok: { box: "border-ok bg-ok-bg text-ok", icon: "check", prefix: "Certo" },
  bad: { box: "border-bad bg-bad-bg text-bad", icon: "x", prefix: "Erro" },
  warn: { box: "border-warn bg-warn-bg text-warn", icon: "alert", prefix: "Atenção" },
};

interface NoticeProps {
  tone?: Tone;
  title?: string;
  children: ComponentChildren;
  /** Erros que surgem depois de uma ação devem ser anunciados na hora. */
  live?: boolean;
  class?: string;
}

/**
 * Aviso em destaque. O significado nunca depende só da cor: há ícone e
 * um prefixo de texto para leitores de tela.
 */
export function Notice({ tone = "info", title, children, live, class: className }: NoticeProps) {
  const t = TONES[tone];
  return (
    <div
      role={live ? (tone === "bad" ? "alert" : "status") : undefined}
      class={cx("flex gap-3 rounded-lg border-2 p-3", t.box, className)}
    >
      <Icon name={t.icon} class="mt-0.5 shrink-0" />
      <div class="min-w-0">
        <span class="sr-only">{t.prefix}: </span>
        {title && <p class="font-bold">{title}</p>}
        <div class="text-fg">{children}</div>
      </div>
    </div>
  );
}
