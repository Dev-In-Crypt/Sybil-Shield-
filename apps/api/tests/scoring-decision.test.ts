/**
 * GET /v1/score/:address now surfaces decision/decision_confidence/
 * rationale_codes (previously stored on address_scores but not exposed
 * publicly) — added while building the Snapshot governance-strategy
 * integration (TODO-306), which needs the actual DROP/REVIEW/KEEP verdict
 * rather than re-deriving a threshold heuristic from sybil_score.
 *
 * Requires DATABASE_URL (provided by docker-compose.test.yml).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { beforeAll, describe, expect, it } from "vitest";
import { migrateOnce } from "./_migrate-once.js";
import { addressScores, analyses, customers } from "../src/db/schema.js";
import { buildServer } from "../src/index.js";

const dbUrl = process.env.DATABASE_URL;
const describeMaybe = dbUrl ? describe : describe.skip;

describeMaybe("GET /v1/score/:address — decision fields", () => {
  let db: ReturnType<typeof drizzle>;
  let app: Awaited<ReturnType<typeof buildServer>>;
  let customerId: string;

  beforeAll(async () => {
    await migrateOnce(dbUrl!);
    db = drizzle(postgres(dbUrl!, { max: 5 }));
    app = await buildServer();
    await app.ready();

    const [c] = await db
      .insert(customers)
      .values({
        email: `scoring-decision-${Date.now()}@test.com`,
        plan: "free",
        apiKeyHash: `test-hash-${Date.now()}`,
      })
      .returning();
    customerId = c!.id;
  }, 30_000);

  it("returns decision + decision_confidence + rationale_codes for a full-mode analysis", async () => {
    const [analysis] = await db
      .insert(analyses)
      .values({ customerId, name: "full-mode", chains: ["ethereum"], addressCount: 1, status: "complete" })
      .returning();
    const addr = "0x" + Date.now().toString(16).padStart(40, "1").slice(-40);
    await db.insert(addressScores).values({
      analysisId: analysis!.id,
      address: addr,
      chain: "ethereum",
      sybilScore: 90,
      label: "sybil",
      decision: "DROP",
      decisionConfidence: "high",
      rationaleCodes: ["score_ge_85", "cluster_size_ge_50"],
      features: {},
    });

    const res = await app.inject({ method: "GET", url: `/v1/score/${addr}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.decision).toBe("DROP");
    expect(body.decision_confidence).toBe("high");
    expect(body.rationale_codes).toEqual(["score_ge_85", "cluster_size_ge_50"]);
  });

  it("returns null decision fields for a cluster_only-mode analysis", async () => {
    const [analysis] = await db
      .insert(analyses)
      .values({ customerId, name: "cluster-only", chains: ["ethereum"], addressCount: 1, status: "complete" })
      .returning();
    const addr = "0x" + Date.now().toString(16).padStart(40, "2").slice(-40);
    await db.insert(addressScores).values({
      analysisId: analysis!.id,
      address: addr,
      chain: "ethereum",
      sybilScore: 0,
      label: "unscored",
      // decision intentionally omitted — mirrors normaliseClusterOnlyResponse
      features: {},
    });

    const res = await app.inject({ method: "GET", url: `/v1/score/${addr}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.decision).toBeNull();
    expect(body.decision_confidence).toBeNull();
    expect(body.rationale_codes).toBeNull();
  });
});
