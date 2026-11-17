import { readFileSync } from "node:fs";
import { join } from "node:path";
import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";

const WCAG = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

interface FixtureQuestion {
  stem: string;
  options: string[];
  correctIndex: number;
}
interface FixtureCard {
  front: string;
  back: string;
}
const fixture = JSON.parse(
  readFileSync(join(process.cwd(), "src/core/fixtures/study-pack.example.json"), "utf8"),
) as { title: string; questions: FixtureQuestion[]; flashcards: FixtureCard[] };

const TOTAL_Q = fixture.questions.length;
const TOTAL_C = fixture.flashcards.length;

async function audit(page: Page) {
  // Espera o fim das animações: o axe mede o contraste com a opacidade atual.
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
  const results = await new AxeBuilder({ page }).withTags(WCAG).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

async function openPack(page: Page, tab?: "flashcards" | "quiz") {
  await page.goto("/#/exemplo");
  await expect(page.getByRole("heading", { level: 1, name: fixture.title })).toBeVisible();
  if (tab) {
    await page.getByRole("tab", { name: tab === "quiz" ? "Quiz" : "Flashcards" }).click();
  }
}

function questionByStem(stem: string): FixtureQuestion {
  const q = fixture.questions.find((x) => x.stem === stem);
  if (!q) throw new Error(`Questão não encontrada: ${stem}`);
  return q;
}

async function currentQuestion(page: Page): Promise<FixtureQuestion> {
  const stem = (await page.locator("#sb-stem").textContent()) ?? "";
  return questionByStem(stem.trim());
}

/** Responde a questão atual com o mouse/toque. */
async function answer(page: Page, kind: "right" | "wrong") {
  const q = await currentQuestion(page);
  const index = kind === "right" ? q.correctIndex : (q.correctIndex + 1) % 4;
  await page.getByRole("radio", { name: q.options[index] ?? "", exact: true }).check();
  await page.getByRole("button", { name: "Responder" }).click();
  await expect(page.getByText(/^(Resposta correta|Resposta incorreta)$/).first()).toBeVisible();
}

for (const scheme of ["light", "dark"] as const) {
  test.describe(`tema ${scheme}`, () => {
    test.use({ colorScheme: scheme });

    test("resumo sem violações de acessibilidade", async ({ page }) => {
      await openPack(page);
      await expect(page.getByRole("heading", { level: 2, name: "Pontos-chave" })).toBeVisible();
      await audit(page);
    });

    test("flashcards sem violações, com o verso aberto e na tela final", async ({ page }) => {
      await openPack(page, "flashcards");
      await expect(page.getByRole("heading", { name: `Cartão 1 de ${TOTAL_C}` })).toBeVisible();
      await audit(page);

      await page.getByRole("button", { name: "Mostrar resposta" }).click();
      await expect(page.getByRole("button", { name: "Acertei" })).toBeVisible();
      await audit(page);

      for (let i = 0; i < TOTAL_C; i++) {
        await page.getByRole("button", { name: "Errei" }).click();
        if (i < TOTAL_C - 1) await page.getByRole("button", { name: "Mostrar resposta" }).click();
      }
      await expect(page.getByRole("heading", { name: "Fim dos flashcards" })).toBeVisible();
      await audit(page);
    });

    test("quiz sem violações: pergunta, respondida e resultado", async ({ page }) => {
      await openPack(page, "quiz");
      await expect(page.getByText(`Questão 1 de ${TOTAL_Q}`)).toBeVisible();
      await audit(page);

      await answer(page, "wrong");
      await audit(page);

      for (let i = 0; i < TOTAL_Q; i++) {
        await page
          .getByRole("button", { name: i === TOTAL_Q - 1 ? "Ver resultado" : "Próxima" })
          .click();
        if (i < TOTAL_Q - 1) await answer(page, "right");
      }
      await expect(page.getByRole("heading", { name: "Resultado do quiz" })).toBeVisible();
      await expect(page.getByText(`Você acertou ${TOTAL_Q - 1} de ${TOTAL_Q}`)).toBeVisible();
      await audit(page);
    });

    test("diálogo de edição sem violações", async ({ page }) => {
      await openPack(page, "quiz");
      await page.getByRole("button", { name: "Editar questão" }).click();
      await expect(page.getByRole("dialog", { name: "Editar questão" })).toBeVisible();
      await audit(page);
    });
  });
}

test("quiz completo só com o teclado, até a nota", async ({ page }) => {
  await openPack(page);
  const quizTab = page.getByRole("tab", { name: "Quiz" });
  await quizTab.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(`Questão 1 de ${TOTAL_Q}`)).toBeVisible();

  for (let i = 0; i < TOTAL_Q; i++) {
    const q = await currentQuestion(page);
    // Erra a primeira de propósito; acerta as outras.
    const index = i === 0 ? (q.correctIndex + 1) % 4 : q.correctIndex;
    const radio = page.getByRole("radio", { name: q.options[index] ?? "", exact: true });
    await radio.focus();
    await page.keyboard.press("Space");
    await expect(radio).toBeChecked();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Responder" })).toBeFocused();
    await page.keyboard.press("Enter");

    // O foco vai para o resultado; o próximo Tab chega ao botão de avançar.
    await expect(page.locator(":focus")).toContainText(/Resposta (correta|incorreta)/);
    await page.keyboard.press("Tab");
    const nextButton = page.getByRole("button", {
      name: i === TOTAL_Q - 1 ? "Ver resultado" : "Próxima",
    });
    await expect(nextButton).toBeFocused();
    await page.keyboard.press("Enter");
    if (i < TOTAL_Q - 1) {
      await expect(page.getByText(`Questão ${i + 2} de ${TOTAL_Q}`)).toBeVisible();
      // O foco vai para o enunciado da nova questão.
      await expect(page.locator("#sb-stem")).toBeFocused();
    }
  }

  await expect(page.getByRole("heading", { name: "Resultado do quiz" })).toBeFocused();
  const percent = Math.round(((TOTAL_Q - 1) / TOTAL_Q) * 100);
  await expect(
    page.getByText(`Você acertou ${TOTAL_Q - 1} de ${TOTAL_Q} (${percent}%)`),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Tentativas anteriores" })).toBeVisible();
});

test("o botão Responder fica focável e avisa que falta escolher", async ({ page }) => {
  await openPack(page, "quiz");
  const button = page.getByRole("button", { name: "Responder" });
  await expect(button).toHaveAttribute("aria-disabled", "true");
  await button.focus();
  await expect(button).toBeFocused();
  await button.click({ force: true });
  await expect(page.getByText(`Questão 1 de ${TOTAL_Q}`)).toBeVisible();
  await expect(page.getByText("Escolha uma alternativa para poder responder.")).toBeVisible();
});

test("refazer só as que errei", async ({ page }) => {
  await openPack(page, "quiz");
  await answer(page, "wrong");
  await page.getByRole("button", { name: "Próxima" }).click();
  await answer(page, "wrong");
  await page.getByRole("button", { name: "Próxima" }).click();
  for (let i = 2; i < TOTAL_Q; i++) {
    await answer(page, "right");
    await page
      .getByRole("button", { name: i === TOTAL_Q - 1 ? "Ver resultado" : "Próxima" })
      .click();
  }
  await expect(page.getByText(`Você acertou ${TOTAL_Q - 2} de ${TOTAL_Q}`)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questões que você errou" })).toBeVisible();

  await page.getByRole("button", { name: "Refazer só as que errei" }).click();
  await expect(page.getByText("Questão 1 de 2")).toBeVisible();
  await answer(page, "right");
  await page.getByRole("button", { name: "Próxima" }).click();
  await answer(page, "right");
  await page.getByRole("button", { name: "Ver resultado" }).click();
  await expect(page.getByText("Você acertou 2 de 2 (100%)")).toBeVisible();
  await expect(page.getByText("Você não errou nenhuma questão")).toBeVisible();

  // Histórico: a tentativa completa e a de refazer.
  const history = page.getByRole("region", { name: "Tentativas anteriores" });
  await expect(history.getByRole("listitem")).toHaveCount(2);
  await expect(history).toContainText("só as que errei");
  await expect(history).toContainText("quiz completo");
});

test("flashcards: mostrar, avaliar e terminar", async ({ page }) => {
  await openPack(page, "flashcards");
  const first = fixture.flashcards[0] as FixtureCard;
  await expect(page.getByText(first.front)).toBeVisible();
  await expect(page.getByText(first.back, { exact: true })).toBeHidden();

  const show = page.getByRole("button", { name: "Mostrar resposta" });
  await show.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(first.back, { exact: true })).toBeVisible();
  await expect(page.getByText(/Página de origem: 1/)).toBeVisible();

  await page.getByRole("button", { name: "Errei" }).click();
  await expect(page.getByRole("heading", { name: `Cartão 2 de ${TOTAL_C}` })).toBeVisible();
  await expect(page.locator("div[tabindex='-1']").first()).toBeFocused();

  for (let i = 1; i < TOTAL_C; i++) {
    await page.getByRole("button", { name: "Mostrar resposta" }).click();
    await page.getByRole("button", { name: "Acertei" }).click();
  }
  await expect(page.getByRole("heading", { name: "Fim dos flashcards" })).toBeFocused();
  await expect(page.getByText(`Você acertou ${TOTAL_C - 1} de ${TOTAL_C}`)).toBeVisible();

  // Volta ao resumo e reabre: oferece rever só o que errou.
  await page.getByRole("tab", { name: "Resumo" }).click();
  await page.getByRole("tab", { name: "Flashcards" }).click();
  await page.getByRole("button", { name: /Rever só os que errei da última vez/ }).click();
  await expect(page.getByRole("heading", { name: "Cartão 1 de 1" })).toBeVisible();
  await expect(page.getByText(first.front)).toBeVisible();
  await page.getByRole("button", { name: "Mostrar resposta" }).click();
  await page.getByRole("button", { name: "Acertei" }).click();
  await expect(page.getByText("Você acertou 1 de 1")).toBeVisible();
  await expect(page.getByRole("button", { name: "Rever os que errei" })).toHaveCount(0);
  await page.getByRole("button", { name: "Recomeçar" }).click();
  await expect(page.getByRole("heading", { name: `Cartão 1 de ${TOTAL_C}` })).toBeVisible();
});

test("editar um flashcard persiste ao trocar de aba", async ({ page }) => {
  await openPack(page, "flashcards");
  await page.getByRole("button", { name: "Editar cartão" }).click();
  const dialog = page.getByRole("dialog", { name: "Editar flashcard" });
  await expect(dialog).toBeVisible();

  // Campo vazio não passa.
  await dialog.getByLabel("Frente (pergunta)").fill("");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog.getByText("Preencha este campo.")).toBeVisible();

  await dialog.getByLabel("Frente (pergunta)").fill("Pergunta editada pelo estudante?");
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText("Pergunta editada pelo estudante?")).toBeVisible();

  await page.getByRole("tab", { name: "Quiz" }).click();
  await page.getByRole("tab", { name: "Flashcards" }).click();
  await expect(page.getByText("Pergunta editada pelo estudante?")).toBeVisible();
});

test("excluir uma questão", async ({ page }) => {
  await openPack(page, "quiz");
  const stem = ((await page.locator("#sb-stem").textContent()) ?? "").trim();
  await page.getByRole("button", { name: "Excluir questão" }).click();
  const dialog = page.getByRole("dialog", { name: "Excluir esta questão?" });
  await expect(dialog).toBeVisible();

  // Cancelar não exclui.
  await dialog.getByRole("button", { name: "Cancelar" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Questão 1 de ${TOTAL_Q}`)).toBeVisible();

  await page.getByRole("button", { name: "Excluir questão" }).click();
  await dialog.getByRole("button", { name: "Excluir", exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByText(`Questão 1 de ${TOTAL_Q - 1}`)).toBeVisible();

  // Continua excluída depois de trocar de aba.
  await page.getByRole("tab", { name: "Resumo" }).click();
  await page.getByRole("tab", { name: "Quiz" }).click();
  await expect(page.getByText(`Questão 1 de ${TOTAL_Q - 1}`)).toBeVisible();
  await expect(page.getByText(stem, { exact: true })).toHaveCount(0);
});

test("não há rolagem horizontal em 320 px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  const overflow = () =>
    page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );

  await openPack(page);
  expect(await overflow()).toBe(false);

  await page.getByRole("tab", { name: "Flashcards" }).click();
  await page.getByRole("button", { name: "Mostrar resposta" }).click();
  expect(await overflow()).toBe(false);

  await page.getByRole("tab", { name: "Quiz" }).click();
  await answer(page, "wrong");
  expect(await overflow()).toBe(false);
});

test("pacote inexistente mostra aviso com link para o início", async ({ page }) => {
  await page.goto("/#/pacote/nao-existe");
  await expect(
    page.getByRole("heading", { level: 1, name: "Pacote não encontrado" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Voltar ao início" })).toHaveAttribute("href", "#/");
});

test("baixar o arquivo e copiar o link", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]).catch(() => undefined);
  await openPack(page);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Baixar arquivo" }).click();
  expect((await download).suggestedFilename().length).toBeGreaterThan(0);
  await expect(page.getByText("Arquivo baixado.")).toBeVisible();
  await expect(page.getByText(/Suas notas e seu histórico/)).toBeVisible();
  await expect(page.getByText(/Links muito longos/)).toBeVisible();
});
