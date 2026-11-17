import type { ComponentChildren, GenericEventHandler, InputEventHandler, JSX, VNode } from "preact";
import { useId } from "preact/hooks";
import { cx } from "./util";

export const CONTROL_CLASS =
  "block min-h-11 w-full rounded-lg border-2 border-line bg-bg px-3 py-2 text-base text-fg aria-invalid:border-bad";

export interface ControlA11y {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: true;
}

interface FieldProps {
  label: string;
  /** Ajuda curta, sempre visível. */
  hint?: ComponentChildren;
  /** Mensagem de erro; quando presente, o campo é marcado como inválido. */
  error?: string | undefined;
  /** Recebe os atributos de acessibilidade e devolve o controle. */
  children: (a11y: ControlA11y) => VNode;
  class?: string;
}

/**
 * Rótulo, ajuda e erro ligados ao controle. Todo campo de formulário da
 * aplicação deve usar este componente (ou TextInput/Select/TextArea).
 */
export function Field({ label, hint, error, children, class: className }: FieldProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(" ");

  return (
    <div class={cx("flex flex-col gap-1", className)}>
      <label for={id} class="font-semibold">
        {label}
      </label>
      {hint && (
        <p id={hintId} class="text-sm text-muted">
          {hint}
        </p>
      )}
      {children({
        id,
        ...(describedBy ? { "aria-describedby": describedBy } : {}),
        ...(error ? { "aria-invalid": true as const } : {}),
      })}
      {error && (
        <p id={errorId} class="text-sm font-semibold text-bad">
          {error}
        </p>
      )}
    </div>
  );
}

type Shared = Pick<FieldProps, "label" | "hint" | "error">;

interface TextInputProps extends Shared {
  type?: "text" | "password" | "url" | "number" | "search";
  value?: string | number;
  onInput?: InputEventHandler<HTMLInputElement>;
  onChange?: GenericEventHandler<HTMLInputElement>;
  placeholder?: string;
  name?: string;
  autocomplete?: "off" | "on";
  inputMode?: "text" | "numeric" | "url";
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  spellcheck?: boolean;
  class?: string;
}

export function TextInput({
  label,
  hint,
  error,
  class: className,
  type = "text",
  ...rest
}: TextInputProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(a11y) => {
        // Os tipos do Preact variam conforme `type`; o conjunto aceito aqui é seguro.
        const props = {
          type,
          class: cx(CONTROL_CLASS, className),
          ...rest,
          ...a11y,
        } as JSX.IntrinsicElements["input"];
        return <input {...props} />;
      }}
    </Field>
  );
}

export function TextArea({
  label,
  hint,
  error,
  class: className,
  ...rest
}: Shared & Omit<JSX.IntrinsicElements["textarea"], "id">) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(a11y) => (
        <textarea
          class={cx(CONTROL_CLASS, "min-h-32", className as string | undefined)}
          {...rest}
          {...a11y}
        />
      )}
    </Field>
  );
}

interface SelectProps extends Shared {
  value?: string;
  onChange?: GenericEventHandler<HTMLSelectElement>;
  name?: string;
  required?: boolean;
  disabled?: boolean;
  class?: string;
  /** Elementos <option>. */
  children: ComponentChildren;
}

export function Select({ label, hint, error, class: className, children, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error}>
      {(a11y) => (
        <select class={cx(CONTROL_CLASS, className)} {...rest} {...a11y}>
          {children}
        </select>
      )}
    </Field>
  );
}
