import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { ROUTES, tCommon } from "../../core";
import { cx, Icon } from "../kit";
import { t } from "./messages";
import { type Route, routeKey } from "./router";

function routeTitle(route: Route): string {
  switch (route.name) {
    case "home":
      return t("titleHome");
    case "settings":
      return t("titleSettings");
    case "history":
      return t("titleHistory");
    case "pack":
      return t("titlePack");
    case "open":
      return t("titleOpen");
    case "example":
      return t("titleExample");
    case "kit":
      return t("titleKit");
    case "aiGuide":
      return t("titleGuide");
    case "privacy":
      return t("titlePrivacy");
    case "about":
      return t("titleAbout");
    case "notFound":
      return t("titleNotFound");
  }
}

const SVG_PROPS = {
  viewBox: "0 0 24 24",
  width: "1.25em",
  height: "1.25em",
  fill: "none",
  stroke: "currentColor",
  "stroke-width": 2,
  "stroke-linecap": "round",
  "stroke-linejoin": "round",
  focusable: "false",
} as const;

function HomeIcon() {
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      <path d="M4 11l8-7 8 7v9a1 1 0 01-1 1h-4v-6h-6v6H5a1 1 0 01-1-1z" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg {...SVG_PROPS} aria-hidden="true">
      <path d="M12 7v5l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

interface NavLinkProps {
  href: string;
  active: boolean;
  icon: ComponentChildren;
  children: string;
}

function NavLink({ href, active, icon, children }: NavLinkProps) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      class={cx(
        "flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-sm font-semibold no-underline sm:flex-none sm:flex-row sm:gap-2 sm:px-3 sm:text-base",
        active ? "bg-surface text-fg underline decoration-2 underline-offset-4" : "text-primary",
      )}
    >
      {icon}
      <span>{children}</span>
    </a>
  );
}

const FOOTER_LINK =
  "inline-flex min-h-11 items-center px-2 text-sm text-primary underline underline-offset-2";

export function Layout({ route, children }: { route: Route; children: ComponentChildren }) {
  const mainRef = useRef<HTMLElement>(null);
  const first = useRef(true);
  const key = routeKey(route);
  const title = routeTitle(route);

  useEffect(() => {
    document.title = `${title} · ${tCommon("appName")}`;
  }, [title]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }, [key]);

  function skip(e: MouseEvent) {
    // O endereço usa o hash para rotas; o salto só move o foco.
    e.preventDefault();
    mainRef.current?.focus();
  }

  return (
    <div class="mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4">
      {/* biome-ignore lint/a11y/useValidAnchor: o salto só move o foco; o hash é das rotas */}
      <a
        href="#conteudo"
        onClick={skip}
        class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-lg focus:bg-bg focus:p-3"
      >
        {t("skipLink")}
      </a>
      <header class="flex flex-col gap-1 border-b-2 border-line py-2 sm:flex-row sm:items-center sm:justify-between">
        <a
          href={ROUTES.home}
          class="inline-flex min-h-11 items-center text-xl font-bold text-fg no-underline"
        >
          {tCommon("appName")}
        </a>
        <nav aria-label={t("navMain")} class="flex flex-wrap gap-1">
          <NavLink href={ROUTES.home} active={route.name === "home"} icon={<HomeIcon />}>
            {t("navHome")}
          </NavLink>
          <NavLink href={ROUTES.history} active={route.name === "history"} icon={<HistoryIcon />}>
            {t("navHistory")}
          </NavLink>
          <NavLink
            href={ROUTES.settings}
            active={route.name === "settings"}
            icon={<Icon name="settings" />}
          >
            {t("navSettings")}
          </NavLink>
        </nav>
      </header>
      <main id="conteudo" ref={mainRef} tabIndex={-1} class="flex-1 py-6 outline-none">
        {children}
      </main>
      <footer class="flex flex-col gap-2 border-t-2 border-line py-4">
        <nav aria-label={t("navInfo")} class="-mx-2 flex flex-wrap">
          <a href={ROUTES.aiGuide} class={FOOTER_LINK}>
            {t("footerGuide")}
          </a>
          <a href={ROUTES.privacy} class={FOOTER_LINK}>
            {t("footerPrivacy")}
          </a>
          <a href={ROUTES.about} class={FOOTER_LINK}>
            {t("footerAbout")}
          </a>
        </nav>
        <p class="text-sm text-muted">{t("footerNotice")}</p>
      </footer>
    </div>
  );
}
