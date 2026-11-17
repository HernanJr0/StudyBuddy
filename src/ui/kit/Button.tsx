import type { ComponentChildren, JSX } from "preact";
import { Icon, type IconName } from "./Icon";
import { cx } from "./util";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "iconDanger";

const BASE =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-4 py-2 text-base font-semibold no-underline select-none disabled:cursor-not-allowed disabled:opacity-60 aria-disabled:cursor-not-allowed aria-disabled:opacity-60";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-on-primary hover:brightness-110",
  secondary: "border-2 border-line bg-bg text-fg hover:bg-surface",
  ghost: "text-primary hover:bg-surface",
  danger: "border-2 border-bad bg-bg text-bad hover:bg-bad-bg",
  iconDanger: "text-muted hover:text-bad",
};

interface Common {
  variant?: ButtonVariant;
  icon?: IconName;
  /** Ocupa a largura toda (útil no celular). */
  block?: boolean;
  children: ComponentChildren;
}

type ButtonProps = Common & Omit<JSX.IntrinsicElements["button"], "children">;

export function Button({
  variant = "secondary",
  icon,
  block,
  children,
  class: className,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      class={cx(BASE, VARIANTS[variant], block && "w-full", className as string | undefined)}
      {...rest}
    >
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

interface LinkProps extends Common {
  href: string;
  class?: string;
  target?: "_blank";
  rel?: string;
  /** Nome do arquivo, quando o link baixa algo. */
  download?: string;
  "aria-label"?: string;
  "aria-current"?: "page";
  onClick?: (e: MouseEvent) => void;
}

/** Link com aparência de botão. Use para navegação; para ações, use Button. */
export function ButtonLink({
  variant = "secondary",
  icon,
  block,
  children,
  class: className,
  ...rest
}: LinkProps) {
  return (
    <a class={cx(BASE, VARIANTS[variant], block && "w-full", className)} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </a>
  );
}
