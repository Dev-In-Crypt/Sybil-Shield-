import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { customers, db, webhookDeliveries } from "../db/index.js";
import { deliverWebhook } from "../services/webhooks.js";

const ListQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  analysis_id: z.string().uuid().optional(),
});

export async function webhookDeliveriesRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: z.infer<typeof ListQuery> }>("/v1/webhooks/deliveries", async (req, reply) => {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_query" });
    const conds = [eq(webhookDeliveries.customerId, req.customer!.id)];
    if (parsed.data.analysis_id) conds.push(eq(webhookDeliveries.analysisId, parsed.data.analysis_id));
    const rows = await db
      .select()
      .from(webhookDeliveries)
      .where(and(...conds))
      .orderBy(desc(webhookDeliveries.sentAt))
      .limit(parsed.data.limit);
    return reply.send({
      data: rows.map((r) => ({
        id: r.id,
        analysis_id: r.analysisId,
        url: r.url,
        event_type: r.eventType,
        status_code: r.statusCode,
        error: r.error,
        attempts: r.attempts,
        success: typeof r.statusCode === "number" && r.statusCode >= 200 && r.statusCode < 300,
        sent_at: r.sentAt,
        completed_at: r.completedAt,
      })),
    });
  });

  app.get<{ Params: { id: string } }>("/v1/webhooks/deliveries/:id", async (req, reply) => {
    const [row] = await db
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.id, req.params.id), eq(webhookDeliveries.customerId, req.customer!.id)));
    if (!row) return reply.code(404).send({ error: "not_found" });
    return reply.send({
      id: row.id,
      url: row.url,
      event_type: row.eventType,
      payload: row.payload,
      status_code: row.statusCode,
      response_body: row.responseBody,
      error: row.error,
      attempts: row.attempts,
      sent_at: row.sentAt,
      completed_at: row.completedAt,
    });
  });

  app.post<{ Params: { id: string } }>("/v1/webhooks/deliveries/:id/retry", async (req, reply) => {
    const [row] = await db
      .select()
      .from(webhookDeliveries)
      .where(and(eq(webhookDeliveries.id, req.params.id), eq(webhookDeliveries.customerId, req.customer!.id)));
    if (!row) return reply.code(404).send({ error: "not_found" });
    const [cust] = await db
      .select({ secret: customers.webhookSecret })
      .from(customers)
      .where(eq(customers.id, req.customer!.id));
    if (!cust?.secret) return reply.code(400).send({ error: "no_webhook_secret_configured" });
    const result = await deliverWebhook(row.url, cust.secret, {
      type: row.eventType,
      analysisId: row.analysisId ?? "",
      data: row.payload,
    });
    const completedAt = new Date();
    await db
      .update(webhookDeliveries)
      .set({
        statusCode: result.status,
        responseBody: null,
        error: result.error,
        attempts: row.attempts + 1,
        completedAt,
      })
      .where(eq(webhookDeliveries.id, row.id));
    return reply.send({ ok: result.ok, status: result.status, attempts: row.attempts + 1 });
  });

  app.post("/v1/webhooks/test", async (req, reply) => {
    const [cust] = await db
      .select({ url: customers.webhookUrl, secret: customers.webhookSecret })
      .from(customers)
      .where(eq(customers.id, req.customer!.id));
    if (!cust?.url || !cust?.secret) {
      return reply.code(400).send({ error: "webhook_not_configured" });
    }
    const event = {
      type: "webhook.test",
      analysisId: "00000000-0000-0000-0000-000000000000",
      data: { message: "Test event from SybilShield", sentAt: new Date().toISOString() },
    };
    const result = await deliverWebhook(cust.url, cust.secret, event);
    await db.insert(webhookDeliveries).values({
      customerId: req.customer!.id,
      url: cust.url,
      eventType: "webhook.test",
      payload: event.data,
      statusCode: result.status,
      error: result.error,
      attempts: 1,
      completedAt: new Date(),
    });
    return reply.send({ delivered: result.ok, status: result.status, error: result.error });
  });
}

/** Helper used by worker to log a webhook attempt. */
export async function recordDelivery(args: {
  customerId: string;
  analysisId: string;
  url: string;
  eventType: string;
  payload: unknown;
  statusCode?: number;
  error?: string;
}): Promise<void> {
  await db.insert(webhookDeliveries).values({
    customerId: args.customerId,
    analysisId: args.analysisId,
    url: args.url,
    eventType: args.eventType,
    payload: args.payload,
    statusCode: args.statusCode,
    error: args.error,
    completedAt: new Date(),
  });
}
