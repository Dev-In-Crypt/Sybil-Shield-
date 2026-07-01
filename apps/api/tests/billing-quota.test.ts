/**
 * Verifies that the monthly call counter is incremented on authed requests
 * and that the quota gate trips when exceeded.
 *
 * Requires DATABASE_URL (provided by docker-compose.test.yml).
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { beforeAll, describe, expect, it } from "vitest";
import { migrateOnce } from "./_migrate-once.js";
import { customers } from "../src/db/schema.js";
import { buildServer } from "../src/index.js";

const dbUrl = process.env.DATABASE_URL;
const describeMaybe = dbUrl ? describe : describe.skip;

describeMaybe("billing quota enforcement", () => {
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

  it("increments api_calls_this_month for billable POSTs but not for read GETs", async () => {
    const email = `quota-inc-${Date.now()}@test.com`;
    const reg = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email },
    });
    expect(reg.statusCode).toBe(201);
    const { api_key } = reg.json() as { api_key: string };

    // Read-only GETs on whitelisted paths must NOT increment the counter
    // — see FREE_READ_PATHS in middleware/auth.ts. The dashboard polls these
    // every 2s and we don't want polling to drain the monthly budget.
    await app.inject({ method: "GET", url: "/v1/account", headers: { authorization: `Bearer ${api_key}` } });
    await app.inject({ method: "GET", url: "/v1/analyses", headers: { authorization: `Bearer ${api_key}` } });
    await new Promise((r) => setTimeout(r, 50));
    let [row] = await db.select().from(customers).where(eq(customers.email, email));
    expect(row).toBeDefined();
    expect(row!.apiCallsThisMonth).toBe(0); // GETs are free

    // Now fire a billable POST and check the counter advances.
    await app.inject({
      method: "POST",
      url: "/v1/feedback",
      headers: { authorization: `Bearer ${api_key}`, "content-type": "application/json" },
      payload: {
        address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
        chain: "ethereum",
        verdict: "confirmed",
      },
    });
    await new Promise((r) => setTimeout(r, 50));
    [row] = await db.select().from(customers).where(eq(customers.email, email));
    expect(row!.apiCallsThisMonth).toBeGreaterThanOrEqual(1);
  });

  it("returns 429 with monthly_quota_exceeded when counter >= limit", async () => {
    const email = `quota-cap-${Date.now()}@test.com`;
    const reg = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email },
    });
    const { api_key } = reg.json() as { api_key: string };

    // Manually push counter to the free limit (100)
    await db
      .update(customers)
      .set({ apiCallsThisMonth: 100 })
      .where(eq(customers.email, email));

    const blocked = await app.inject({
      method: "GET",
      url: "/v1/account",
      headers: { authorization: `Bearer ${api_key}` },
    });
    expect(blocked.statusCode).toBe(429);
    const body = blocked.json() as { error: string; limit: number; used: number };
    expect(body.error).toBe("monthly_quota_exceeded");
    expect(body.limit).toBe(100);
    expect(body.used).toBeGreaterThanOrEqual(100);
  });
});
