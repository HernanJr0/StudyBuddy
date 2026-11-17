import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, LIMITS, type ProviderConfig, StudyPackSchema } from "../core";
import { exampleDoc } from "../core/fixtures";
import { llm } from "./index";
import { type Call, contentText, header, jsonResponse, stubFetch } from "./testing";

// biome-ignore lint/suspicious/noExplicitAny: inspeção solta de corpos JSON nos testes
type Obj = Record<string, any>;

afterEach(() => vi.unstubAllGlobals());

interface Case {
  name: string;
  config: ProviderConfig;
  ok: (text: string) => unknown;
  endpoint: string;
  modelsBody: unknown;
  expectModels: string[];
  checkAuth: (c: Call) => void;
  checkStructured: (c: Call) => void;
}

const cases: Case[] = [
  {
    name: "gemini",
    config: { provider: "gemini", apiKey: "k-test", model: "gem-1" },
    ok: (text) => ({ candidates: [{ content: { parts: [{ text }] }, finishReason: "STOP" }] }),
    endpoint: "/models/gem-1:generateContent",
    modelsBody: {
      models: [
        {
          name: "models/gem-1",
          displayName: "Gem 1",
          supportedGenerationMethods: ["generateContent"],
        },
        { name: "models/gem-embedding-1", supportedGenerationMethods: ["embedContent"] },
        { name: "models/gem-2-preview", supportedGenerationMethods: ["generateContent"] },
      ],
    },
    expectModels: ["gem-1", "gem-2-preview"],
    checkAuth: (c) => expect(header(c, "x-goog-api-key")).toBe("k-test"),
    checkStructured: (c) => {
      const gc = c.body?.generationConfig as Record<string, unknown>;
      expect(gc.responseMimeType).toBe("application/json");
      const schema = gc.responseJsonSchema as Record<string, unknown>;
      expect(JSON.stringify(schema)).not.toContain("maxLength");
      expect(schema.$schema).toBeUndefined();
    },
  },
  {
    name: "openai",
    config: { provider: "openai", apiKey: "k-test", model: "m-1" },
    ok: (text) => ({ choices: [{ message: { content: text }, finish_reason: "stop" }] }),
    endpoint: "/chat/completions",
    modelsBody: { data: [{ id: "m-1" }, { id: "text-embedding-3" }, { id: "m-2" }] },
    expectModels: ["m-2", "m-1"],
    checkAuth: (c) => expect(header(c, "authorization")).toBe("Bearer k-test"),
    checkStructured: (c) => {
      const rf = c.body?.response_format as Obj;
      expect(rf.type).toBe("json_schema");
      expect(rf.json_schema.strict).toBe(true);
      expect(rf.json_schema.schema.additionalProperties).toBe(false);
      expect(rf.json_schema.schema.required).toContain("flashcards");
      expect(JSON.stringify(rf.json_schema.schema)).not.toContain("minItems");
    },
  },
  {
    name: "anthropic",
    config: { provider: "anthropic", apiKey: "k-test", model: "cl-1" },
    ok: (text) => ({ stop_reason: "end_turn", content: [{ type: "text", text }] }),
    endpoint: "/messages",
    modelsBody: {
      data: [
        { id: "cl-1", display_name: "Claude 1" },
        { id: "cl-2", display_name: "Claude 2" },
      ],
    },
    expectModels: ["cl-2", "cl-1"],
    checkAuth: (c) => {
      expect(header(c, "x-api-key")).toBe("k-test");
      expect(header(c, "anthropic-version")).toBeTruthy();
      expect(header(c, "anthropic-dangerous-direct-browser-access")).toBe("true");
    },
    checkStructured: (c) => {
      const fmt = ((c.body?.output_config ?? {}) as Obj).format;
      expect(fmt.type).toBe("json_schema");
      const s = JSON.stringify(fmt.schema);
      expect(s).not.toContain("maxItems");
      expect(s).not.toContain("minLength");
      expect(c.body?.max_tokens).toBeGreaterThan(1000);
    },
  },
];

const options = { flashcards: 3, questions: 2 };

async function code(p: Promise<unknown>): Promise<string> {
  try {
    await p;
  } catch (e) {
    return e instanceof AppError ? e.code : `other:${String(e)}`;
  }
  return "no-error";
}

describe.each(cases)("adaptador $name", (c) => {
  it("gera o pacote, verifica as origens e informa o progresso", async () => {
    const { calls } = stubFetch([jsonResponse(c.ok(contentText))]);
    const stages: string[] = [];
    const pack = await llm.generateStudyPack(exampleDoc, options, c.config, {
      onProgress: (s) => stages.push(s),
    });
    expect(StudyPackSchema.safeParse(pack).success).toBe(true);
    expect(pack.flashcards).toHaveLength(3);
    expect(pack.questions).toHaveLength(2);
    expect(pack.flashcards.every((f) => f.verified)).toBe(true);
    expect(pack.source.provider).toBe(c.config.provider);
    expect(stages).toEqual(["preparing", "requesting", "validating", "verifying", "done"]);
    expect(calls).toHaveLength(1);
    const call = calls[0] as Call;
    expect(call.url).toContain(c.endpoint);
    c.checkAuth(call);
    c.checkStructured(call);
    expect(JSON.stringify(call.body)).toContain("[Página 1]");
  });

  it("lista só modelos de texto, mais indicados primeiro", async () => {
    stubFetch([jsonResponse(c.modelsBody)]);
    const { model: _m, ...rest } = c.config;
    const models = await llm.listModels(rest);
    expect(models.map((m) => m.id)).toEqual(c.expectModels);
  });

  it("testConnection passa com resposta 200", async () => {
    stubFetch([jsonResponse(c.ok("ok"))]);
    await expect(llm.testConnection(c.config)).resolves.toBeUndefined();
  });

  it.each([
    [401, "llm/invalid-key"],
    [403, "llm/invalid-key"],
    [429, "llm/quota"],
    [404, "llm/model-not-found"],
    [413, "llm/too-long"],
    [500, "llm/unknown"],
  ])("HTTP %i vira %s", async (status, expected) => {
    stubFetch([jsonResponse({ error: { message: "x" } }, status)]);
    const p = llm.generateStudyPack(exampleDoc, options, c.config);
    expect(await code(p)).toBe(expected);
  });

  it("400 por tamanho de contexto vira llm/too-long, sem vazar o corpo", async () => {
    stubFetch([jsonResponse({ error: { message: "Request exceeds the context window" } }, 400)]);
    const err = await llm.testConnection(c.config).catch((e: AppError) => e);
    expect((err as AppError).code).toBe("llm/too-long");
    expect(String((err as AppError).message)).not.toContain("context window");
  });

  it("recusa do provedor vira llm/blocked", async () => {
    const body =
      c.name === "gemini"
        ? { promptFeedback: { blockReason: "SAFETY" } }
        : c.name === "openai"
          ? { choices: [{ message: { content: null, refusal: "no" } }] }
          : { stop_reason: "refusal", content: [] };
    stubFetch([jsonResponse(body)]);
    expect(await code(llm.generateStudyPack(exampleDoc, options, c.config))).toBe("llm/blocked");
  });

  it("falha de rede (TypeError) vira llm/network", async () => {
    stubFetch([new TypeError("Failed to fetch")]);
    expect(await code(llm.generateStudyPack(exampleDoc, options, c.config))).toBe("llm/network");
  });

  it("JSON inválido seguido de sucesso: tenta de novo uma vez", async () => {
    const { calls } = stubFetch([
      jsonResponse(c.ok("isto não é json")),
      jsonResponse(c.ok(contentText)),
    ]);
    const pack = await llm.generateStudyPack(exampleDoc, options, c.config);
    expect(pack.flashcards.length).toBeGreaterThan(0);
    expect(calls).toHaveLength(2);
  });

  it("aceita JSON dentro de cerca de código", async () => {
    stubFetch([jsonResponse(c.ok(`\`\`\`json\n${contentText}\n\`\`\``))]);
    const pack = await llm.generateStudyPack(exampleDoc, options, c.config);
    expect(pack.questions).toHaveLength(2);
  });

  it("JSON inválido duas vezes vira llm/invalid-response", async () => {
    const { calls } = stubFetch([jsonResponse(c.ok("{}"))]);
    expect(await code(llm.generateStudyPack(exampleDoc, options, c.config))).toBe(
      "llm/invalid-response",
    );
    expect(calls).toHaveLength(2);
  });

  it("cancelamento durante a chamada vira llm/cancelled", async () => {
    const ctrl = new AbortController();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        (_u: string, init: RequestInit) =>
          new Promise((_res, rej) => {
            init.signal?.addEventListener("abort", () =>
              rej(new DOMException("aborted", "AbortError")),
            );
          }),
      ),
    );
    const p = llm.generateStudyPack(exampleDoc, options, c.config, { signal: ctrl.signal });
    setTimeout(() => ctrl.abort(), 5);
    expect(await code(p)).toBe("llm/cancelled");
  });

  it("sinal já cancelado não chama a rede", async () => {
    const { fn } = stubFetch([jsonResponse(c.ok(contentText))]);
    const ctrl = new AbortController();
    ctrl.abort();
    expect(
      await code(llm.generateStudyPack(exampleDoc, options, c.config, { signal: ctrl.signal })),
    ).toBe("llm/cancelled");
    expect(fn).not.toHaveBeenCalled();
  });

  it("material acima do limite falha antes de chamar", async () => {
    const { fn } = stubFetch([jsonResponse(c.ok(contentText))]);
    const big = { ...exampleDoc, charCount: LIMITS.maxChars + 1 };
    expect(await code(llm.generateStudyPack(big, options, c.config))).toBe("llm/too-long");
    expect(fn).not.toHaveBeenCalled();
  });

  it("a chave não aparece nas mensagens de erro", async () => {
    stubFetch([jsonResponse({ error: { message: "bad key k-test" } }, 401)]);
    const err = await llm
      .generateStudyPack(exampleDoc, options, c.config)
      .catch((e: AppError) => e);
    expect(JSON.stringify([(err as AppError).message, (err as AppError).detail])).not.toContain(
      "k-test",
    );
  });
});

describe("protocolo OpenAI: response_format", () => {
  const config: ProviderConfig = { provider: "groq", apiKey: "k-test", model: "m" };

  it("repete com json_object quando o provedor recusa json_schema", async () => {
    const ok = { choices: [{ message: { content: contentText } }] };
    const { calls } = stubFetch([
      jsonResponse(
        { error: { message: "'response_format' of type 'json_schema' is not supported" } },
        400,
      ),
      jsonResponse(ok),
    ]);
    const pack = await llm.generateStudyPack(exampleDoc, options, config);
    expect(pack.flashcards).toHaveLength(3);
    expect(calls).toHaveLength(2);
    const second = calls[1]?.body as Obj;
    expect(second.response_format).toEqual({ type: "json_object" });
    expect(JSON.stringify(second.messages)).toContain("JSON Schema");
  });

  it("um 400 sem relação com o formato não dispara o fallback", async () => {
    const { calls } = stubFetch([jsonResponse({ error: { message: "bad request" } }, 400)]);
    expect(await code(llm.generateStudyPack(exampleDoc, options, config))).toBe("llm/unknown");
    expect(calls).toHaveLength(1);
  });

  it("endereço livre sem chave omite Authorization e exige endereço", async () => {
    const custom: ProviderConfig = {
      provider: "custom",
      apiKey: "",
      model: "local",
      baseUrl: "http://localhost:1234/v1/",
    };
    const { calls } = stubFetch([
      jsonResponse({ choices: [{ message: { content: contentText } }] }),
    ]);
    await llm.generateStudyPack(exampleDoc, options, custom);
    const call = calls[0] as Call;
    expect(call.url).toBe("http://localhost:1234/v1/chat/completions");
    expect(header(call, "authorization")).toBeUndefined();
    expect(await code(llm.testConnection({ ...custom, baseUrl: "" }))).toBe("llm/no-config");
  });
});

describe("protocolo Anthropic: modelo sem saída estruturada", () => {
  it("repete sem output_config quando o provedor recusa o formato", async () => {
    const config: ProviderConfig = { provider: "anthropic", apiKey: "k", model: "old" };
    const ok = { content: [{ type: "text", text: contentText }] };
    const { calls } = stubFetch([
      jsonResponse({ error: { message: "output_config.format json_schema not supported" } }, 400),
      jsonResponse(ok),
    ]);
    await llm.generateStudyPack(exampleDoc, options, config);
    expect(calls).toHaveLength(2);
    expect(calls[1]?.body?.output_config).toBeUndefined();
  });
});
