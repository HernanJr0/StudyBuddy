/**
 * Fluxo integrado: PDF de verdade → geração (provedor simulado) → estudo →
 * histórico → compartilhamento por link aberto em outro navegador sem chave.
 */
import { readFileSync } from "node:fs";
import { expect, type Page, test } from "@playwright/test";

const EXAMPLE = JSON.parse(readFileSync("src/core/fixtures/study-pack.example.json", "utf8"));
const FIXTURES = "src/pdf/fixtures";

const GENERATED = JSON.stringify({
  title: "Pacote do teste integrado",
  summary: {
    overview: EXAMPLE.summary.overview,
    keyPoints: EXAMPLE.summary.keyPoints.map((k: object) => ({ ...k, page: 1 })),
  },
  flashcards: EXAMPLE.flashcards.map(({ id: _i, verified: _v, ...c }: Record<string, unknown>) => ({
    ...c,
    page: 1,
  })),
  questions: EXAMPLE.questions.map(({ id: _i, verified: _v, ...q }: Record<string, unknown>) => ({
    ...q,
    page: 1,
  })),
});

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

/** Simula o Groq e guarda o corpo das chamadas de geração. */
async function mockGroq(page: Page): Promise<{ bodies: string[] }> {
  const seen = { bodies: [] as string[] };
  await page.route(/^https:\/\/api\.groq\.com\/openai\/v1\//, async (route) => {
    const request = route.request();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        headers: { ...CORS, "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    if (request.url().endsWith("/models")) return json({ data: [{ id: "modelo-a" }] });
    seen.bodies.push(request.postData() ?? "");
    return json({ choices: [{ message: { content: GENERATED } }] });
  });
  return seen;
}

async function configure(page: Page) {
  await page.goto("/#/configuracoes");
  await page.getByLabel("Provedor", { exact: true }).selectOption("groq");
  await page.getByLabel("Chave de API", { exact: true }).fill("chave-de-teste-123");
  await page.getByLabel("Nome do modelo").fill("modelo-a");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configurações salvas neste aparelho.")).toBeVisible();
}

async function submitPdf(page: Page, file: string) {
  await page.goto("/#/");
  await page.getByLabel("Arquivo PDF").setInputFiles(`${FIXTURES}/${file}`);
  await page.getByRole("button", { name: "Gerar pacote de estudo" }).click();
  // Primeira geração com o provedor: o aviso de consentimento sempre aparece.
  await page.getByRole("button", { name: "Entendi, continuar" }).click();
}

test("PDF real vira pacote, fica no histórico e abre por link em outro aparelho", async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const groq = await mockGroq(page);
  await configure(page);
  await submitPdf(page, "texto-3-paginas.pdf");

  await expect(
    page.getByRole("heading", { level: 1, name: "Pacote do teste integrado" }),
  ).toBeVisible();

  // O texto do PDF foi extraído no navegador e enviado com marcação de página; a chave não vai no corpo.
  expect(groq.bodies).toHaveLength(1);
  expect(groq.bodies[0]).toContain("[Página 3]");
  expect(groq.bodies[0]).not.toContain("chave-de-teste-123");

  // Persiste depois de recarregar e aparece no histórico.
  await page.reload();
  await expect(
    page.getByRole("heading", { level: 1, name: "Pacote do teste integrado" }),
  ).toBeVisible();
  await page.goto("/#/historico");
  await expect(page.getByRole("link", { name: "Pacote do teste integrado" })).toBeVisible();

  // Compartilha por link.
  await page.getByRole("link", { name: "Pacote do teste integrado" }).click();
  await page.getByRole("button", { name: "Copiar link" }).click();
  await expect(page.getByText("Link copiado.").first()).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain("#/abrir/1.");
  expect(link).not.toContain("chave-de-teste-123");

  // Outro "aparelho": contexto novo, sem chave e sem dados.
  const other = await browser.newContext();
  const visitor = await other.newPage();
  await visitor.goto(link);
  await expect(
    visitor.getByRole("heading", { level: 1, name: "Pacote do teste integrado" }),
  ).toBeVisible();
  await visitor.getByRole("tab", { name: "Quiz" }).click();
  await expect(visitor.getByRole("radio").first()).toBeVisible();
  await other.close();
});

test("PDF escaneado é recusado com explicação", async ({ page }) => {
  await mockGroq(page);
  await configure(page);
  await submitPdf(page, "escaneado.pdf");
  await expect(page.getByText(/parece ser uma imagem escaneada/)).toBeVisible();
});

test("PDF acima do limite de páginas é recusado com o número de páginas", async ({ page }) => {
  await mockGroq(page);
  await configure(page);
  await submitPdf(page, "31-paginas.pdf");
  await expect(page.getByText(/tem 31 páginas e o limite é 30/)).toBeVisible();
});

test("o leitor de PDF só é baixado quando um PDF é enviado", async ({ page }) => {
  const scripts: string[] = [];
  page.on("request", (r) => {
    if (r.resourceType() === "script") scripts.push(r.url());
  });
  await mockGroq(page);
  await configure(page);
  await page.goto("/#/");
  await expect(page.getByRole("button", { name: "Gerar pacote de estudo" })).toBeVisible();
  expect(scripts.some((u) => /pdfjs|unpdf/.test(u))).toBe(false);
});
