import type { ComponentChildren } from "preact";
import { useState } from "preact/hooks";
import { Icon } from "./Icon";
import { cx } from "./util";

interface DisclosureProps {
  /** Usado no id do título e para ligar o botão ao painel (aria-controls). */
  id: string;
  title: string;
  defaultOpen?: boolean;
  /**
   * Seção que não pode ser minimizada (ex.: Dados). Fica sempre aberta e
   * sem a seta; o título aparece como rótulo simples, não como botão.
   */
  locked?: boolean;
  children: ComponentChildren;
}

/**
 * Seção de configurações que pode ser minimizada/maximizada. Uma seção
 * `locked` fica sempre aberta, sem controle de abrir/fechar.
 */
export function Disclosure({
  id,
  title,
  defaultOpen = false,
  locked = false,
  children,
}: DisclosureProps) {
  const [open, setOpen] = useState(defaultOpen);
  const showBody = locked || open;
  const panelId = `${id}-panel`;

  return (
    <section class="overflow-hidden rounded-lg border-2 border-line bg-bg" aria-labelledby={id}>
      {locked ? (
        <div class="px-4 pt-4">
          <h2 id={id} class="text-xl font-bold">
            {title}
          </h2>
        </div>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
          class="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <h2 id={id} class="text-xl font-bold">
            {title}
          </h2>
          <Icon
            name="chevronDown"
            class={cx(
              "shrink-0 text-muted transition-transform",
              open && "rotate-180 text-primary",
            )}
          />
        </button>
      )}
      {showBody && (
        <section id={panelId} aria-labelledby={id} class="flex flex-col gap-4 px-4 pb-4 pt-1">
          {children}
        </section>
      )}
    </section>
  );
}
