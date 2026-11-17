import { describe, expect, it } from "vitest";
import { AppError } from "./errors";
import { defineMessages, plural } from "./i18n";
import { errorMessage } from "./messages";

describe("textos", () => {
  it("substitui parâmetros e preserva os ausentes", () => {
    const t = defineMessages({ a: "Página {n} de {total}" });
    expect(t("a", { n: 2 })).toBe("Página 2 de {total}");
  });

  it("plural", () => {
    expect(plural(1, "questão", "questões")).toBe("1 questão");
    expect(plural(3, "questão", "questões")).toBe("3 questões");
  });

  it("mensagens de erro usam os limites do contrato", () => {
    expect(errorMessage(new AppError("pdf/too-large"))).toContain("10 MB");
    expect(errorMessage(new AppError("pdf/too-many-pages"), { pages: 45 })).toContain(
      "45 páginas e o limite é 30",
    );
  });
});
