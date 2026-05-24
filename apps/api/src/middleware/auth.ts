import { eq, sql } from "drizzle-orm";
import type { FastifyReply, FastifyRequest } from "fastify";
import { customers, db } from "../db/index.js";
import { hashApiKey } from "../lib/api-keys.js";

declare module "fastify" {
  interface FastifyRequest {
    customer?: typeof customers.$inferSelect;
  }
}

const PLAN_LIMITS: Record<string, { rpm: number; monthlyCalls: number }> = {
  free: { rpm: 30, monthlyCalls: 100 },
  developer: { rpm: 100, monthlyCalls: 50_000 },
  growth: { rpm: 300, monthlyCalls: 250_000 },
  enterprise: { rpm: 1000, monthlyCalls: 10_000_000 },
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
      plan: customer.plan,
      upgrade_url: `${process.env.WEB_PUBLIC_URL ?? ""}/pricing`,
    });
  }
  request.customer = customer;
}

/**
 * onResponse hook: increment the monthly call counter for any authed request.
 * Skips counting if response was a 401/429 (failed auth or already-blocked quota
 * — we don't punish the customer twice for the same event).
 *
 * Register inside the authed scope:
 *   instance.addHook("onResponse", countAuthedCall);
 */
export async function countAuthedCall(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  if (!request.customer) return;
  if (reply.statusCode === 401 || reply.statusCode === 429) return;
  try {
    await db
      .update(customers)
      .set({ apiCallsThisMonth: sql`${customers.apiCallsThisMonth} + 1` })
      .where(eq(customers.id, request.customer.id));
  } catch (err) {
    request.log.warn({ err, customerId: request.customer.id }, "failed to increment api_calls_this_month");
  }
}

export function planLimits(plan: string): { rpm: number; monthlyCalls: number } {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free!;
}

export { PLAN_LIMITS };
