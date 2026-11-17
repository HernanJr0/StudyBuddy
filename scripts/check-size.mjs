// Confere o orçamento de JavaScript da primeira carga (SPEC 7.1).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { gzipSync } from "node:zlib";

const BUDGET_KB = 80;
const dist = resolve(process.argv[2] ?? "dist");
const html = readFileSync(resolve(dist, "index.html"), "utf8");

// Só o que o index.html carrega de início: scripts e modulepreload.
const files = new Set();
for (const m of html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)) files.add(m[1]);
for (const m of html.matchAll(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+\.js)"/g))
  files.add(m[1]);

let total = 0;
for (const f of files) {
  const size = gzipSync(readFileSync(resolve(dist, `.${f}`))).length;
  total += size;
  console.log(`${(size / 1024).toFixed(1).padStart(7)} KB  ${f}`);
}
const kb = total / 1024;
console.log(`${kb.toFixed(1).padStart(7)} KB  total (limite: ${BUDGET_KB} KB, gzip)`);
if (kb > BUDGET_KB) {
  console.error("Orçamento de JavaScript inicial estourado.");
  process.exit(1);
}
