// @vitest-environment node
import { deflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { PACK_VERSION } from "../core";
import { examplePack } from "../core/fixtures";
import { flashcardsToAnkiCsv } from "./anki";
import { packFromFile, packFromLinkPayload, packToFile, packToLink } from "./share";

const BASE = "https://exemplo.github.io/studybuddy/";

function payloadOf(link: string): string {
  return link.slice(link.indexOf("#/abrir/") + "#/abrir/".length);
}

function encode(json: string, prefix = "1"): string {
  return `${prefix}.${deflateRawSync(Buffer.from(json)).toString("base64url")}`;
}

describe("arquivo", () => {
  it("ida e volta", async () => {
    const { blob, fileName } = packToFile(examplePack);
    expect(blob.type).toBe("application/json");
    expect(fileName).toMatch(/^[a-z0-9-]+\.studybuddy\.json$/);
    expect(await packFromFile(blob)).toEqual(examplePack);
  });

  it("recusa arquivo maior que 2 MB", async () => {
    const big = new Blob([" ".repeat(2 * 1024 * 1024 + 1)]);
    await expect(packFromFile(big)).rejects.toMatchObject({ code: "share/invalid" });
  });

  it("recusa JSON inválido e fora do esquema", async () => {
    await expect(packFromFile(new Blob(["{oops"]))).rejects.toMatchObject({
      code: "share/invalid",
    });
    await expect(packFromFile(new Blob(["[]"]))).rejects.toMatchObject({ code: "share/invalid" });
    const bad = JSON.stringify({ ...examplePack, flashcards: "x" });
    await expect(packFromFile(new Blob([bad]))).rejects.toMatchObject({ code: "share/invalid" });
  });

  it("versão futura vira share/too-new", async () => {
    const future = JSON.stringify({ ...examplePack, version: PACK_VERSION + 1, novo: true });
    await expect(packFromFile(new Blob([future]))).rejects.toMatchObject({ code: "share/too-new" });
  });
});

describe("link", () => {
  it("ida e volta idêntica", async () => {
    const link = await packToLink(examplePack, BASE);
    expect(link.startsWith(`${BASE}#/abrir/1.`)).toBe(true);
    expect(link).toMatch(/^[^#]+#\/abrir\/1\.[A-Za-z0-9_-]+$/);
    expect(await packFromLinkPayload(payloadOf(link))).toEqual(examplePack);
  });

  it("preserva ids fora do padrão", async () => {
    const custom = {
      ...examplePack,
      flashcards: examplePack.flashcards.map((c, i) => (i === 1 ? { ...c, id: "meu-id" } : c)),
    };
    const back = await packFromLinkPayload(payloadOf(await packToLink(custom, BASE)));
    expect(back).toEqual(custom);
  });

  it("tamanho do link do pacote de exemplo", async () => {
    const link = await packToLink(examplePack, BASE);
    console.log(`link do examplePack: ${link.length} caracteres`);
    expect(link.length).toBeLessThan(JSON.stringify(examplePack).length);
  });

  it("link adulterado vira share/invalid", async () => {
    const payload = payloadOf(await packToLink(examplePack, BASE));
    const tampered = `${payload.slice(0, 20)}${payload[20] === "A" ? "B" : "A"}${payload.slice(21, -5)}`;
    await expect(packFromLinkPayload(tampered)).rejects.toMatchObject({ code: "share/invalid" });
    await expect(packFromLinkPayload("1.@@@")).rejects.toMatchObject({ code: "share/invalid" });
    await expect(packFromLinkPayload("semprefixo")).rejects.toMatchObject({
      code: "share/invalid",
    });
    await expect(packFromLinkPayload("")).rejects.toMatchObject({ code: "share/invalid" });
  });

  it("conteúdo fora do esquema vira share/invalid", async () => {
    await expect(packFromLinkPayload(encode('{"title":"x"}'))).rejects.toMatchObject({
      code: "share/invalid",
    });
    await expect(packFromLinkPayload(encode("nao-json"))).rejects.toMatchObject({
      code: "share/invalid",
    });
  });

  it("prefixo desconhecido vira share/too-new", async () => {
    const payload = payloadOf(await packToLink(examplePack, BASE));
    await expect(packFromLinkPayload(`2${payload.slice(1)}`)).rejects.toMatchObject({
      code: "share/too-new",
    });
  });

  it("recusa conteúdo descomprimido acima de 2 MB", async () => {
    const bomb = encode(JSON.stringify({ lixo: "a".repeat(3 * 1024 * 1024) }));
    expect(bomb.length).toBeLessThan(100_000);
    await expect(packFromLinkPayload(bomb)).rejects.toMatchObject({ code: "share/invalid" });
  });
});

describe("CSV do Anki", () => {
  const card = (i: number) => {
    const c = examplePack.flashcards[i];
    if (!c) throw new Error("fixture sem cartão");
    return c;
  };
  const pack = {
    ...examplePack,
    title: "Cálculo: Limites & Derivadas",
    flashcards: [
      {
        ...card(0),
        front: 'O que é "limite"?',
        back: "Valor; aproximação\nem duas linhas",
        page: 3,
      },
      {
        ...card(1),
        front: "Função é contínua?",
        back: "Sim, ação é coração",
        page: 12,
      },
    ],
  };

  it("gera cabeçalhos, BOM, aspas duplicadas e quebras internas", async () => {
    const { blob, fileName } = flashcardsToAnkiCsv(pack);
    expect(fileName).toBe("calculo-limites-derivadas-anki.csv");
    expect(blob.type).toContain("text/csv");
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect(text).toBe(
      [
        "﻿#separator:Semicolon",
        "#html:false",
        "#tags column:3",
        '"O que é ""limite""?";"Valor; aproximação\nem duas linhas";"studybuddy p3"',
        '"Função é contínua?";"Sim, ação é coração";"studybuddy p12"',
        "",
      ].join("\n"),
    );
  });

  it("usa nome padrão para título sem letras", () => {
    expect(flashcardsToAnkiCsv({ ...pack, title: "???" }).fileName).toBe("pacote-anki.csv");
  });
});
