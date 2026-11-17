import type { ComponentChildren } from "preact";
import { useEffect, useId, useRef } from "preact/hooks";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ComponentChildren;
  /** Botões de ação, alinhados ao fim. */
  actions?: ComponentChildren;
}

/**
 * Diálogo modal sobre o elemento nativo <dialog>: o navegador prende o foco,
 * fecha com Esc e devolve o foco ao elemento que abriu.
 */
export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      class="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-xl border-2 border-line bg-bg p-0 text-fg backdrop:bg-black/60"
      onClose={onClose}
      onCancel={onClose}
    >
      <div class="flex flex-col gap-4 p-5">
        <h2 id={titleId} class="text-xl font-bold">
          {title}
        </h2>
        <div class="flex flex-col gap-3">{children}</div>
        {actions && <div class="flex flex-wrap justify-end gap-2">{actions}</div>}
      </div>
    </dialog>
  );
}
