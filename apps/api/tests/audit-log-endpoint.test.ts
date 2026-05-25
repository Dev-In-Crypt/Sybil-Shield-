/**
 * Integration test for GET /v1/audit-log.
 * Requires DATABASE_URL (docker-compose.test.yml provides it).
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { beforeAll, describe, expect, it } from "vitest";
import { analyses, customers, evidenceAuditLog } from "../src/db/schema.js";
import { buildServer } from "../src/index.js";
import { migrateOnce } from "./_migrate-once.js";

const dbUrl = process.env.DATABASE_URL;
const describeMaybe = dbUrl ? describe : describe.skip;

describeMaybe("GET /v1/audit-log", () => {
  let client: postgres.Sql;
  let db: ReturnType<typeof drizzle>;
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    await migrateOnce(dbUrl!);
    client = postgres(dbUrl!, { max: 5 });
    db = drizzle(client);
    app = await buildServer();
    await app.ready();
  }, 30_000);

  it("returns the customer's own audit rows", async () => {
    // Register two distinct customers
    const t = Date.now();
    const reg1 = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email: `audit-owner-${t}@test.com` },
    });
    const { api_key: key1, id: customerId1 } = reg1.json() as { api_key: string; id: string };

    // Insert an analysis owned by customer 1
    const [a1] = await db
      .insert(analyses)
      .values({
        customerId: customerId1,
        name: "owned",
        chains: ["ethereum"],
        addresses: ["0x" + "00".repeat(19) + "01"],
        addressCount: 1,
        sensitivity: "balanced",
        status: "complete",
      })
      .returning();

    // Insert 2 audit rows for that analysis
    await db.insert(evidenceAuditLog).values([
      {
        analysisId: a1!.id,
        address: "0x" + "00".repeat(19) + "01",
        chain: "ethereum",
        eventType: "flagged",
        actor: "system:test",
        newScore: 90,
        reason: "sybil",
        evidenceSnapshot: { method: "funding" },
      },
      {
        analysisId: a1!.id,
        address: "0x" + "00".repeat(19) + "01",
        chain: "ethereum",
        eventType: "reviewed",
        actor: "reviewer:test",
        priorScore: 90,
        newScore: 90,
        reason: "kept",
        evidenceSnapshot: null,
      },
    ]);

    const r = await app.inject({
      method: "GET",
      url: `/v1/audit-log?analysis_id=${a1!.id}&limit=10`,
      headers: { authorization: `Bearer ${key1}` },
    });
    expect(r.statusCode).toBe(200);
    const body = r.json() as { data: unknown[]; limit: number; page: number; analysis_id: string };
    expect(body.data.length).toBe(2);
    expect(body.analysis_id).toBe(a1!.id);
    expect(body.limit).toBe(10);
    expect(body.page).toBe(0);
  });

  it("returns 404 on another tenant's analysis (no enumeration leak)", async () => {
    const t = Date.now();
    // Customer A
    const regA = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email: `audit-a-${t}@test.com` },
    });
    const { id: customerA } = regA.json() as { id: string };
    // Customer B
    const regB = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email: `audit-b-${t}@test.com` },
    });
    const { api_key: keyB } = regB.json() as { api_key: string };

    // Insert analysis owned by A
    const [aA] = await db
      .insert(analyses)
      .values({
        customerId: customerA,
        name: "owned-by-a",
        chains: ["ethereum"],
        addresses: ["0x" + "00".repeat(19) + "02"],
        addressCount: 1,
        sensitivity: "balanced",
        status: "complete",
      })
      .returning();

    // B tries to read A's audit log → 404, no leak
    const r = await app.inject({
      method: "GET",
      url: `/v1/audit-log?analysis_id=${aA!.id}&limit=10`,
      headers: { authorization: `Bearer ${keyB}` },
    });
    expect(r.statusCode).toBe(404);
    expect((r.json() as { error: string }).error).toBe("analysis_not_found");

    // Cleanup avoids cross-test bleed if rerun
    await db.delete(evidenceAuditLog).where(eq(evidenceAuditLog.analysisId, aA!.id));
    await db.delete(analyses).where(eq(analyses.id, aA!.id));
  });

  it("supports CSV format", async () => {
    const t = Date.now();
    const reg = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email: `audit-csv-${t}@test.com` },
    });
    const { api_key, id: customerId } = reg.json() as { api_key: string; id: string };

    const [a] = await db
      .insert(analyses)
      .values({
        customerId,
        name: "csv-test",
        chains: ["ethereum"],
        addresses: ["0x" + "00".repeat(19) + "03"],
        addressCount: 1,
        sensitivity: "balanced",
        status: "complete",
      })
      .returning();

    await db.insert(evidenceAuditLog).values({
      analysisId: a!.id,
      address: "0x" + "00".repeat(19) + "03",
      chain: "ethereum",
      eventType: "flagged",
      actor: "system:test",
      newScore: 88,
      reason: "sybil",
    });

    const r = await app.inject({
      method: "GET",
      url: `/v1/audit-log?analysis_id=${a!.id}&format=csv`,
      headers: { authorization: `Bearer ${api_key}` },
    });
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-type"]).toContain("text/csv");
    expect(r.body).toContain("event_id,event_type,actor");
    expect(r.body).toContain("system:test");
    expect(customers).toBeDefined(); // keep import live
  });
});
