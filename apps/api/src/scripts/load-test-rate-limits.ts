/**
 * Local-only load test for TODO-302 (SECURITY_NOTES.md "Rate limiting" +
 * ROADMAP.md testing gap): proves the configured RPM and concurrent-analysis
 * caps actually 429 under load, instead of just trusting the config exists.
 *
 * SAFETY: refuses to run against anything but localhost/127.0.0.1. Never
 * point this at a deployed environment (AGENTS.md: "Do NOT load-test prod").
 *
 * Run against a local docker-compose stack:
 *   docker compose up -d --build
 *   cd apps/api && npx tsx src/scripts/load-test-rate-limits.ts
 *
 * Exits non-zero if either the RPM cap or the concurrent cap fails to fire a
 * 429, so it's a real pass/fail gate, not just log output for a human to read.
 */

const RAW_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3001";

function assertLocalOnly(url: string): URL {
  const parsed = new URL(url);
  const host = parsed.hostname;
  if (host !== "localhost" && host !== "127.0.0.1" && host !== "::1") {
    throw new Error(
      `Refusing to load-test "${host}" — this script only targets localhost/127.0.0.1. ` +
        `Local stack only, per AGENTS.md ("Do NOT load-test prod").`,
    );
  }
  return parsed;
}

const BASE_URL = assertLocalOnly(RAW_BASE_URL).toString().replace(/\/$/, "");

// Free-plan limits from apps/api/src/middleware/auth.ts PLAN_LIMITS — kept as
// a comment here (not imported) since this is a plain HTTP black-box test,
// not a unit test against the module. If the free-plan numbers change, update
// these expectations too.
const FREE_RPM = 30;
const FREE_MAX_CONCURRENT = 1;

interface RegisterResponse {
  api_key: string;
}

async function registerTestCustomer(label: string): Promise<string> {
  const email = `loadtest-${label}-${Date.now()}@test.local`;
  const res = await fetch(`${BASE_URL}/v1/account/register`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!res.ok) {
    throw new Error(`register failed for ${label}: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as RegisterResponse;
  return body.api_key;
}

/** Fire sequential GETs (no artificial delay) until we see a 429 or hit the cap. */
async function testRpmCap(apiKey: string): Promise<{ passed: boolean; firstBlockedAt: number | null }> {
  const attempts = FREE_RPM + 10;
  const headers = { Authorization: `Bearer ${apiKey}` };
  for (let i = 1; i <= attempts; i++) {
    const res = await fetch(`${BASE_URL}/v1/account`, { headers });
    if (res.status === 429) {
      const body = await res.json();
      console.log(`[rpm]  request ${i}/${attempts} -> 429`, body);
      return { passed: true, firstBlockedAt: i };
    }
  }
  console.log(`[rpm]  all ${attempts} requests succeeded — cap never fired`);
  return { passed: false, firstBlockedAt: null };
}

/** Fire N POST /v1/analyses truly concurrently; free plan allows only 1 in-flight. */
async function testConcurrentCap(apiKey: string): Promise<{ passed: boolean; statuses: number[] }> {
  const headers = { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" };
  const body = JSON.stringify({
    name: "load-test",
    chains: ["ethereum"],
    addresses: ["0xd8da6bf26964af9d7eed9e03e53415d37aa96045"],
    mode: "cluster_only",
  });
  const attempts = 3;
  const results = await Promise.all(
    Array.from({ length: attempts }, () =>
      fetch(`${BASE_URL}/v1/analyses`, { method: "POST", headers, body }).then((r) => r.status),
    ),
  );
  console.log(`[concurrent] ${attempts} simultaneous submits -> statuses:`, results);
  const passed = results.filter((s) => s === 429).length > 0;
  return { passed, statuses: results };
}

async function main(): Promise<void> {
  console.log(`[load-test] target: ${BASE_URL} (free plan: rpm=${FREE_RPM}, maxConcurrent=${FREE_MAX_CONCURRENT})`);

  const rpmKey = await registerTestCustomer("rpm");
  const rpmResult = await testRpmCap(rpmKey);

  const concurrentKey = await registerTestCustomer("concurrent");
  const concurrentResult = await testConcurrentCap(concurrentKey);

  console.log("\n=== summary ===");
  console.log(`RPM cap (${FREE_RPM}/min) 429s:        ${rpmResult.passed ? "PASS" : "FAIL"}`);
  console.log(`Concurrent cap (${FREE_MAX_CONCURRENT}) 429s:      ${concurrentResult.passed ? "PASS" : "FAIL"}`);

  if (!rpmResult.passed || !concurrentResult.passed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[load-test] failed:", err);
  process.exitCode = 1;
});
