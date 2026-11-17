import { useEffect, useMemo, useState } from "preact/hooks";
import { type PackSummary, ROUTES } from "../../core";
import { store } from "../../store";
import { announce, Button, cx, Dialog, Icon } from "../kit";
import { t } from "./messages";

type Filter = "all" | "generated" | "imported";

const COLLAPSE_KEY = "studybuddy.sidebarCollapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean): void {
  try {
    localStorage.setItem(COLLAPSE_KEY, value ? "1" : "0");
  } catch {
    // Sem armazenamento disponível (ex.: navegação privada): só não persiste.
  }
}

/**
 * Barra lateral com o histórico de pacotes, sempre visível ao lado do
 * conteúdo. Pode ser minimizada (ícones só) e, no celular, abre como uma
 * gaveta sobre o conteúdo.
 */
export function Sidebar({ activePackId }: { activePackId?: string }) {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [packs, setPacks] = useState<PackSummary[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toDelete, setToDelete] = useState<PackSummary | null>(null);

  async function load() {
    try {
      setPacks(await store.listPacks());
    } catch {
      setPacks([]);
    }
  }

  useEffect(() => {
    void load();
  }, [activePackId]);

  useEffect(() => {
    function onPacksChanged() {
      void load();
    }
    window.addEventListener("studybuddy:packs-changed", onPacksChanged);
    return () => window.removeEventListener("studybuddy:packs-changed", onPacksChanged);
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      writeCollapsed(next);
      return next;
    });
  }

  async function confirmDelete() {
    const target = toDelete;
    setToDelete(null);
    if (!target) return;
    await store.deletePack(target.id);
    await load();
    announce(t("histDeleted"));
    if (activePackId === target.id) location.hash = ROUTES.home;
  }

  const filtered = useMemo(() => {
    const list = packs ?? [];
    const byFilter = list.filter((p) => filter === "all" || p.origin === filter);
    const term = search.trim().toLowerCase();
    return term ? byFilter.filter((p) => p.title.toLowerCase().includes(term)) : byFilter;
  }, [packs, filter, search]);

  const count = packs?.length ?? 0;

  return (
    <>
      {!collapsed && (
        <button
          type="button"
          aria-label={t("sideCollapse")}
          onClick={toggleCollapsed}
          class="fixed inset-0 z-20 bg-fg/40 sm:hidden"
        />
      )}
      <aside
        aria-label={t("navHistory")}
        class={cx(
          "flex shrink-0 flex-col overflow-hidden border-r-2 border-line bg-surface transition-[width] duration-150",
          collapsed
            ? "relative z-0 w-16"
            : "fixed inset-y-0 left-0 z-30 w-72 shadow-lg sm:static sm:z-0 sm:w-72 sm:shadow-none",
        )}
      >
        <div
          class={cx(
            "flex min-h-14 items-center border-b-2 border-line",
            collapsed ? "justify-center px-1" : "justify-between gap-2 px-3",
          )}
        >
          {!collapsed && <strong class="truncate text-base">{t("navHistory")}</strong>}
          <Button
            aria-label={collapsed ? t("sideExpand") : t("sideCollapse")}
            onClick={toggleCollapsed}
            class={cx("shrink-0 px-0", collapsed ? "w-11" : "ml-auto")}
          >
            <Icon name="panel" />
          </Button>
        </div>

        {collapsed ? (
          <div class="flex flex-col items-center gap-3 py-3">
            <ButtonLinkCreate collapsed />
            <span class="rounded-full bg-bg px-2 py-0.5 text-xs text-muted">{count}</span>
          </div>
        ) : (
          <>
            <div class="flex flex-col gap-2 px-3 pb-3 pt-3">
              <label class="relative block">
                <span class="sr-only">{t("sideSearchLabel")}</span>
                <Icon
                  name="search"
                  class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
                />
                <input
                  type="search"
                  value={search}
                  onInput={(e) => setSearch(e.currentTarget.value)}
                  placeholder={t("sideSearchPlaceholder")}
                  class="min-h-10 w-full rounded-full border-2 border-line bg-bg py-1 pl-9 pr-3 text-sm"
                />
              </label>
              <ButtonLinkCreate />
              <fieldset
                aria-label={t("sideFilterGroup")}
                class="m-0 flex min-w-0 gap-1.5 border-0 p-0"
              >
                <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>
                  {t("sideFilterAll")}
                </FilterChip>
                <FilterChip active={filter === "generated"} onClick={() => setFilter("generated")}>
                  {t("sideFilterGenerated")}
                </FilterChip>
                <FilterChip active={filter === "imported"} onClick={() => setFilter("imported")}>
                  {t("sideFilterImported")}
                </FilterChip>
              </fieldset>
            </div>

            <div class="flex-1 overflow-y-auto px-2 pb-3">
              {packs === null && (
                <p role="status" class="px-2 text-sm text-muted">
                  {t("histLoading")}
                </p>
              )}
              {packs !== null && filtered.length === 0 && (
                <p class="px-2 py-4 text-sm text-muted">{t("sideEmpty")}</p>
              )}
              <ul class="flex flex-col gap-1">
                {filtered.map((pack) => (
                  <li
                    key={pack.id}
                    class={cx(
                      "flex items-start gap-1 rounded-lg",
                      pack.id === activePackId && "bg-bg",
                    )}
                  >
                    <a
                      href={ROUTES.pack(pack.id)}
                      aria-current={pack.id === activePackId ? "page" : undefined}
                      title={pack.title}
                      class="flex min-h-11 min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-lg px-2 py-2 text-left no-underline hover:bg-bg"
                    >
                      <span class="truncate text-sm font-semibold text-fg">{pack.title}</span>
                      <span class="truncate text-xs text-muted">
                        {pack.origin === "generated"
                          ? t("sideFilterGenerated")
                          : t("sideFilterImported")}
                        {pack.lastScore
                          ? ` · ${pack.lastScore.correct}/${pack.lastScore.total}`
                          : ""}
                      </span>
                    </a>
                    <Button
                      variant="iconDanger"
                      aria-label={`${t("histDelete")} ${pack.title}`}
                      onClick={() => setToDelete(pack)}
                      class="mt-1 shrink-0 px-0"
                    >
                      <Icon name="trash" class="size-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </aside>

      <Dialog
        open={toDelete !== null}
        onClose={() => setToDelete(null)}
        title={t("histDeleteTitle")}
        actions={
          <>
            <Button onClick={() => setToDelete(null)}>{t("genCancel")}</Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t("histDelete")}
            </Button>
          </>
        }
      >
        {toDelete && <p>{t("histDeleteText", { title: toDelete.title })}</p>}
      </Dialog>
    </>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      class={cx(
        "min-h-8 flex-1 rounded-lg border-2 px-2 text-xs font-semibold",
        active
          ? "border-primary bg-primary text-on-primary"
          : "border-line bg-bg text-fg hover:bg-surface",
      )}
    >
      {children}
    </button>
  );
}

function ButtonLinkCreate({ collapsed }: { collapsed?: boolean }) {
  return (
    <a
      href={ROUTES.home}
      aria-label={t("sideCreate")}
      class={cx(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-lg bg-primary text-on-primary no-underline hover:brightness-110",
        collapsed ? "w-11" : "w-full px-2.5 text-sm font-semibold",
      )}
    >
      <Icon name="plus" class="size-4" />
      {!collapsed && t("sideCreate")}
    </a>
  );
}
