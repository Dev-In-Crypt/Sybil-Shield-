import { expect, test } from "@playwright/test";

/**
 * Golden path: register -> API key -> submit an analysis -> poll -> see
 * DROP/REVIEW/KEEP results -> CSV export. TODO-314.
 *
 * Runs against the live public sandbox by default (no Docker needed) — set
 * E2E_BASE_URL to point at a local docker-compose + `next dev` stack
 * instead. Uses two already-well-known test addresses from this repo's own
 * docs examples (apps/web/app/docs/quickstart/page.tsx) rather than random
 * ones, so a real run is reproducible.
 */

const TEST_ADDRESSES = [
  "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
  "0xab5801a7d398351b8be11c439e05c5b3259aec9b",
];

test("register, submit a batch analysis, see decisions, export CSV", async ({ page }) => {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@sybilshield-e2e.test`;

  // 1. Register
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "Sign up" })).toBeVisible();
  await page.locator('input[type="email"]').fill(email);
  await page.getByRole("button", { name: "Create account" }).click();

  // 2. Save the one-time API key, continue into the dashboard
  await expect(page.getByRole("heading", { name: "You're in." })).toBeVisible({ timeout: 15_000 });
  await page.getByRole("button", { name: "I saved it — continue" }).click();
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible();

  // 3. New analysis — paste mode, full scoring (default), balanced preset (default)
  await page.goto("/dashboard/new");
  await page.getByPlaceholder("e.g. Linea wave-2 sybil scan").fill("e2e golden path");
  await page.getByRole("button", { name: "Paste" }).click();
  await page.locator("textarea").fill(TEST_ADDRESSES.join("\n"));
  await page.getByRole("button", { name: "Start analysis" }).click();

  // 4. Redirected to the new analysis's detail page
  await page.waitForURL(/\/dashboard\/analyses\/[^/]+$/, { timeout: 15_000 });

  // 5. Poll until the worker finishes (real ingestion, not mocked — generous timeout)
  await expect(page.getByText(/complete/i).first()).toBeVisible({ timeout: 90_000 });

  // 6. Results rendered — at least one scored address row
  await expect(page.locator("table tbody tr, table tr").first()).toBeVisible();

  // 7. CSV export actually triggers a download
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download all results as CSV" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.csv$/);
});
