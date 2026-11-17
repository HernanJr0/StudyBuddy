import type { ComponentChildren } from "preact";
import { ROUTES } from "../../core";
import { ButtonLink } from "../kit";
import { ExternalLink } from "./ExternalLink";
import { t } from "./messages";

const REPO_URL = "https://github.com/HernanJr0/StudyBuddy";
const TEAM = ["Adriano Eusebio Monteiro de Andrade", "Luis Hernan", "Victor Hugo Franco Noronha"];

function Page({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <article class="flex max-w-prose flex-col gap-4">
      <h1 class="text-2xl font-bold">{title}</h1>
      {children}
    </article>
  );
}

function H2({ children }: { children: string }) {
  return <h2 class="mt-4 text-xl font-bold">{children}</h2>;
}

function List({ children }: { children: ComponentChildren }) {
  return <ul class="ml-5 flex list-disc flex-col gap-2">{children}</ul>;
}

export function GuidePage() {
  return (
    <Page title={t("guideTitle")}>
      <p>{t("guideIntro")}</p>
      <H2>{t("guideH1")}</H2>
      <p>{t("guideP1")}</p>
      <H2>{t("guideH2")}</H2>
      <p>{t("guideP2")}</p>
      <H2>{t("guideH3")}</H2>
      <List>
        <li>{t("guideL1")}</li>
        <li>{t("guideL2")}</li>
        <li>{t("guideL3")}</li>
      </List>
      <H2>{t("guideH4")}</H2>
      <List>
        <li>{t("guideL4")}</li>
        <li>{t("guideL5")}</li>
      </List>
      <H2>{t("guideH5")}</H2>
      <p>{t("guideP5")}</p>
    </Page>
  );
}

export function PrivacyPage() {
  return (
    <Page title={t("privTitle")}>
      <p>{t("privIntro")}</p>
      <H2>{t("privH1")}</H2>
      <p>{t("privP1")}</p>
      <H2>{t("privH2")}</H2>
      <p>{t("privP2")}</p>
      <H2>{t("privH3")}</H2>
      <p>{t("privP3")}</p>
      <H2>{t("privH4")}</H2>
      <p>{t("privP4")}</p>
      <H2>{t("privH5")}</H2>
      <p>{t("privP5")}</p>
      <div>
        <ButtonLink href={ROUTES.settings}>{t("privGoSettings")}</ButtonLink>
      </div>
    </Page>
  );
}

export function AboutPage() {
  return (
    <Page title={t("aboutTitle")}>
      <p>{t("aboutIntro")}</p>
      <H2>{t("aboutTeamTitle")}</H2>
      <List>
        {TEAM.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </List>
      <H2>{t("aboutOpenTitle")}</H2>
      <p>
        {t("aboutOpenText")}{" "}
        <ExternalLink href={REPO_URL}>github.com/HernanJr0/StudyBuddy</ExternalLink>
      </p>
      <H2>{t("aboutScienceTitle")}</H2>
      <p>{t("aboutScienceText")}</p>
    </Page>
  );
}

export function NotFoundPage() {
  return (
    <Page title={t("titleNotFound")}>
      <p>{t("notFoundText")}</p>
      <div>
        <ButtonLink href={ROUTES.home} variant="primary">
          {t("goHome")}
        </ButtonLink>
      </div>
    </Page>
  );
}
