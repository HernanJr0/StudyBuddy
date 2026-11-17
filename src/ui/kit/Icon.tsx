const PATHS = {
  check: "M5 12.5l4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6L6 18",
  alert:
    "M12 8v5m0 3.5v.01M10.3 3.9L2.6 17.5A2 2 0 004.3 20.5h15.4a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  info: "M12 11v6m0-9.5v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  back: "M15 5l-7 7 7 7",
  forward: "M9 5l7 7-7 7",
  upload: "M12 16V4m0 0L7 9m5-5l5 5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
  download: "M12 4v12m0 0l-5-5m5 5l5-5M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3",
  share: "M8 12h8m0 0l-3-3m3 3l-3 3M4 6v12a2 2 0 002 2h4M14 4h4a2 2 0 012 2v12a2 2 0 01-2 2h-4",
  trash: "M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM13.5 6.5l4 4",
  settings: "M4 6h9m5 0h2M4 12h3m5 0h8M4 18h11m5 0h0M15.500 4v4M9.500 10v4M17.500 16v4",
} as const;

export type IconName = keyof typeof PATHS;

/**
 * Ícone decorativo. Sempre escondido de leitores de tela: o significado
 * precisa estar no texto ao lado (ou em `aria-label` do botão).
 */
export function Icon({ name, class: className }: { name: IconName; class?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="1.25em"
      height="1.25em"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
      class={className}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
