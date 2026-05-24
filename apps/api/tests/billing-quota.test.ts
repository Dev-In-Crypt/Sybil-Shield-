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

  it("increments api_calls_this_month after each authed request", async () => {
    const email = `quota-inc-${Date.now()}@test.com`;
    const reg = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email },
    });
    expect(reg.statusCode).toBe(201);
    const { api_key } = reg.json() as { api_key: string };

    // Make a couple of authed calls
    await app.inject({
      method: "GET",
      url: "/v1/account",
      headers: { authorization: `Bearer ${api_key}` },
    });
    await app.inject({
      method: "GET",
      url: "/v1/analyses",
      headers: { authorization: `Bearer ${api_key}` },
    });

    // Counter writes happen in onResponse — give it a tick
    await new Promise((r) => setTimeout(r, 50));

    const [row] = await db.select().from(customers).where(eq(customers.email, email));
    expect(row).toBeDefined();
    expect(row!.apiCallsThisMonth).toBeGreaterThanOrEqual(2);
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
    const body = blocked.json() as { error: string; limit: number; plan: string };
    expect(body.error).toBe("monthly_quota_exceeded");
    expect(body.limit).toBe(100);
    expect(body.plan).toBe("free");
  });
});
