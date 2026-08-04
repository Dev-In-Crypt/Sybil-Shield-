/**
 * Local-only load test for TODO-325 (first-sight scoring's throughput
 * protection, TODO-312 Phase 1): proves the global throttle and the
 * per-Origin rate limit on `POST /v1/score/first-sight` actually 429 under
 * real concurrent HTTP load, not just the sequential/synchronous checks
 * `first-sight-throttle.test.ts` already covers.
 *
 * Why a separate script from load-test-rate-limits.ts (TODO-302): that one
 * needs an authenticated customer (API key) to exercise per-customer RPM +
 * concurrent-analysis caps. `/v1/score/first-sight` is public/unauthed and
 * gated by a different pair of limits (a global in-memory sliding window +
 * a per-Origin cap) — different setup, so a sibling script, not an
 * extension, per this project's one-logical-change convention.
 *
 * SAFETY: refuses to run against anything but localhost/127.0.0.1. Never
 * point this at a deployed environment (AGENTS.md: "Do NOT load-test prod").
 * Also never point it at real Alchemy — `ML_SERVICE_URL` in a local
 * docker-compose stack talks to the `ml` service configured with MockProvider
 * by default (see README.md's "Self-host" section, zero-key quick-start).
 *
 * Run against a local docker-compose stack:
 *   docker compose up -d --build
 *   cd apps/api && npx tsx src/scripts/load-test-first-sight.ts
 *
 * STATUS AS OF 2026-07-30 (TODO-325): written but NOT YET EXECUTED. Docker
 * was unavailable this session (`docker info` failed) and this endpoint's
 * handler does a real DB read before either limiter even applies (see
 * routes/first-sight.ts's numbered comments) plus a real call to the ML
 * service on the ML-first-sight-scoring path — there is no way to exercise
 * any of this without a running Postgres + ml service, unlike TODO-312's
 * own ML-side tests which could fall back to MockProvider with zero
 * infrastructure. Whoever runs this next (a Docker-available session) should
 * update TODO-324... TODO-325's status in TODO.md from "in progress" to
 * "done" (or file a bug if a test below fails) rather than assume it passes.
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

// Matches apps/api/src/lib/first-sight-throttle.ts's MAX_PER_WINDOW / WINDOW_MS
// and the route's per-origin config (routes/first-sight.ts) — kept as
// comments, not imports, since this is a black-box HTTP test.
const GLOBAL_BUDGET_PER_WINDOW = 2;
const PER_ORIGIN_RPM = 20;

interface FirstSightResponse {
  address: string;
  first_sight?: boolean;
  error?: string;
}

/** Deterministic-looking but distinct fake addresses so each request is a genuine cache miss. */
function randomAddress(seed: number): string {
  return "0x" + seed.toString(16).padStart(40, "f0");
}

async function callFirstSight(address: string, origin: string): Promise<{ status: number; body: FirstSightResponse }> {
  const res = await fetch(`${BASE_URL}/v1/score/first-sight`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ address, chain: "ethereum" }),
  });
  const body = (await res.json().catch(() => ({}))) as FirstSightResponse;
  return { status: res.status, body };
}

/** Fire more concurrent first-sight requests (distinct addresses) than the
 * global window allows, all at once — at least one must 429. */
async function testGlobalBudget(): Promise<{ passed: boolean; statuses: number[] }> {
  const origin = "https://load-test-global.example";
  const attempts = GLOBAL_BUDGET_PER_WINDOW + 4;
  const results = await Promise.all(
    Array.from({ length: attempts }, (_, i) => callFirstSight(randomAddress(10_000 + i), origin).then((r) => r.status)),
  );
  console.log(`[global-budget] ${attempts} simultaneous first-sight calls -> statuses:`, results);
  const passed = results.filter((s) => s === 429).length > 0;
  return { passed, statuses: results };
}

/** Fire more requests from ONE origin than its per-minute cap allows, spaced
 * out enough (700ms) to stay clear of the global budget so this isolates the
 * per-Origin limiter specifically. */
async function testPerOriginCap(): Promise<{ passed: boolean; firstBlockedAt: number | null }> {
  const origin = "https://load-test-origin.example";
  const attempts = PER_ORIGIN_RPM + 5;
  for (let i = 1; i <= attempts; i++) {
    const { status, body } = await callFirstSight(randomAddress(20_000 + i), origin);
    if (status === 429) {
      console.log(`[per-origin] request ${i}/${attempts} -> 429`, body);
      return { passed: true, firstBlockedAt: i };
    }
    await new Promise((resolve) => setTimeout(resolve, 700));
  }
  console.log(`[per-origin] all ${attempts} requests succeeded — cap never fired`);
  return { passed: false, firstBlockedAt: null };
}

/**
 * BONUS (beyond TODO-325's stated acceptance criteria, added because it's
 * exactly the kind of thing a real-concurrency test should catch): two
 * simultaneous first-sight requests for the SAME never-before-scored
 * address. routes/first-sight.ts's own numbered comments show the
 * write-through cache is checked, then (on miss) real ML ingestion runs,
 * THEN the result is persisted — nothing prevents two concurrent misses on
 * the identical address both proceeding past the cache check before either
 * writes back, which would double-spend real Alchemy budget on one address.
 * If this reports a real double-spend, file it as a new TODO — don't fix it
 * inline here; a fix needs a real design decision (DB unique constraint +
 * ON CONFLICT, or an in-process per-address in-flight lock) that itself
 * needs verification this session's Docker-unavailable environment can't
 * provide either.
 */
async function testConcurrentSameAddressCacheRace(): Promise<{ doubleSpendObserved: boolean; results: FirstSightResponse[] }> {
  const origin = "https://load-test-race.example";
  const address = randomAddress(30_001);
  const [a, b] = await Promise.all([callFirstSight(address, origin), callFirstSight(address, origin)]);
  const results = [a.body, b.body];
  const bothFresh = results.filter((r) => r.first_sight === true).length;
  console.log(`[cache-race] two concurrent calls for the same never-scored address -> first_sight flags:`, results.map((r) => r.first_sight));
  return { doubleSpendObserved: bothFresh > 1, results };
}

async function main(): Promise<void> {
  console.log(
    `[load-test] target: ${BASE_URL} (global budget=${GLOBAL_BUDGET_PER_WINDOW}/1000ms, per-origin=${PER_ORIGIN_RPM}/min)`,
  );

  const globalResult = await testGlobalBudget();
  const originResult = await testPerOriginCap();
  const raceResult = await testConcurrentSameAddressCacheRace();

  console.log("\n=== summary ===");
  console.log(`Global budget (${GLOBAL_BUDGET_PER_WINDOW}/1000ms) 429s:  ${globalResult.passed ? "PASS" : "FAIL"}`);
  console.log(`Per-Origin cap (${PER_ORIGIN_RPM}/min) 429s:     ${originResult.passed ? "PASS" : "FAIL"}`);
  console.log(
    `Same-address cache race (informational, not pass/fail): ${
      raceResult.doubleSpendObserved ? "DOUBLE-SPEND OBSERVED — file a TODO" : "no double-spend observed this run"
    }`,
  );

  if (!globalResult.passed || !originResult.passed) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[load-test] failed:", err);
  process.exitCode = 1;
});

// Marks this file as an ES module so its top-level names don't collide with
// load-test-rate-limits.ts's identically-named globals (RAW_BASE_URL,
// BASE_URL, assertLocalOnly, main) under tsc's classic script-scope rules.
export {};
