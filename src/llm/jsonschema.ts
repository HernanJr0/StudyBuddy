/**
 * Adapta o JSON Schema do conteúdo gerado ao subconjunto aceito por cada
 * protocolo. A validação de verdade é feita depois, pelo Zod.
 */
import type { Protocol } from "../core";
import { generatedContentJsonSchema } from "../core";

type Json = Record<string, unknown>;

interface Rules {
  /** Palavras-chave removidas. */
  strip: readonly string[];
  /** minItems só é mantido se for 0 ou 1 (Anthropic). */
  minItemsAtMostOne?: boolean;
  /** Todo objeto fica com additionalProperties:false e todos os campos em required. */
  strictObjects?: boolean;
}

/*
 * Fontes (conferidas em 2026-11):
 * - Gemini (campo generationConfig.responseJsonSchema): aceita minItems/maxItems;
 *   minLength/maxLength são ignorados, então saem.
 * - OpenAI strict: additionalProperties:false e tudo em required; restrições de
 *   tamanho/valor saem por segurança (provedores compatíveis aceitam menos ainda).
 * - Anthropic (output_config.format): sem minLength/maxLength, minimum/maximum
 *   nem maxItems; minItems só 0 ou 1.
 */
const RULES: Record<Protocol, Rules> = {
  gemini: { strip: ["$schema", "minLength", "maxLength"] },
  openai: {
    strip: ["$schema", "minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum"],
    strictObjects: true,
  },
  anthropic: {
    strip: ["$schema", "minLength", "maxLength", "maxItems", "minimum", "maximum"],
    minItemsAtMostOne: true,
    strictObjects: true,
  },
};

function walk(node: unknown, rules: Rules): unknown {
  if (Array.isArray(node)) return node.map((n) => walk(n, rules));
  if (node === null || typeof node !== "object") return node;
  const out: Json = {};
  for (const [k, v] of Object.entries(node as Json)) {
    if (rules.strip.includes(k)) continue;
    if (k === "minItems" && rules.minItemsAtMostOne && typeof v === "number" && v > 1) continue;
    // "properties" é um mapa de nomes de campo: não filtra os nomes, só os valores.
    if (k === "properties" && v !== null && typeof v === "object") {
      out[k] = Object.fromEntries(
        Object.entries(v as Json).map(([name, sub]) => [name, walk(sub, rules)]),
      );
    } else {
      out[k] = walk(v, rules);
    }
  }
  if (rules.strictObjects && out.type === "object" && out.properties) {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as Json);
  }
  return out;
}

/** Esquema do conteúdo gerado, ajustado ao protocolo. */
export function schemaFor(protocol: Protocol): Json {
  return walk(generatedContentJsonSchema(), RULES[protocol]) as Json;
}

/** Esquema completo, em texto compacto, para descrever no prompt. */
export function schemaText(): string {
  return JSON.stringify(generatedContentJsonSchema());
}
