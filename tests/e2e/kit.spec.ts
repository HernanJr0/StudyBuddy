import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`tema ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test("página inicial sem violações de acessibilidade", async ({ page }) => {
      await page.goto("/");
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await audit(page);
    });

    test("componentes base sem violações de acessibilidade", async ({ page }) => {
      await page.goto("/#/kit");
      await expect(page.getByRole("heading", { name: "Componentes base" })).toBeVisible();
      await audit(page);

      await page.getByRole("button", { name: "Abrir diálogo" }).click();
      await expect(page.getByRole("dialog", { name: "Excluir este pacote?" })).toBeVisible();
      await audit(page);
    });
  });
}

test("abas funcionam só com o teclado", async ({ page }) => {
  await page.goto("/#/kit");
  const resumo = page.getByRole("tab", { name: "Resumo" });
  await resumo.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab", { name: "Flashcards" })).toBeFocused();
  await expect(page.getByRole("tabpanel")).toContainText("Conteúdo dos flashcards.");
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Quiz" })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(resumo).toBeFocused();
});

test("diálogo fecha com Esc e devolve o foco", async ({ page }) => {
  await page.goto("/#/kit");
  const opener = page.getByRole("button", { name: "Abrir diálogo" });
  await opener.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(opener).toBeFocused();
});

test("não há rolagem horizontal em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/#/kit");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(overflow).toBe(false);
});
