import type { ComponentChildren } from "preact";
import { useEffect, useRef } from "preact/hooks";
import { ROUTES, tCommon } from "../../core";
import { cx, Icon } from "../kit";
import { t } from "./messages";
import { type Route, routeKey } from "./router";
import { Sidebar } from "./Sidebar";

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

interface NavLinkProps {
  href: string;
  active: boolean;
  children: string;
}

function NavLink({ href, active, children }: NavLinkProps) {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      class={cx(
        "flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-lg px-3 text-base font-semibold no-underline",
        active ? "bg-surface text-fg underline decoration-2 underline-offset-4" : "text-primary",
      )}
    >
      <Icon name="settings" />
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
  const activePackId = route.name === "pack" ? route.id : undefined;

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
    <div class="flex min-h-dvh w-full">
      {/* biome-ignore lint/a11y/useValidAnchor: o salto só move o foco; o hash é das rotas */}
      <a
        href="#conteudo"
        onClick={skip}
        class="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-10 focus:rounded-lg focus:bg-bg focus:p-3"
      >
        {t("skipLink")}
      </a>
      <Sidebar activePackId={activePackId} />
      <div class="mx-auto flex min-h-dvh w-full min-w-0 max-w-3xl flex-1 flex-col px-4">
        <header class="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line py-2">
          <a
            href={ROUTES.home}
            class="inline-flex min-h-11 items-center text-xl font-bold text-fg no-underline"
          >
            {tCommon("appName")}
          </a>
          <nav aria-label={t("navMain")} class="flex flex-wrap gap-1">
            <NavLink href={ROUTES.settings} active={route.name === "settings"}>
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
    </div>
  );
}
