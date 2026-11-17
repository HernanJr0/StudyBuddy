interface ProgressProps {
  /** Texto visível que descreve o que está acontecendo. */
  label: string;
  /** De 0 a 1. Ausente = duração desconhecida. */
  value?: number;
}

export function Progress({ label, value }: ProgressProps) {
  const known = value !== undefined;
  const percent = known ? Math.round(Math.min(1, Math.max(0, value)) * 100) : undefined;
  return (
    <div class="flex flex-col gap-2">
      <p class="font-semibold" role="status">
        {label}
        {known && <span class="text-muted"> {percent}%</span>}
      </p>
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={known ? 0 : undefined}
        aria-valuemax={known ? 100 : undefined}
        aria-valuenow={percent}
        class="h-3 w-full overflow-hidden rounded-full border border-line bg-surface"
      >
        <div
          class="h-full rounded-full bg-primary"
          style={
            known
              ? { width: `${percent}%` }
              : { width: "40%", animation: "sb-indeterminate 1.4s ease-in-out infinite" }
          }
        />
      </div>
    </div>
  );
}
