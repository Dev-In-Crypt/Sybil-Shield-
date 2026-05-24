import { and, desc, eq, isNull, sql as drizzleSql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, notifications } from "../db/index.js";

const ListQuery = z.object({
  unread: z.enum(["true", "false"]).optional(),
  kind: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
  cursor: z.string().uuid().optional(),
});

export async function notificationsRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: z.infer<typeof ListQuery> }>("/v1/notifications", async (req, reply) => {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_query", details: parsed.error.flatten() });
    const q = parsed.data;
    const conds = [eq(notifications.customerId, req.customer!.id)];
    if (q.unread === "true") conds.push(isNull(notifications.readAt));
    if (q.kind) conds.push(eq(notifications.kind, q.kind));
    const rows = await db
      .select()
      .from(notifications)
      .where(and(...conds))
      .orderBy(desc(notifications.createdAt))
      .limit(q.limit);
    const unreadCount = await db
      .select({ c: drizzleSql<number>`count(*)::int` })
      .from(notifications)
      .where(and(eq(notifications.customerId, req.customer!.id), isNull(notifications.readAt)));
    return reply.send({
      data: rows.map((r) => ({
        id: r.id,
        kind: r.kind,
        title: r.title,
        body: r.body,
        link: r.link,
        read: Boolean(r.readAt),
        read_at: r.readAt,
        created_at: r.createdAt,
      })),
      unread_count: unreadCount[0]?.c ?? 0,
    });
  });

  app.post<{ Params: { id: string } }>("/v1/notifications/:id/read", async (req, reply) => {
    const [row] = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.id, req.params.id), eq(notifications.customerId, req.customer!.id)))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return reply.send({ id: row.id, read_at: row.readAt });
  });

  app.post("/v1/notifications/read-all", async (req, reply) => {
    const result = await db
      .update(notifications)
      .set({ readAt: new Date() })
      .where(and(eq(notifications.customerId, req.customer!.id), isNull(notifications.readAt)));
    return reply.send({ marked_read: (result as unknown as { count?: number }).count ?? 0 });
  });
}

/** Helper used by worker / appeals route to create a notification. */
export async function createNotification(args: {
  customerId: string;
  kind: "analysis_complete" | "drift_alert" | "appeal_received" | "payment_processed" | "team_invite";
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  await db.insert(notifications).values({
    customerId: args.customerId,
    kind: args.kind,
    title: args.title,
    body: args.body,
    link: args.link,
  });
}
