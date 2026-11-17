import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const fixture = JSON.parse(
  readFileSync(join(process.cwd(), "src/core/fixtures/study-pack.example.json"), "utf8"),
) as { title: string; flashcards: { front: string; back: string }[] };

const HOUR = 3_600_000;
const DAY = 24 * HOUR;

async function audit(page: Page) {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Abre o exemplo no modo de flashcards e acerta os `n` primeiros cartões (agenda a revisão). */
async function studyCards(page: Page, n: number) {
  await page.goto("/#/exemplo");
  await expect(page.getByRole("heading", { level: 1, name: fixture.title })).toBeVisible();
  await page.getByRole("tab", { name: "Flashcards" }).click();
  for (let i = 0; i < n; i++) {
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: "Acertei" }).click();
    // O contador só avança depois que o estado foi gravado.
    await expect(
      page.getByRole("heading", { name: new RegExp(`^Cartão ${i + 2} de `) }),
    ).toBeVisible();
  }
}

async function jumpForward(page: Page, ms: number) {
  await page.clock.setFixedTime(new Date(Date.now() + ms));
}

async function openReview(page: Page) {
  // Passa por outra rota: a mesma rota não remonta a página.
  await page.goto("/#/historico");
  await expect(page.getByRole("heading", { level: 1, name: "Histórico" })).toBeVisible();
  await page.goto("/#/revisar");
  await expect(page.getByRole("heading", { level: 1, name: "Revisar hoje" })).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await page.clock.install();
});

test("sem estudo prévio: nada para revisar, com link para o início", async ({ page }) => {
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Nada para revisar agora" })).toBeVisible();
  await expect(page.getByText("Ainda não há revisões marcadas.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao início" })).toBeVisible();
});

test("cartões avaliados no pacote voltam em #/revisar quando vencem", async ({ page }) => {
  await studyCards(page, 3);

  // Ainda não venceram (voltam em 10 min).
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Nada para revisar agora" })).toBeVisible();
  await expect(page.getByText(/^Próxima revisão:/)).toBeVisible();

  await jumpForward(page, HOUR);
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Cartão 1 de 3" })).toBeVisible();
  await expect(page.getByRole("main").getByRole("link", { name: fixture.title })).toBeVisible();
  await expect(page.getByText(fixture.flashcards[0]?.front ?? "").first()).toBeVisible();
});

test("cartão excluído do pacote não aparece na revisão", async ({ page }) => {
  await studyCards(page, 2);
  // Volta ao primeiro cartão (que já tem estado) e o exclui: o estado fica órfão.
  await page.getByRole("button", { name: "Anterior" }).click();
  await page.getByRole("button", { name: "Anterior" }).click();
  await page.getByRole("button", { name: "Excluir cartão" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /Excluir/ })
    .click();

  await jumpForward(page, HOUR);
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Cartão 1 de 1" })).toBeVisible();
});

test("fluxo completo só com o teclado, usando as 4 notas", async ({ page }) => {
  await studyCards(page, 4);
  await jumpForward(page, HOUR);
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Cartão 1 de 4" })).toBeVisible();

  const grades = ["Errei", "Difícil", "Bom", "Fácil"];
  for (let i = 0; i < grades.length; i++) {
    const reveal = page.getByRole("button", { name: "Mostrar resposta" });
    await reveal.focus();
    await page.keyboard.press("Enter");
    // O foco vai para o verso; cada Tab seguinte chega a uma nota, em ordem.
    await expect(page.getByRole("button", { name: /^Errei/ })).toBeVisible();
    await expect(page.locator(":focus")).toContainText("Verso");
    for (let k = 0; k <= i; k++) await page.keyboard.press("Tab");
    const button = page.getByRole("button", { name: new RegExp(`^${grades[i]}`) });
    await expect(button).toBeFocused();
    await expect(button).toContainText(/em .+/);
    await page.keyboard.press("Enter");
    if (i < grades.length - 1) {
      await expect(page.getByRole("heading", { name: `Cartão ${i + 2} de 4` })).toBeVisible();
      await expect(page.locator(":focus")).toHaveCount(1);
    }
  }

  const done = page.getByRole("heading", { name: "Nada para revisar agora" });
  await expect(done).toBeVisible();
  await expect(done).toBeFocused();
  await expect(page.getByText("Você revisou 4 cartões neste momento.")).toBeVisible();
  await expect(page.getByText(/^Próxima revisão:/)).toBeVisible();
  await page.getByRole("link", { name: "Voltar ao início" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#\/$/);
});

test("as notas mostram quando o cartão volta", async ({ page }) => {
  await studyCards(page, 1);
  await jumpForward(page, HOUR);
  await openReview(page);
  await page.getByRole("button", { name: "Mostrar resposta" }).click();
  for (const name of ["Errei", "Difícil", "Bom", "Fácil"]) {
    await expect(page.getByRole("button", { name: new RegExp(`^${name}`) })).toContainText(
      /em (menos de 1 min|\d+ (min|h|dias?|mes(es)?))/,
    );
  }
});

for (const scheme of ["light", "dark"] as const) {
  test.describe(`tema ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test("revisão sem violações de acessibilidade", async ({ page }) => {
      await openReview(page);
      await audit(page);

      await studyCards(page, 2);
      await jumpForward(page, HOUR);
      await openReview(page);
      await expect(page.getByRole("heading", { name: "Cartão 1 de 2" })).toBeVisible();
      await audit(page);

      await page.getByRole("button", { name: "Mostrar resposta" }).click();
      await expect(page.getByRole("button", { name: /^Bom/ })).toBeVisible();
      await audit(page);

      await page.getByRole("button", { name: /^Bom/ }).click();
      await page.getByRole("button", { name: "Mostrar resposta" }).click();
      await page.getByRole("button", { name: /^Fácil/ }).click();
      await expect(page.getByRole("heading", { name: "Nada para revisar agora" })).toBeVisible();
      await audit(page);
    });
  });
}

test("sem rolagem horizontal e com alvos de 44 px em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await studyCards(page, 1);
  await jumpForward(page, HOUR);
  await openReview(page);
  await page.getByRole("button", { name: "Mostrar resposta" }).click();
  const buttons = page.getByRole("button", { name: /^(Errei|Difícil|Bom|Fácil)/ });
  await expect(buttons).toHaveCount(4);
  for (const box of await Promise.all([0, 1, 2, 3].map((i) => buttons.nth(i).boundingBox()))) {
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
});

test("depois de um dia, os dois cartões estudados estão vencidos", async ({ page }) => {
  await studyCards(page, 2);
  await jumpForward(page, DAY);
  await openReview(page);
  await expect(page.getByRole("heading", { name: "Cartão 1 de 2" })).toBeVisible();
});
