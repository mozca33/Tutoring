import { defineConfig, devices } from "@playwright/test";

// E2E roda contra a URL definida em E2E_BASE_URL (padrão: produção).
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "https://tutoringlive.vercel.app",
    headless: true,
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
