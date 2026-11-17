// Gera os PDFs de teste: node src/pdf/fixtures/make-fixtures.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const dir = dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage();
const style = "<style>body{font:14px sans-serif}section{page-break-after:always}</style>";
const opts = { format: "A4" };

const textos = [
  "A fotossíntese é o processo pelo qual as plantas convertem luz em energia química. Ocorre nos cloroplastos, onde a clorofila absorve a luz solar. Ação, coração e inovação são palavras comuns neste material de estudo.",
  "A respiração celular libera a energia armazenada na glicose. Acontece nas mitocôndrias e produz ATP, a moeda energética da célula. Também há fermentação quando falta oxigênio.",
  "O ciclo da água inclui evaporação, condensação e precipitação. A água circula entre oceanos, atmosfera e continentes, mantendo o equilíbrio do clima e a vida na Terra.",
];

async function save(name, html) {
  await page.setContent(html);
  writeFileSync(join(dir, name), await page.pdf(opts));
}

await save(
  "texto-3-paginas.pdf",
  `${style}${textos.map((t, i) => `<section><h1>Página ${i + 1}</h1><p>${t}</p></section>`).join("")}`,
);

const png =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300"><rect width="400" height="300" fill="#ccc"/><circle cx="200" cy="150" r="80" fill="#333"/></svg>',
  );
await save(
  "escaneado.pdf",
  `${style}${[1, 2].map(() => `<section><img src="${png}" width="600"></section>`).join("")}`,
);

await save(
  "31-paginas.pdf",
  `${style}${Array.from({ length: 31 }, (_, i) => `<section><p>Página número ${i + 1} com texto suficiente para ser reconhecido como conteúdo real do documento.</p></section>`).join("")}`,
);

await browser.close();
