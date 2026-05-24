import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { customers, db } from "../db/index.js";
import { generateApiKey } from "../lib/api-keys.js";
import { generateWebhookSecret } from "../services/webhooks.js";

const RegisterSchema = z.object({
  email: z.string().email(),
  name: z.string().optional(),
  company: z.string().optional(),
});

/** Public routes - no auth required. */
export async function publicAuthRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/account/register", async (request, reply) => {
    const parsed = RegisterSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const { email, name, company } = parsed.data;

    const existing = await db.select().from(customers).where(eq(customers.email, email));
    if (existing.length > 0) {
      return reply.code(409).send({ error: "email_exists" });
    }

    const apiKey = generateApiKey("live");
    const [created] = await db
      .insert(customers)
      .values({
        email,
        name,
        company,
        plan: "free",
        apiKeyHash: apiKey.hash,
        apiKeyPrefix: apiKey.prefix,
      })
      .returning();

    return reply.code(201).send({
      id: created!.id,
      email: created!.email,
      plan: created!.plan,
      api_key: apiKey.key,
      api_key_prefix: apiKey.prefix,
      warning: "Save this API key now - it cannot be retrieved later.",
    });
  });
}

/** Authenticated account routes. */
export async function authedAccountRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/account/api-keys/rotate", async (request, reply) => {
    const apiKey = generateApiKey("live");
    await db
      .update(customers)
      .set({ apiKeyHash: apiKey.hash, apiKeyPrefix: apiKey.prefix })
      .where(eq(customers.id, request.customer!.id));
    return reply.send({
      api_key: apiKey.key,
      api_key_prefix: apiKey.prefix,
    });
  });

  app.post("/v1/account/webhooks", async (request, reply) => {
    const parsed = z.object({ url: z.string().url() }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_url" });
    const secret = generateWebhookSecret();
    await db
      .update(customers)
      .set({ webhookUrl: parsed.data.url, webhookSecret: secret })
      .where(eq(customers.id, request.customer!.id));
    return reply.send({
      webhook_url: parsed.data.url,
      secret,
      warning: "Save the secret now - it cannot be retrieved later.",
    });
  });

  app.delete("/v1/account/webhooks", async (request, reply) => {
    await db
      .update(customers)
      .set({ webhookUrl: null, webhookSecret: null })
      .where(eq(customers.id, request.customer!.id));
    return reply.code(204).send();
  });

  app.get("/v1/account", async (request, reply) => {
    const c = request.customer!;
    return reply.send({
      id: c.id,
      email: c.email,
      plan: c.plan,
      api_key_prefix: c.apiKeyPrefix,
      webhook_configured: Boolean(c.webhookUrl),
      usage: {
        calls_this_month: c.apiCallsThisMonth,
        limit: c.apiCallsLimit,
      },
    });
  });
}
