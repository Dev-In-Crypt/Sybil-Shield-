/**
 * Stripe billing scaffold.
 *
 * Flow:
 *   1. POST /v1/billing/checkout-session  -> creates Stripe Checkout URL
 *   2. Stripe redirects back to dashboard
 *   3. POST /v1/billing/webhook (no auth) -> Stripe pings; we upgrade the plan
 *
 * Plans: developer ($499), growth ($1,499), enterprise ($4,999).
 */
import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import Stripe from "stripe";
import { z } from "zod";
import { customers, db } from "../db/index.js";
import {
  type AtlosPostback,
  createInvoice,
  isConfigured as isAtlosConfigured,
  isTerminalSuccess,
  parseOrderId,
  PLAN_PRICES,
  verifyPostbackSignature,
} from "../services/atlos.js";

const PLAN_PRICE_IDS: Record<string, string | undefined> = {
  developer: process.env.STRIPE_PRICE_DEVELOPER,
  growth: process.env.STRIPE_PRICE_GROWTH,
  enterprise: process.env.STRIPE_PRICE_ENTERPRISE,
};

const PLAN_CALL_LIMITS: Record<string, number> = {
  free: 100,
  developer: 50_000,
  growth: 250_000,
  enterprise: 10_000_000,
};

function stripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2024-04-10" });
}

const CheckoutSchema = z.object({
  plan: z.enum(["developer", "growth", "enterprise"]),
  success_url: z.string().url(),
  cancel_url: z.string().url(),
});

export async function billingRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/billing/checkout-session", async (request, reply) => {
    const stripeClient = stripe();
    if (!stripeClient) return reply.code(503).send({ error: "billing_disabled" });
    const parsed = CheckoutSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body" });
    const priceId = PLAN_PRICE_IDS[parsed.data.plan];
    if (!priceId) return reply.code(400).send({ error: "plan_not_configured" });

    const customer = request.customer!;
    const session = await stripeClient.checkout.sessions.create({
      mode: "subscription",
      customer_email: customer.email,
      client_reference_id: customer.id,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: parsed.data.success_url,
      cancel_url: parsed.data.cancel_url,
      metadata: { customer_id: customer.id, plan: parsed.data.plan },
    });
    return reply.send({ url: session.url });
  });

  // Webhook MUST be registered as raw to verify signature. Fastify by default
  // parses JSON; here we rely on the body string-to-buffer logic from Stripe.
  app.post(
    "/v1/billing/webhook",
    { config: { rawBody: true } } as never,
    async (request, reply) => {
      const stripeClient = stripe();
      const secret = process.env.STRIPE_WEBHOOK_SECRET;
      if (!stripeClient || !secret) return reply.code(503).send({ error: "billing_disabled" });

      const sig = request.headers["stripe-signature"];
      if (!sig || Array.isArray(sig)) return reply.code(400).send({ error: "missing_signature" });

      const raw = (request as unknown as { rawBody?: Buffer | string }).rawBody;
      if (!raw) return reply.code(400).send({ error: "raw_body_missing" });

      let event: Stripe.Event;
      try {
        event = stripeClient.webhooks.constructEvent(raw, sig, secret);
      } catch (err) {
        return reply.code(400).send({ error: `webhook_verify_failed: ${err}` });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.metadata?.customer_id;
        const plan = session.metadata?.plan;
        if (customerId && plan && PLAN_CALL_LIMITS[plan] !== undefined) {
          await db
            .update(customers)
            .set({
              plan,
              apiCallsLimit: PLAN_CALL_LIMITS[plan],
              stripeCustomerId: typeof session.customer === "string" ? session.customer : undefined,
            })
            .where(eq(customers.id, customerId));
        }
      }
      return reply.send({ received: true });
    },
  );

  // ─────────────── NowPayments (crypto) ───────────────

  app.post<{ Body: { plan?: string } }>("/v1/billing/checkout", async (request, reply) => {
    if (!request.customer) return reply.code(401).send({ error: "auth_required" });
    if (!isAtlosConfigured()) return reply.code(503).send({ error: "crypto_checkout_not_configured" });
    const plan = (request.body?.plan ?? "").toLowerCase();
    if (!PLAN_PRICES[plan]) return reply.code(400).send({ error: "invalid_plan", available: Object.keys(PLAN_PRICES) });
    try {
      const invoice = await createInvoice({
        customerId: request.customer.id,
        plan: plan as "developer" | "growth" | "enterprise",
        successUrl: `${process.env.WEB_PUBLIC_URL ?? "http://localhost:3000"}/dashboard/billing?status=success`,
        cancelUrl: `${process.env.WEB_PUBLIC_URL ?? "http://localhost:3000"}/pricing`,
        userEmail: request.customer.email,
      });
      return reply.send({
        provider: "atlos",
        checkout_url: invoice.invoice_url,
        invoice_id: invoice.invoice_id,
        amount_usd: invoice.amount_usd,
      });
    } catch (err) {
      return reply.code(500).send({ error: `checkout_failed: ${err}` });
    }
  });

  app.post(
    "/v1/billing/atlos-ipn",
    { config: { rawBody: true } } as never,
    async (request, reply) => {
      if (!isAtlosConfigured()) return reply.code(503).send({ error: "crypto_checkout_not_configured" });
      const sigHeader = request.headers["signature"];
      const sig = Array.isArray(sigHeader) ? sigHeader[0] : sigHeader;
      if (!sig) return reply.code(400).send({ error: "missing_signature" });
      const raw = (request as unknown as { rawBody?: Buffer | string }).rawBody;
      if (!raw) return reply.code(400).send({ error: "raw_body_missing" });
      if (!verifyPostbackSignature(raw, sig)) {
        return reply.code(400).send({ error: "invalid_signature" });
      }

      const rawStr = typeof raw === "string" ? raw : raw.toString("utf8");
      const payload = JSON.parse(rawStr) as AtlosPostback;
      if (!isTerminalSuccess(payload.Status)) {
        return reply.send({ received: true, ignored: payload.Status });
      }
      const order = parseOrderId(payload.OrderId);
      if (!order) return reply.code(400).send({ error: "invalid_order_id" });
      if (!PLAN_CALL_LIMITS[order.plan]) return reply.code(400).send({ error: "unknown_plan" });

      await db
        .update(customers)
        .set({
          plan: order.plan,
          apiCallsLimit: PLAN_CALL_LIMITS[order.plan],
        })
        .where(eq(customers.id, order.customerId));

      request.log.info(
        { customerId: order.customerId, plan: order.plan, tx: payload.BlockchainHash, asset: payload.Asset },
        "atlos payment confirmed → plan upgraded",
      );
      return reply.send({ received: true, upgraded: order.plan });
    },
  );

  app.get("/v1/billing/plans", async (_request, reply) => {
    return reply.send({
      plans: Object.entries(PLAN_PRICES).map(([key, cfg]) => ({
        key,
        price_usd: cfg.amount_usd,
        description: cfg.description,
      })),
      crypto_available: isAtlosConfigured(),
      crypto_provider: "atlos",
      cards_available: Boolean(process.env.STRIPE_SECRET_KEY),
    });
  });
}
