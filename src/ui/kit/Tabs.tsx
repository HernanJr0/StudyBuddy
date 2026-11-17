import type { ComponentChildren } from "preact";
import { useId, useRef } from "preact/hooks";
import { cx } from "./util";

export interface TabItem<Id extends string> {
  id: Id;
  label: string;
  content: ComponentChildren;
}

interface TabsProps<Id extends string> {
  /** Nome do conjunto de abas, lido por leitores de tela. */
  label: string;
  tabs: TabItem<Id>[];
  selected: Id;
  onSelect: (id: Id) => void;
}

/**
 * Abas no padrão WAI-ARIA: setas mudam de aba, Home e End vão às pontas,
 * e só a aba ativa entra na ordem do Tab.
 */
export function Tabs<Id extends string>({ label, tabs, selected, onSelect }: TabsProps<Id>) {
  const base = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const index = Math.max(
    0,
    tabs.findIndex((t) => t.id === selected),
  );

  function focusTab(i: number) {
    const next = tabs[(i + tabs.length) % tabs.length];
    if (!next) return;
    onSelect(next.id);
    // O foco acompanha a seleção depois que a aba é renderizada como ativa.
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`#${CSS.escape(`${base}-tab-${next.id}`)}`)
        ?.focus();
    });
  }

  function onKeyDown(e: KeyboardEvent) {
    const keys: Record<string, number> = {
      ArrowRight: index + 1,
      ArrowLeft: index - 1,
      Home: 0,
      End: tabs.length - 1,
    };
    const target = keys[e.key];
    if (target === undefined) return;
    e.preventDefault();
    focusTab(target);
  }

  return (
    <div>
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        class="flex gap-1 overflow-x-auto border-b-2 border-line"
        onKeyDown={onKeyDown}
      >
        {tabs.map((tab) => {
          const active = tab.id === selected;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${base}-tab-${tab.id}`}
              aria-selected={active}
              aria-controls={`${base}-panel-${tab.id}`}
              tabIndex={active ? 0 : -1}
              class={cx(
                "-mb-0.5 min-h-11 shrink-0 border-b-4 px-4 py-2 text-base font-semibold",
                active
                  ? "border-primary text-primary"
                  : "border-transparent text-muted hover:text-fg",
              )}
              onClick={() => onSelect(tab.id)}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${base}-panel-${tab.id}`}
          aria-labelledby={`${base}-tab-${tab.id}`}
          hidden={tab.id !== selected}
          // biome-ignore lint/a11y/noNoninteractiveTabindex: padrão WAI-ARIA; o painel precisa ser alcançável pelo teclado
          tabIndex={0}
          class="py-4"
        >
          {tab.id === selected && tab.content}
        </div>
      ))}
    </div>
  );
}
