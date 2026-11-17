import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

// O service worker só existe no build de produção (rode sem PW_DEV).
test.beforeEach(({ browserName }, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop" || browserName !== "chromium",
    "PWA testado só no projeto desktop",
  );
});

async function controlled(page: Page) {
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15_000 });
}

test("manifesto válido e ligado ao index.html", async ({ page, request }) => {
  await page.goto("/");
  const href = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(href).toBe("/manifest.webmanifest");
  const res = await request.get("/manifest.webmanifest");
  expect(res.ok()).toBe(true);
  const m = await res.json();
  expect(m.name).toBe("StudyBuddy");
  expect(m.lang).toBe("pt-BR");
  expect(m.display).toBe("standalone");
  expect(m.start_url).toBeTruthy();
  const purposes = m.icons.map((i: { purpose: string }) => i.purpose);
  expect(purposes).toContain("maskable");
  for (const icon of m.icons) {
    const r = await request.get(`/${icon.src}`);
    expect(r.ok(), icon.src).toBe(true);
  }
  expect(await page.locator('meta[name="theme-color"]').count()).toBe(2);
  expect(await page.locator('link[rel="apple-touch-icon"]').count()).toBe(1);
});

test("service worker registra e controla a página", async ({ page }) => {
  await page.goto("/");
  await controlled(page);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope);
  expect(scope).toMatch(/\/$/);
  const keys = await page.evaluate(() => caches.keys());
  expect(keys.some((k) => k.startsWith("studybuddy-"))).toBe(true);
});

test("sem internet, o pacote de exemplo abre e o quiz funciona", async ({ page, context }) => {
  await page.goto("/#/exemplo");
  await controlled(page);
  await expect(page.getByRole("tab", { name: "Quiz" })).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Quiz" })).toBeVisible();
  await page.getByRole("tab", { name: "Quiz" }).click();
  await expect(page.locator("#sb-stem")).toBeVisible();
  await page.getByRole("radio").first().click();
  await context.setOffline(false);
});

test("detecta nova versão do service worker", async ({ page }) => {
  // O navegador não deixa page.route interceptar a atualização do sw.js; então troca o arquivo servido.
  const swPath = join(process.cwd(), "dist", "sw.js");
  const original = readFileSync(swPath, "utf8");
  try {
    await page.goto("/");
    await controlled(page);
    await page.evaluate(() => {
      (window as unknown as { __upd: number }).__upd = 0;
      window.addEventListener("studybuddy:update-ready", () => {
        (window as unknown as { __upd: number }).__upd++;
      });
    });
    writeFileSync(
      swPath,
      `${original}
// versão nova ${Date.now()}
`,
    );
    await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.ready;
      await reg.update();
    });
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { __upd: number }).__upd))
      .toBeGreaterThan(0);
  } finally {
    writeFileSync(swPath, original);
  }
});
