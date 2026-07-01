import { eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { customers, db } from "../db/index.js";
import { hashApiKey } from "../lib/api-keys.js";

declare module "fastify" {
  interface FastifyRequest {
    customer?: typeof customers.$inferSelect;
  }
}

/**
 * Per-plan limits enforced across the API surface.
 *
 *   rpm                      — Fastify rate-limit per API key (see index.ts)
 *   monthlyCalls             — billable POSTs per calendar month (counter
 *                              lives on customers.api_calls_this_month and
 *                              is incremented by countAuthedCall, skipping
 *                              the read-only paths listed below)
 *   maxAddressesPerAnalysis  — hard cap on body.addresses[] (Block 1)
 *                              + secondary cap after addresses_file_url
 *                              parsing in the worker (Block 4)
 *   maxConcurrent            — in-flight analyses cap (Block 2)
 *   maxFileBytes             — content-length cap on addresses_file_url (Block 4)
 *   maxCuPerAnalysis         — Alchemy CU budget per single analysis (Block 5)
 *
 * Adding a field here is automatically picked up by planLimits(); all
 * call sites destructure what they need.
 */
interface PlanLimits {
  rpm: number;
  monthlyCalls: number;
  maxAddressesPerAnalysis: number;
  maxConcurrent: number;
  maxFileBytes: number;
  maxCuPerAnalysis: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    rpm: 30,
    monthlyCalls: 100,
    maxAddressesPerAnalysis: 1_000,
    maxConcurrent: 1,
    maxFileBytes: 1 * 1024 * 1024, // 1 MB
    maxCuPerAnalysis: 5_000,
  },
  developer: {
    rpm: 100,
    monthlyCalls: 50_000,
    maxAddressesPerAnalysis: 10_000,
    maxConcurrent: 5,
    maxFileBytes: 10 * 1024 * 1024, // 10 MB
    maxCuPerAnalysis: 50_000,
  },
  growth: {
    rpm: 300,
    monthlyCalls: 250_000,
    maxAddressesPerAnalysis: 100_000,
    maxConcurrent: 20,
    maxFileBytes: 100 * 1024 * 1024, // 100 MB
    maxCuPerAnalysis: 500_000,
  },
  enterprise: {
    rpm: 1000,
    monthlyCalls: 10_000_000,
    maxAddressesPerAnalysis: 1_000_000,
    maxConcurrent: 100,
    maxFileBytes: 1024 * 1024 * 1024, // 1 GB
    maxCuPerAnalysis: 5_000_000,
  },
};

export async function requireApiKey(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "missing_api_key" });
  }
  const key = header.slice("Bearer ".length).trim();
  if (!key.startsWith("sk_")) {
    return reply.code(401).send({ error: "invalid_api_key" });
  }
  const hash = hashApiKey(key);
  const [customer] = await db.select().from(customers).where(eq(customers.apiKeyHash, hash));
  if (!customer) {
    return reply.code(401).send({ error: "invalid_api_key" });
  }
  // Monthly quota check
  const plan = PLAN_LIMITS[customer.plan] ?? PLAN_LIMITS.free!;
  if (customer.apiCallsThisMonth >= plan.monthlyCalls) {
    return reply.code(429).send({
      error: "monthly_quota_exceeded",
      limit: plan.monthlyCalls,
      used: customer.apiCallsThisMonth,
      message:
        "Public sandbox fair-use limit reached. Resets at the start of next month. " +
        "Email support@sybilshield.org for research access.",
    });
  }
  request.customer = customer;
}

/**
 * Routes that should NOT count toward the monthly billable-call budget.
 * These are read-only endpoints that the dashboard polls or the user reads
 * for free — billing them would silently shred a legitimate user's monthly
 * 100-call quota the moment a long-running analysis starts polling.
 *
 * Billable operations (POST /v1/analyses, POST /v1/score/batch, POST /v1/feedback,
 * POST /v1/webhooks/test, etc.) still increment.
 *
 * NOTE: paths use Fastify's parameterised form (`:id`), matched against
 * `request.routerPath`. If you add a new GET route that should be free,
 * append it here.
 */
const FREE_READ_PATHS = new Set<string>([
  "/v1/account",
  "/v1/analyses",
  "/v1/analyses/:id",
  "/v1/analyses/:id/results",
  "/v1/analyses/:id/results/export",
  "/v1/analyses/:id/clusters",
  "/v1/audit-log",
  "/v1/notifications",
  "/v1/team",
  "/v1/watchlist",
  "/v1/billing/plans",
  "/v1/appeals/policy",
  "/v1/webhooks/deliveries",
  "/v1/webhooks/deliveries/:id",
]);

/**
 * onResponse hook: increment the monthly call counter for billable requests.
 * Skips:
 *   - 401/429 (we don't punish the customer twice for the same event)
 *   - GET requests on read-only paths in FREE_READ_PATHS (dashboard polling)
 *
 * Register inside the authed scope:
 *   instance.addHook("onResponse", countAuthedCall);
 */
export async function countAuthedCall(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.customer) return;
  if (reply.statusCode === 401 || reply.statusCode === 429) return;
  // Polling reads + dashboard reads are free. Only count billable writes
  // (POST/DELETE/PUT/PATCH) and any GET on a non-whitelisted path.
  if (request.method === "GET") {
    const routerPath = (request as unknown as { routerPath?: string }).routerPath ?? request.url;
    // Strip query string if present (routerPath shouldn't have one but be defensive)
    const path = routerPath.split("?")[0] ?? routerPath;
    if (FREE_READ_PATHS.has(path)) return;
  }
  try {
    await db
      .update(customers)
      .set({ apiCallsThisMonth: sql`${customers.apiCallsThisMonth} + 1` })
      .where(eq(customers.id, request.customer.id));
  } catch (err) {
    request.log.warn({ err, customerId: request.customer.id }, "failed to increment api_calls_this_month");
  }
}

export function planLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free!;
}

export { PLAN_LIMITS };
export type { PlanLimits };
