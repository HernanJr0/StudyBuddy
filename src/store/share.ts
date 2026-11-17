/** Exportação e importação de pacotes: arquivo JSON e link comprimido. */
import { AppError, PACK_FORMAT, PACK_VERSION, type StudyPack, StudyPackSchema } from "../core";
import { slug } from "./util";

const MAX_BYTES = 2 * 1024 * 1024;
const MAX_PAYLOAD_CHARS = 3_000_000;
const CODEC = "1";

/** Valida conteúdo vindo de terceiros. */
function parsePack(value: unknown): StudyPack {
  if (
    typeof value === "object" &&
    value !== null &&
    (value as { format?: unknown }).format === PACK_FORMAT &&
    typeof (value as { version?: unknown }).version === "number" &&
    (value as { version: number }).version > PACK_VERSION
  ) {
    throw new AppError("share/too-new");
  }
  const result = StudyPackSchema.safeParse(value);
  if (!result.success) throw new AppError("share/invalid");
  return result.data;
}

export function packToFile(pack: StudyPack): { blob: Blob; fileName: string } {
  const blob = new Blob([JSON.stringify(pack)], { type: "application/json" });
  return { blob, fileName: `${slug(pack.title)}.studybuddy.json` };
}

export async function packFromFile(file: Blob): Promise<StudyPack> {
  if (file.size > MAX_BYTES) throw new AppError("share/invalid", "too-large");
  let value: unknown;
  try {
    value = JSON.parse(await file.text());
  } catch {
    throw new AppError("share/invalid");
  }
  return parsePack(value);
}

/* ---------- link ---------- */

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) throw new AppError("share/invalid");
  const binary = atob(text.replaceAll("-", "+").replaceAll("_", "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}

async function deflate(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Descomprime recusando saídas acima do limite (proteção contra bomba de descompressão). */
async function inflate(bytes: Uint8Array, limit: number): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > limit) {
      await reader.cancel().catch(() => {});
      throw new AppError("share/invalid", "too-large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

/**
 * Forma compacta: sem format/version (constantes do codec "1") e sem os ids
 * sequenciais padrão (f1, f2... / q1, q2...), que são refeitos na leitura.
 */
function compact(pack: StudyPack): unknown {
  const { format: _f, version: _v, ...rest } = pack;
  const strip = <T extends { id: string }>(items: T[], prefix: string) =>
    items.map((item, i) => {
      if (item.id !== `${prefix}${i + 1}`) return item;
      const { id: _id, ...others } = item;
      return others;
    });
  return {
    ...rest,
    flashcards: strip(pack.flashcards, "f"),
    questions: strip(pack.questions, "q"),
  };
}

function expand(value: unknown): unknown {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return value;
  const obj = value as Record<string, unknown>;
  const fill = (items: unknown, prefix: string) =>
    Array.isArray(items)
      ? items.map((item, i) =>
          typeof item === "object" && item !== null && !Array.isArray(item) && !("id" in item)
            ? { id: `${prefix}${i + 1}`, ...item }
            : item,
        )
      : items;
  return {
    ...obj,
    format: PACK_FORMAT,
    version: PACK_VERSION,
    flashcards: fill(obj.flashcards, "f"),
    questions: fill(obj.questions, "q"),
  };
}

export async function packToLink(pack: StudyPack, baseUrl: string): Promise<string> {
  try {
    const json = JSON.stringify(compact(StudyPackSchema.parse(pack)));
    const data = toBase64Url(await deflate(new TextEncoder().encode(json)));
    return `${baseUrl}#/abrir/${CODEC}.${data}`;
  } catch (e) {
    throw e instanceof AppError ? e : new AppError("share/invalid", undefined, { cause: e });
  }
}

export async function packFromLinkPayload(payload: string): Promise<StudyPack> {
  const dot = payload.indexOf(".");
  if (dot < 0 || payload.length > MAX_PAYLOAD_CHARS) throw new AppError("share/invalid");
  if (payload.slice(0, dot) !== CODEC) throw new AppError("share/too-new");
  let value: unknown;
  try {
    const raw = await inflate(fromBase64Url(payload.slice(dot + 1)), MAX_BYTES);
    value = expand(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raw)));
  } catch (e) {
    throw e instanceof AppError ? e : new AppError("share/invalid");
  }
  return parsePack(value);
}
