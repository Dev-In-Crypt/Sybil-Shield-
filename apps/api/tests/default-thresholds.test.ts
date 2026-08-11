/**
 * TODO-102: per-customer default threshold overrides. Covers the settings
 * endpoint (PUT/DELETE/GET) and the merge behavior in POST /v1/analyses —
 * an explicit per-analysis threshold_overrides always wins; the stored
 * default is used only when the request omits the field entirely.
 *
 * Requires DATABASE_URL (provided by docker-compose.test.yml).
 */
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { beforeAll, describe, expect, it } from "vitest";
import { migrateOnce } from "./_migrate-once.js";
import { analyses } from "../src/db/schema.js";
import { buildServer } from "../src/index.js";

const dbUrl = process.env.DATABASE_URL;
const describeMaybe = dbUrl ? describe : describe.skip;

describeMaybe("per-customer default threshold overrides (TODO-102)", () => {
  let db: ReturnType<typeof drizzle>;
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    await migrateOnce(dbUrl!);
    db = drizzle(postgres(dbUrl!, { max: 5 }));
    app = await buildServer();
    await app.ready();
  }, 30_000);

  async function registerCustomer(label: string): Promise<string> {
    const reg = await app.inject({
      method: "POST",
      url: "/v1/account/register",
      payload: { email: `default-thresholds-${label}-${Date.now()}@test.com` },
    });
    expect(reg.statusCode, `registration failed: ${reg.body}`).toBe(201);
    return (reg.json() as { api_key: string }).api_key;
  }

  it("stores a default via PUT, reflects it on GET /v1/account, clears it via DELETE", async () => {
    const apiKey = await registerCustomer("crud");
    const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };

    const put = await app.inject({
      method: "PUT",
      url: "/v1/account/default-thresholds",
      headers,
      payload: { drop: { cluster_size_gte: 12 } },
    });
    expect(put.statusCode).toBe(200);
    expect(put.json()).toEqual({ default_threshold_overrides: { drop: { cluster_size_gte: 12 } } });

    const get = await app.inject({ method: "GET", url: "/v1/account", headers });
    expect(get.json().default_threshold_overrides).toEqual({ drop: { cluster_size_gte: 12 } });

    const del = await app.inject({ method: "DELETE", url: "/v1/account/default-thresholds", headers });
    expect(del.statusCode).toBe(204);

    const getAfter = await app.inject({ method: "GET", url: "/v1/account", headers });
    expect(getAfter.json().default_threshold_overrides).toBeNull();
  });

  it("rejects an invalid default-thresholds body", async () => {
    const apiKey = await registerCustomer("invalid");
    const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };

    const res = await app.inject({
      method: "PUT",
      url: "/v1/account/default-thresholds",
      headers,
      payload: { drop: { cluster_size_gte: "not-a-number" } },
    });
    expect(res.statusCode).toBe(400);
  });

  it("uses the stored default when a create-analysis request omits threshold_overrides", async () => {
    const apiKey = await registerCustomer("default-used");
    const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };

    await app.inject({
      method: "PUT",
      url: "/v1/account/default-thresholds",
      headers,
      payload: { review: { score_gte: 55 } },
    });

    const create = await app.inject({
      method: "POST",
      url: "/v1/analyses",
      headers,
      payload: {
        name: "uses-default",
        chains: ["ethereum"],
        addresses: ["0xd8da6bf26964af9d7eed9e03e53415d37aa96045"],
        mode: "cluster_only",
      },
    });
    expect(create.statusCode).toBe(202);
    const analysisId = create.json().id as string;

    const [row] = await db.select().from(analyses).where(eq(analyses.id, analysisId));
    expect(row?.thresholdOverrides).toEqual({ review: { score_gte: 55 } });
  });

  it("prefers an explicit per-analysis threshold_overrides over the stored default", async () => {
    const apiKey = await registerCustomer("per-analysis-wins");
    const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };

    await app.inject({
      method: "PUT",
      url: "/v1/account/default-thresholds",
      headers,
      payload: { review: { score_gte: 55 } },
    });

    const create = await app.inject({
      method: "POST",
      url: "/v1/analyses",
      headers,
      payload: {
        name: "explicit-wins",
        chains: ["ethereum"],
        addresses: ["0xd8da6bf26964af9d7eed9e03e53415d37aa96045"],
        mode: "cluster_only",
        threshold_overrides: { drop: { cluster_size_gte: 3 } },
      },
    });
    expect(create.statusCode).toBe(202);
    const analysisId = create.json().id as string;

    const [row] = await db.select().from(analyses).where(eq(analyses.id, analysisId));
    expect(row?.thresholdOverrides).toEqual({ drop: { cluster_size_gte: 3 } });
  });

  it("leaves threshold_overrides null when neither a default nor a per-analysis override is set", async () => {
    const apiKey = await registerCustomer("no-override");
    const headers = { authorization: `Bearer ${apiKey}`, "content-type": "application/json" };

    const create = await app.inject({
      method: "POST",
      url: "/v1/analyses",
      headers,
      payload: {
        name: "no-override",
        chains: ["ethereum"],
        addresses: ["0xd8da6bf26964af9d7eed9e03e53415d37aa96045"],
        mode: "cluster_only",
      },
    });
    expect(create.statusCode).toBe(202);
    const analysisId = create.json().id as string;

    const [row] = await db.select().from(analyses).where(eq(analyses.id, analysisId));
    expect(row?.thresholdOverrides).toBeNull();
  });
});
