import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config. Defaults to the live public sandbox so the suite is runnable
 * with zero local setup (no Docker required) — set E2E_BASE_URL to point at
 * a local `next dev` + `docker compose up` stack instead (see VERIFY.md).
 */
const baseURL = process.env.E2E_BASE_URL ?? "https://www.sybilshield.org";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  timeout: 120_000,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
});
