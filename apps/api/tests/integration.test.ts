/**
 * Integration tests: hit a real Postgres (the test compose provides one).
 *
 * Skipped automatically when DATABASE_URL is not set.
 */
import { beforeAll, describe, expect, it } from "vitest";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import { migrateOnce } from "./_migrate-once.js";
import { buildServer } from "../src/index.js";
import {
  addressScores,
  analyses,
  customers,
  evidenceAuditLog,
  feedback,
} from "../src/db/schema.js";

const dbUrl = process.env.DATABASE_URL;
const hasDb = Boolean(dbUrl);
const describeMaybe = hasDb ? describe : describe.skip;

describeMaybe("integration: account + audit + appeals", () => {
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

  it("register -> get account -> score address -> appeal -> audit", async () => {
    const email = `it-${Date.now()}@test.com`;

    const reg = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email, name: "IT" },
    });
    expect(reg.statusCode).toBe(201);
    const { api_key, id: customerId } = reg.json();
    expect(api_key).toMatch(/^sk_live_/);

    // Seed an analysis + score directly (worker isn't running in test scope).
    const [analysis] = await db
      .insert(analyses)
      .values({
        customerId,
        name: "integration",
        chains: ["ethereum"],
        addressCount: 1,
        status: "complete",
      })
      .returning();

    // Unique address per run to keep test isolated when DB is shared
    const ts = Date.now().toString(16).padStart(40, "0").slice(-40);
    const targetAddr = "0x" + ts;
    await db.insert(addressScores).values({
      analysisId: analysis!.id,
      address: targetAddr,
      chain: "ethereum",
      sybilScore: 85,
      label: "sybil",
      features: {},
    });

    // Public appeal hits the unauthenticated route.
    const appeal = await app.inject({
      method: "POST",
      url: "/v1/appeals",
      payload: {
        address: targetAddr,
        chain: "ethereum",
        reason: "I am a real human - here is my history of using DeFi for 3 years.",
        contact_email: "real@user.com",
      },
    });
    expect(appeal.statusCode).toBe(202);

    // Feedback row recorded
    const fbRows = await db.select().from(feedback).where(eq(feedback.address, targetAddr));
    expect(fbRows.length).toBe(1);
    expect(fbRows[0]!.source).toBe("public_appeal");
    expect(fbRows[0]!.customerId).toBeNull();

    // Audit row recorded
    const auditRows = await db
      .select()
      .from(evidenceAuditLog)
      .where(eq(evidenceAuditLog.address, targetAddr));
    expect(auditRows.length).toBe(1);
    expect(auditRows[0]!.eventType).toBe("appealed");
    expect(auditRows[0]!.actor).toBe("public:anonymous");
    expect(auditRows[0]!.priorScore).toBe(85);

    // Get account with API key works
    const acc = await app.inject({
      method: "GET",
      url: "/v1/account",
      headers: { authorization: `Bearer ${api_key}` },
    });
    expect(acc.statusCode).toBe(200);
    expect(acc.json().email).toBe(email);
  });

  it("appeal on unknown address returns 404", async () => {
    const appeal = await app.inject({
      method: "POST",
      url: "/v1/appeals",
      payload: {
        address: "0x" + "ff".repeat(20),
        chain: "ethereum",
        reason: "This address has never been scored before by anyone.",
      },
    });
    expect(appeal.statusCode).toBe(404);
  });

  it("missing api key on protected route returns 401", async () => {
    const r = await app.inject({ method: "GET", url: "/v1/analyses" });
    expect(r.statusCode).toBe(401);
  });

  it("appeals policy is public", async () => {
    const r = await app.inject({ method: "GET", url: "/v1/appeals/policy" });
    expect(r.statusCode).toBe(200);
    expect(r.json().response_time_hours).toBe(48);
  });
});
