import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import type { Plugin, ResolvedConfig } from "vite";

/** Fora do pré-cache: o service worker, cabeçalhos, fonte dos ícones e o leitor de PDF (pesado). */
const EXCLUDED = [/^sw\.js$/, /^_headers$/, /^icons\/maskable\.svg$/, /(^|\/)pdfjs[^/]*\.js$/];

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)],
  );
}

/** Gera dist/sw.js com a lista de arquivos do build e um cache versionado pelo conteúdo. */
export function pwaPlugin(): Plugin {
  let config: ResolvedConfig;
  return {
    name: "studybuddy-pwa",
    apply: "build",
    configResolved(c) {
      config = c;
    },
    writeBundle() {
      const out = resolve(config.root, config.build.outDir);
      const files = walk(out)
        .map((f) => relative(out, f).split("\\").join("/"))
        .filter((f) => !EXCLUDED.some((re) => re.test(f)))
        .sort();
      const hash = createHash("sha256");
      for (const f of files) hash.update(f).update(readFileSync(join(out, f)));
      const version = hash.digest("hex").slice(0, 10);
      // "./" cobre a navegação para a raiz; os demais caminhos são relativos ao escopo.
      const precache = ["./", ...files];
      const template = readFileSync(resolve(config.root, "scripts/sw-template.js"), "utf8");
      const sw = template
        .replace('"__CACHE__"', () => JSON.stringify(`studybuddy-${version}`))
        .replace("__PRECACHE__", () => JSON.stringify(precache, null, 2));
      writeFileSync(join(out, "sw.js"), sw);
    },
  };
}
