import { defineConfig, devices } from "@playwright/test";

// PW_PORT e PW_DEV permitem rodar várias instâncias ao mesmo tempo (frentes em paralelo).
const port = Number(process.env.PW_PORT ?? 4173);
const command = process.env.PW_DEV
  ? `npx vite --port ${port} --strictPort`
  : `npm run build && npm run preview -- --port ${port} --strictPort`;

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: `http://localhost:${port}`,
    locale: "pt-BR",
  },
  projects: [
    { name: "celular", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command,
    url: `http://localhost:${port}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
