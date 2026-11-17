/** Apoio aos testes: fetch simulado e conteúdo de exemplo. Não é importado pelo app. */
import { vi } from "vitest";
import { examplePack } from "../core/fixtures";

export const contentJson = {
  title: examplePack.title,
  summary: examplePack.summary,
  flashcards: examplePack.flashcards.map(({ id: _i, verified: _v, ...c }) => c),
  questions: examplePack.questions.map(({ id: _i, verified: _v, ...q }) => q),
};

export const contentText = JSON.stringify(contentJson);

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export type Call = { url: string; init: RequestInit; body: Record<string, unknown> | undefined };

/** Instala um fetch simulado que responde em sequência e registra as chamadas. */
export function stubFetch(responses: Array<Response | Error | ((c: Call) => Response)>) {
  const calls: Call[] = [];
  let i = 0;
  const fn = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const body =
      typeof init?.body === "string"
        ? (JSON.parse(init.body) as Record<string, unknown>)
        : undefined;
    const call: Call = { url: String(url), init: init ?? {}, body };
    calls.push(call);
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    if (typeof r === "function") return r(call);
    if (!r) throw new Error("sem resposta simulada");
    return r.clone();
  });
  vi.stubGlobal("fetch", fn);
  return { calls, fn };
}

export function header(call: Call, name: string): string | undefined {
  const h = call.init.headers as Record<string, string> | undefined;
  if (!h) return undefined;
  const key = Object.keys(h).find((k) => k.toLowerCase() === name.toLowerCase());
  return key ? h[key] : undefined;
}
