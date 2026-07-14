/**
 * Regression test for a bug found by the TODO-302 load test (see
 * apps/api/src/scripts/load-test-rate-limits.ts): the authed scope's custom
 * `errorResponseBuilder` in index.ts returned a plain object with no
 * `statusCode`. @fastify/rate-limit does `throw errorResponseBuilder(...)`
 * internally — its own default builder sets `err.statusCode` on a real Error
 * before throwing, but a plain object without that property falls through to
 * Fastify's generic error handler and silently became a 500, not a 429, the
 * moment ANY authenticated customer exceeded their RPM cap. No existing test
 * exercised this path (the resolve-route rate-limit test uses the plugin's
 * DEFAULT builder, a different code path). Requires DATABASE_URL.
 */
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/index.js";

const dbUrl = process.env.DATABASE_URL;
const describeMaybe = dbUrl ? describe : describe.skip;

describeMaybe("authed RPM rate limit — 429, not 500", () => {
  it("returns a real 429 with the documented body once the free-plan RPM cap (30/min) is exceeded", async () => {
    const app = await buildServer();
    await app.ready();

    const email = `rpm-regress-${Date.now()}@test.com`;
    const reg = await app.inject({ method: "POST", url: "/v1/account/register", payload: { email } });
    const { api_key } = reg.json() as { api_key: string };
    const headers = { authorization: `Bearer ${api_key}` };

    let last: Awaited<ReturnType<typeof app.inject>> | undefined;
    for (let i = 0; i < 31; i++) {
      last = await app.inject({ method: "GET", url: "/v1/account", headers });
    }

    expect(last!.statusCode).toBe(429);
    const body = last!.json() as {
      statusCode: number;
      error: string;
      limit: number;
      retry_after_seconds: number;
    };
    expect(body.statusCode).toBe(429);
    expect(body.error).toBe("rate_limit_exceeded");
    expect(body.limit).toBe(30);
    expect(body.retry_after_seconds).toBeGreaterThan(0);
  }, 15_000);
});
