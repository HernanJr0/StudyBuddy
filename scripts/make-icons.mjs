// Gera os ícones PNG do PWA a partir dos SVG em public/ (usa o Chromium do Playwright).
// Uso: node scripts/make-icons.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";

const pub = resolve(import.meta.dirname, "../public");
const jobs = [
  { svg: "favicon.svg", out: "icons/icon-192.png", size: 192 },
  { svg: "favicon.svg", out: "icons/icon-512.png", size: 512 },
  { svg: "icons/maskable.svg", out: "icons/maskable-512.png", size: 512 },
  { svg: "icons/maskable.svg", out: "icons/apple-touch-icon.png", size: 180 },
];

const browser = await chromium.launch();
try {
  for (const { svg, out, size } of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size } });
    const markup = readFileSync(resolve(pub, svg), "utf8");
    await page.setContent(
      `<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${markup}`,
    );
    await page.screenshot({ path: resolve(pub, out), omitBackground: true });
    await page.close();
    console.log(`${out} (${size}x${size})`);
  }
} finally {
  await browser.close();
}
