import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const EXAMPLE_PATH = "src/core/fixtures/study-pack.example.json";
const EXAMPLE = JSON.parse(readFileSync(EXAMPLE_PATH, "utf8"));
const EXAMPLE_TITLE: string = EXAMPLE.title;

/** O que um provedor devolveria: o pacote de exemplo sem ids, com tudo na página 1. */
const GENERATED = JSON.stringify({
  title: EXAMPLE.title,
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

/**
 * Simula provedores do protocolo OpenAI (Groq e OpenRouter): nenhum teste
 * chama a rede de verdade nem usa chave real.
 */
async function mockProviders(page: Page, delayMs = 0) {
  await page.route(
    /^https:\/\/(api\.groq\.com\/openai|openrouter\.ai\/api)\/v1\//,
    async (route) => {
      const request = route.request();
      if (request.method() === "OPTIONS") {
        await route.fulfill({ status: 204, headers: CORS });
        return;
      }
      const json = (body: unknown) =>
        route.fulfill({
          status: 200,
          headers: { ...CORS, "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      try {
        if (request.url().endsWith("/models")) {
          await json({ data: [{ id: "modelo-a" }, { id: "modelo-b" }] });
          return;
        }
        const isPing =
          (request.postDataJSON() as { max_completion_tokens?: number }).max_completion_tokens ===
          16;
        if (!isPing && delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
        await json({ choices: [{ message: { content: isPing ? "ok" : GENERATED } }] });
      } catch {
        // A página cancelou a chamada: não há mais a quem responder.
      }
    },
  );
}
const MATERIAL =
  "A fotossíntese é o processo pelo qual plantas, algas e algumas bactérias transformam luz, água e gás carbônico em glicose e oxigênio. " +
  "Ela acontece nos cloroplastos, que contêm clorofila, o pigmento que absorve a luz. " +
  "A etapa clara depende da luz e produz energia química; a etapa escura usa essa energia para fixar o carbono.";

async function audit(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function open(page: Page, hash: string) {
  await page.goto(`/${hash}`);
  await expect(page.locator("main")).toBeVisible();
}

/** Configura um provedor pela própria interface (sem depender de dados prévios). */
async function configure(page: Page, provider = "groq") {
  await mockProviders(page);
  await open(page, "#/configuracoes");
  await page.getByLabel("Provedor", { exact: true }).selectOption(provider);
  await page.getByLabel("Chave de API", { exact: true }).fill("chave-de-teste-123");
  await page.getByLabel("Nome do modelo").fill("modelo-de-exemplo");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configurações salvas neste aparelho.")).toBeVisible();
}

async function fillText(page: Page) {
  await page.getByRole("radio", { name: "Colar texto" }).check();
  await page.getByLabel("Texto do material").fill(MATERIAL);
}

const ROUTES_TO_AUDIT: Array<[string, string]> = [
  ["início", "#/"],
  ["configurações", "#/configuracoes"],
  ["histórico", "#/historico"],
  ["uso responsável", "#/uso-responsavel"],
  ["privacidade", "#/privacidade"],
  ["sobre", "#/sobre"],
  ["não encontrada", "#/nao-existe"],
  ["componentes base", "#/kit"],
];

for (const scheme of ["light", "dark"] as const) {
  test.describe(`acessibilidade, tema ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    for (const [name, hash] of ROUTES_TO_AUDIT) {
      test(`${name} sem violações`, async ({ page }) => {
        await open(page, hash);
        await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
        await audit(page);
      });
    }

    test("início com formulário e diálogo de consentimento", async ({ page }) => {
      await configure(page, "openrouter");
      await open(page, "#/");
      await expect(page.getByRole("button", { name: "Gerar pacote de estudo" })).toBeVisible();
      await audit(page);
      await fillText(page);
      await audit(page);
      await page.getByRole("button", { name: "Gerar pacote de estudo" }).click();
      await expect(
        page.getByRole("dialog", { name: "Antes de enviar o seu material" }),
      ).toBeVisible();
      await audit(page);
    });

    test("configurações com provedor personalizado e diálogo", async ({ page }) => {
      await open(page, "#/configuracoes");
      await page.getByLabel("Provedor", { exact: true }).selectOption("custom");
      await expect(page.getByLabel("Endereço da API")).toBeVisible();
      await audit(page);
      await page.getByRole("button", { name: "Apagar minha chave" }).click();
      await expect(page.getByRole("dialog", { name: "Apagar a chave de API?" })).toBeVisible();
      await audit(page);
    });
  });
}

test("o salto para o conteúdo e a navegação movem o foco para o main", async ({ page }) => {
  await open(page, "#/");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: "Pular para o conteúdo" });
  await expect(skip).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("main")).toBeFocused();

  const nav = page.getByRole("navigation", { name: "Principal" });
  await nav.getByRole("link", { name: "Configurações" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { level: 1, name: "Configurações" })).toBeVisible();
  await expect(page.locator("main")).toBeFocused();
  await expect(page).toHaveTitle("Configurações · StudyBuddy");
  await expect(nav.getByRole("link", { name: "Configurações" })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "Privacidade" }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveTitle("Privacidade · StudyBuddy");
  await expect(page.locator("main")).toBeFocused();
});

test("configura o provedor: busca modelos, testa a conexão e salva", async ({ page }) => {
  await mockProviders(page);
  await open(page, "#/configuracoes");
  await page.getByLabel("Provedor", { exact: true }).selectOption("openrouter");

  const key = page.getByLabel("Chave de API", { exact: true });
  await expect(key).toHaveAttribute("type", "password");
  await key.fill("chave-de-teste-123");
  await page.getByRole("button", { name: "Mostrar" }).click();
  await expect(key).toHaveAttribute("type", "text");
  await page.getByRole("button", { name: "Ocultar" }).click();
  await expect(key).toHaveAttribute("type", "password");

  const create = page.getByRole("link", { name: /Criar uma chave/ });
  await expect(create).toHaveAttribute("target", "_blank");
  await expect(create).toHaveAttribute("rel", /noopener/);
  await expect(create).toHaveAttribute("rel", /noreferrer/);
  await expect(create).toContainText("abre em nova aba");
  await expect(page.getByText("Tem nível gratuito")).toBeVisible();
  await expect(page.getByText("revisores humanos podem ler").first()).toBeVisible();
  await expect(page.getByText(/idade mínima/)).toBeVisible();

  await page.getByRole("button", { name: "Buscar modelos" }).click();
  await expect(page.getByLabel("Modelos encontrados")).toBeVisible();
  await expect(page.getByLabel("Nome do modelo")).not.toHaveValue("");

  await page.getByRole("button", { name: "Testar conexão" }).click();
  await expect(page.getByText("Conexão funcionando")).toBeVisible();

  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configurações salvas neste aparelho.")).toBeVisible();
});

test("configurações validam campos e apagam a chave", async ({ page }) => {
  await mockProviders(page);
  await open(page, "#/configuracoes");
  await page.getByRole("button", { name: "Buscar modelos" }).click();
  const key = page.getByLabel("Chave de API", { exact: true });
  await expect(key).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Informe a chave de API.")).toBeVisible();

  await key.fill("chave-de-teste-123");
  await page.getByLabel("Nome do modelo").fill("modelo-de-exemplo");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Configurações salvas neste aparelho.")).toBeVisible();

  await page.getByRole("button", { name: "Apagar minha chave" }).click();
  const dialog = page.getByRole("dialog", { name: "Apagar a chave de API?" });
  await dialog.getByRole("button", { name: "Apagar chave" }).click();
  await expect(page.getByText("Chave apagada deste aparelho.")).toBeVisible();
  await expect(key).toHaveValue("");
});

test("aparência aplica tema e tamanho do texto na hora", async ({ page }) => {
  await open(page, "#/configuracoes");
  await page.getByLabel("Tema").selectOption("dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.getByLabel("Tamanho do texto").selectOption("1.3");
  const scale = await page.evaluate(() =>
    document.documentElement.style.getPropertyValue("--sb-font-scale"),
  );
  expect(scale).toBe("1.3");
  await page.getByLabel("Tema").selectOption("system");
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
});

test("início sem provedor oferece alternativas que não exigem chave", async ({ page }) => {
  await open(page, "#/");
  await expect(page.getByText("Falta configurar a inteligência artificial")).toBeVisible();
  await expect(page.getByRole("button", { name: "Gerar pacote de estudo" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ir para Configurações" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Ver um pacote de exemplo" })).toBeVisible();
  await expect(page.getByLabel("Abrir um pacote recebido")).toBeVisible();

  await page.getByRole("link", { name: "Ver um pacote de exemplo" }).click();
  await expect(page).toHaveURL(/#\/pacote\//);
});

test("gera por texto colado, com consentimento só na primeira vez", async ({ page }) => {
  await configure(page, "openrouter");
  await open(page, "#/");

  // Validação: nada preenchido.
  const submit = page.getByRole("button", { name: "Gerar pacote de estudo" });
  await page.getByRole("radio", { name: "Colar texto" }).check();
  await submit.click();
  await expect(page.getByText("Cole o texto do material.")).toBeVisible();
  await expect(page.getByLabel("Texto do material")).toHaveAttribute("aria-invalid", "true");

  await page.getByLabel("Quantidade de flashcards").fill("2");
  await page.getByLabel("Texto do material").fill(MATERIAL);
  await submit.click();
  await expect(page.getByText("Digite um número inteiro de 5 a 30.")).toBeVisible();
  await page.getByLabel("Quantidade de flashcards").fill("6");

  // Primeira vez com o provedor: pede consentimento.
  await submit.click();
  const dialog = page.getByRole("dialog", { name: "Antes de enviar o seu material" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("OpenRouter");
  await expect(dialog).toContainText("direto do seu navegador");
  await expect(dialog).toContainText("treinar modelos");
  await dialog.getByRole("button", { name: "Entendi, continuar" }).click();
  await expect(page).toHaveURL(/#\/pacote\//, { timeout: 15_000 });
  await expect(page.locator("main")).toBeFocused();

  // Segunda vez: vai direto, sem diálogo.
  await open(page, "#/");
  await fillText(page);
  await submit.click();
  await expect(page).toHaveURL(/#\/pacote\//, { timeout: 15_000 });
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("permite cancelar a geração e mantém o formulário preenchido", async ({ page }) => {
  await configure(page, "groq");
  await mockProviders(page, 5000);
  await open(page, "#/");
  await fillText(page);
  await page.getByRole("button", { name: "Gerar pacote de estudo" }).click();
  await page
    .getByRole("dialog", { name: "Antes de enviar o seu material" })
    .getByRole("button", { name: "Entendi, continuar" })
    .click();

  const progress = page.getByRole("progressbar");
  await expect(progress).toBeVisible();
  await expect(page.getByText(/Etapa \d de 4/).first()).toBeVisible();
  await page.getByRole("button", { name: "Cancelar" }).click();

  await expect(progress).toHaveCount(0);
  await expect(page.getByRole("alert")).toHaveCount(0);
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByLabel("Texto do material")).toHaveValue(MATERIAL);
  await expect(page.getByRole("button", { name: "Gerar pacote de estudo" })).toBeEnabled();
});

test("importar um arquivo inválido mostra o erro", async ({ page }) => {
  await open(page, "#/");
  const input = page.getByLabel("Abrir um pacote recebido");
  await input.setInputFiles({
    name: "invalido.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"nada":"a ver"}'),
  });
  await expect(page.getByText("não é um pacote do StudyBuddy válido")).toBeVisible();
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page).toHaveURL(/#\/$/);
});

test("importar um pacote válido abre o pacote", async ({ page }) => {
  await open(page, "#/historico");
  await page.getByLabel("Abrir um pacote recebido").setInputFiles(EXAMPLE_PATH);
  await expect(page).toHaveURL(/#\/pacote\//);
});

test("link de compartilhamento inválido mostra erro e caminho de volta", async ({ page }) => {
  await open(page, "#/abrir/isto-nao-e-um-pacote");
  await expect(
    page.getByRole("heading", { level: 1, name: "Não foi possível abrir este link" }),
  ).toBeVisible();
  await expect(page.getByRole("alert")).toContainText("não é um pacote do StudyBuddy válido");
  await page.getByRole("link", { name: "Ir para o início" }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test("histórico lista, abre e exclui pacotes", async ({ page }) => {
  await open(page, "#/historico");
  await expect(page.getByText("Nenhum pacote ainda")).toBeVisible();
  await expect(page.getByRole("link", { name: "Gerar meu primeiro pacote" })).toBeVisible();

  await open(page, "#/exemplo");
  await expect(page).toHaveURL(/#\/pacote\//);
  await open(page, "#/historico");

  const item = page
    .getByRole("main")
    .getByRole("listitem")
    .filter({ hasText: EXAMPLE_TITLE });
  await expect(item).toBeVisible();
  await expect(item).toContainText("Recebido");
  await expect(item).toContainText(/\d+ cartões/);
  await expect(item).toContainText(/\d+ questões/);
  await audit(page);

  await item.getByRole("button", { name: /Excluir/ }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir este pacote?" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(item).toBeVisible();

  await item.getByRole("button", { name: /Excluir/ }).click();
  await dialog.getByRole("button", { name: "Excluir" }).click();
  await expect(page.getByText("Nenhum pacote ainda")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1, name: "Histórico" })).toBeFocused();
});

test("apagar todos os dados pede confirmação", async ({ page }) => {
  await open(page, "#/exemplo");
  await expect(page).toHaveURL(/#\/pacote\//);
  await open(page, "#/configuracoes");
  await page
    .getByRole("button", { name: "Apagar todos os pacotes e notas deste aparelho" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Apagar todos os pacotes e notas?" });
  await dialog.getByRole("button", { name: "Apagar tudo" }).click();
  await expect(page.getByText("Pacotes e notas apagados deste aparelho.")).toBeVisible();
  await open(page, "#/historico");
  await expect(page.getByText("Nenhum pacote ainda")).toBeVisible();
});

test("rota desconhecida mostra a página não encontrada", async ({ page }) => {
  await open(page, "#/isso-nao-existe");
  await expect(
    page.getByRole("heading", { level: 1, name: "Página não encontrada" }),
  ).toBeVisible();
  await expect(page).toHaveTitle("Página não encontrada · StudyBuddy");
  await page.getByRole("link", { name: "Ir para o início" }).click();
  await expect(page).toHaveURL(/#\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    /Seu PDF de estudo vira resumo/,
  );
});

test("rodapé leva às páginas de texto", async ({ page }) => {
  await open(page, "#/");
  const footer = page.getByRole("contentinfo");
  await expect(footer).toContainText("projeto de extensão de código aberto");
  await footer.getByRole("link", { name: "Uso responsável" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Como usar IA para estudar" }),
  ).toBeVisible();
  await footer.getByRole("link", { name: "Sobre" }).click();
  await expect(page.getByText("Victor Hugo Franco Noronha")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /github.com\/HernanJr0\/StudyBuddy/ }),
  ).toHaveAttribute("href", "https://github.com/HernanJr0/StudyBuddy");
});

test.describe("320 px", () => {
  test.use({ viewport: { width: 320, height: 640 } });

  const PAGES = [
    "#/",
    "#/configuracoes",
    "#/historico",
    "#/uso-responsavel",
    "#/privacidade",
    "#/sobre",
    "#/nao-existe",
  ];

  for (const hash of PAGES) {
    test(`sem rolagem horizontal em ${hash}`, async ({ page }) => {
      await open(page, hash);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(overflow).toBe(false);
    });
  }

  test("início com formulário cabe na tela e a navegação tem alvos de 44 px", async ({ page }) => {
    await configure(page);
    await open(page, "#/");
    await fillText(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflow).toBe(false);

    const links = page.getByRole("navigation", { name: "Principal" }).getByRole("link");
    await expect(links).toHaveCount(1);
    for (const link of await links.all()) {
      const box = await link.boundingBox();
      expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(320);
    }
  });
});
