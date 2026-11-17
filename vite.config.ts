import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";
import { pwaPlugin } from "./scripts/pwa-plugin";

export default defineConfig({
  plugins: [preact(), tailwindcss(), pwaPlugin()],
  build: {
    target: "es2022",
    sourcemap: false,
  },
  test: {
    environment: "happy-dom",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
