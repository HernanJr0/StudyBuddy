import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const SECRET_KEY = "sk-or-chave-secreta-de-teste";
const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

/** Simula o OpenRouter: troca de código e lista de modelos. Nenhuma chamada real. */
async function mockOpenRouter(page: Page, exchange: "ok" | "fail" = "ok") {
  const bodies: unknown[] = [];
  await page.route(/^https:\/\/openrouter\.ai\/api\/v1\//, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS });
      return;
    }
    const headers = { ...CORS, "content-type": "application/json" };
    if (request.url().endsWith("/auth/keys")) {
      bodies.push(request.postDataJSON());
      if (exchange === "fail") {
        await route.fulfill({ status: 403, headers, body: JSON.stringify({ error: "x" }) });
      } else {
        await route.fulfill({ status: 200, headers, body: JSON.stringify({ key: SECRET_KEY }) });
      }
      return;
    }
    if (request.url().endsWith("/models")) {
      await route.fulfill({
        status: 200,
        headers,
        body: JSON.stringify({ data: [{ id: "modelo-a" }, { id: "modelo-b" }] }),
      });
      return;
    }
    await route.fulfill({ status: 404, headers, body: "{}" });
  });
  return bodies;
}

async function openSettings(page: Page) {
  await page.goto("/#/configuracoes");
  await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
  await page.getByLabel("Provedor", { exact: true }).selectOption("openrouter");
}

test("o botão leva ao login do OpenRouter com PKCE", async ({ page }) => {
  await mockOpenRouter(page);
  let authUrl: URL | null = null;
  await page.route(/^https:\/\/openrouter\.ai\/auth/, async (route) => {
    authUrl = new URL(route.request().url());
    await route.fulfill({ status: 200, contentType: "text/html", body: "<p>login</p>" });
  });
  await openSettings(page);
  await expect(page.getByText(/a chave volta sozinha/)).toBeVisible();
  await page.getByRole("button", { name: "Conectar com OpenRouter" }).click();
  await page.waitForURL(/openrouter\.ai\/auth/);

  const url = authUrl as URL | null;
  expect(url).not.toBeNull();
  const origin = new URL(page.url()).origin;
  expect(origin).toBe("https://openrouter.ai");
  expect(url?.searchParams.get("callback_url")).toMatch(/^http:\/\/localhost:\d+\/$/);
  expect(url?.searchParams.get("code_challenge_method")).toBe("S256");
  expect(url?.searchParams.get("code_challenge")).toMatch(/^[A-Za-z0-9_-]{43}$/);
});

test("voltar com ?code grava a chave sem expô-la", async ({ page }) => {
  const bodies = await mockOpenRouter(page);
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("sb.openrouter.verifier"))
      sessionStorage.setItem("sb.openrouter.verifier", "verifier-de-teste");
  });
  await page.goto("/?code=abc");
  await expect(page).toHaveURL(/#\/configuracoes$/);
  await expect(page.getByText("Conectado ao OpenRouter. Agora escolha um modelo.")).toBeVisible();

  expect(page.url()).not.toContain("code");
  expect(page.url()).not.toContain(SECRET_KEY);
  expect(bodies).toEqual([
    { code: "abc", code_verifier: "verifier-de-teste", code_challenge_method: "S256" },
  ]);
  await expect(page.getByLabel("Provedor", { exact: true })).toHaveValue("openrouter");
  await expect(page.getByLabel("Chave de API", { exact: true })).toHaveAttribute(
    "type",
    "password",
  );
  await expect(page.locator("body")).not.toContainText(SECRET_KEY);

  // Sugere modelos sem o usuário pedir.
  await expect(page.getByLabel("Modelos encontrados")).toBeVisible();
  await expect(page.getByLabel("Nome do modelo")).toHaveValue(/^modelo-[ab]$/);

  const stored = await page.evaluate(
    () => sessionStorage.getItem("sb.openrouter.verifier") === null,
  );
  expect(stored).toBe(true);

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configurações salvas neste aparelho.")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Provedor", { exact: true })).toHaveValue("openrouter");
  await page.getByRole("button", { name: "Mostrar" }).click();
  await expect(page.getByLabel("Chave de API", { exact: true })).toHaveValue(SECRET_KEY);
});

test("erro na troca do código mostra mensagem simples", async ({ page }) => {
  await mockOpenRouter(page, "fail");
  await page.addInitScript(() => {
    if (!sessionStorage.getItem("sb.openrouter.verifier"))
      sessionStorage.setItem("sb.openrouter.verifier", "verifier-de-teste");
  });
  await page.goto("/?code=abc");
  await expect(page.getByRole("alert")).toContainText("Não foi possível conectar ao OpenRouter");
  expect(page.url()).not.toContain("code=");
  await expect(page.getByLabel("Chave de API", { exact: true })).toHaveValue("");
});

test("código sem verifier na sessão é ignorado e a URL é limpa", async ({ page }) => {
  const bodies = await mockOpenRouter(page);
  await page.goto("/?code=abc");
  await expect(page.locator("main")).toBeVisible();
  await expect(page).not.toHaveURL(/code=/);
  expect(bodies).toEqual([]);
});

for (const scheme of ["light", "dark"] as const) {
  test(`seção do OpenRouter sem violações de acessibilidade, tema ${scheme}`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: scheme });
    await mockOpenRouter(page);
    await openSettings(page);
    await expect(page.getByRole("button", { name: "Conectar com OpenRouter" })).toBeVisible();
    await audit(page);
  });
}
