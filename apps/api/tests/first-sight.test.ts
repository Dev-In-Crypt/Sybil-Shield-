/**
 * POST /v1/score/first-sight — TODO-312 Phase 1 (real-time first-sight
 * scoring). Mocks the ML service's /first-sight HTTP call (no live Alchemy
 * spend in tests) but exercises the real DB write-through cache, the real
 * system-analysis bootstrap, and the real computeDecision() call.
 *
 * Requires DATABASE_URL (provided by docker-compose.test.yml).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { migrateOnce } from "./_migrate-once.js";
import { addressScores, customers } from "../src/db/schema.js";
import { buildServer } from "../src/index.js";
import { _resetFirstSightBudgetForTests } from "../src/lib/first-sight-throttle.js";

const dbUrl = process.env.DATABASE_URL;
const describeMaybe = dbUrl ? describe : describe.skip;

function mlResponse(
  overrides: Partial<{ sybil_score: number; label: string; confidence: number; evidence: unknown[] }> = {},
) {
  return {
    ok: true,
    json: async () => ({
      sybil_score: 0,
      label: "genuine",
      confidence: 0.1,
      evidence: [],
      cu_consumed: 300,
      ...overrides,
    }),
    text: async () => "",
  };
}

describeMaybe("POST /v1/score/first-sight", () => {
  let db: ReturnType<typeof drizzle>;
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    await migrateOnce(dbUrl!);
    db = drizzle(postgres(dbUrl!, { max: 5 }));
    app = await buildServer();
    await app.ready();
  }, 30_000);

  afterEach(() => {
    vi.unstubAllGlobals();
    _resetFirstSightBudgetForTests();
  });

  it("scores a never-seen address, writes through the cache, and marks first_sight: true", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mlResponse({ sybil_score: 85, label: "sybil", confidence: 0.9 }));
    vi.stubGlobal("fetch", fetchMock);

    const addr = "0x" + Date.now().toString(16).padStart(40, "3").slice(-40);
    const res = await app.inject({
      method: "POST",
      url: "/v1/score/first-sight",
      payload: { address: addr, chain: "ethereum" },
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.address).toBe(addr);
    expect(body.sybil_score).toBe(85);
    expect(body.first_sight).toBe(true);
    // balanced.drop.score_gte = 80 -> DROP, no cluster signal -> confidence "medium"
    expect(body.decision).toBe("DROP");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Real row actually persisted, findable by the existing public lookup.
    const [row] = await db.select().from(addressScores).where(eq(addressScores.address, addr));
    expect(row?.sybilScore).toBe(85);
  });

  it("does not call the ML service twice for the same address — cache hit is free", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mlResponse({ sybil_score: 10 }));
    vi.stubGlobal("fetch", fetchMock);

    const addr = "0x" + Date.now().toString(16).padStart(40, "4").slice(-40);
    const first = await app.inject({
      method: "POST",
      url: "/v1/score/first-sight",
      payload: { address: addr, chain: "ethereum" },
    });
    expect(first.json().first_sight).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const second = await app.inject({
      method: "POST",
      url: "/v1/score/first-sight",
      payload: { address: addr, chain: "ethereum" },
    });
    expect(second.statusCode).toBe(200);
    expect(second.json().first_sight).toBe(false);
    expect(second.json().sybil_score).toBe(10);
    // Still exactly 1 -- the second call never reached the ML service.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a malformed address before touching the ML service or the budget", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const res = await app.inject({
      method: "POST",
      url: "/v1/score/first-sight",
      payload: { address: "0xnotreal", chain: "ethereum" },
    });
    expect(res.statusCode).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("429s once the global first-sight budget is spent for the window", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mlResponse());
    vi.stubGlobal("fetch", fetchMock);

    // Global budget is 2/window (apps/api/src/lib/first-sight-throttle.ts) --
    // three distinct never-seen addresses in immediate succession must
    // exhaust it (each is a genuine cache miss, so each consumes budget).
    const addrs = [5, 6, 7].map((n) => "0x" + Date.now().toString(16).padStart(40, String(n)).slice(-40));
    const results = await Promise.all(
      addrs.map((address) =>
        app.inject({ method: "POST", url: "/v1/score/first-sight", payload: { address, chain: "ethereum" } }),
      ),
    );
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes).toEqual([200, 200, 429]);
  });

  it("reuses one system analysis row across multiple first-sight addresses", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mlResponse());
    vi.stubGlobal("fetch", fetchMock);

    const addr = "0x" + Date.now().toString(16).padStart(40, "8").slice(-40);
    await app.inject({
      method: "POST",
      url: "/v1/score/first-sight",
      payload: { address: addr, chain: "ethereum" },
    });

    const systemCustomers = await db
      .select()
      .from(customers)
      .where(eq(customers.email, "system+first-sight@sybilshield.internal"));
    expect(systemCustomers.length).toBe(1);
  });
});
