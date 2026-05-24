import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, watchlist } from "../db/index.js";

const AddBody = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chain: z.string().default("ethereum"),
  label: z.string().max(120).optional(),
  alert_on_change: z.boolean().default(false),
});

export async function watchlistRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/watchlist", async (req, reply) => {
    const rows = await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.customerId, req.customer!.id))
      .orderBy(desc(watchlist.addedAt));
    return reply.send({
      data: rows.map((r) => ({
        id: r.id,
        address: r.address,
        chain: r.chain,
        label: r.label,
        alert_on_change: r.alertOnChange,
        added_at: r.addedAt,
      })),
    });
  });

  app.post("/v1/watchlist", async (req, reply) => {
    const parsed = AddBody.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    const v = parsed.data;
    try {
      const [row] = await db
        .insert(watchlist)
        .values({
          customerId: req.customer!.id,
          address: v.address.toLowerCase(),
          chain: v.chain,
          label: v.label,
          alertOnChange: v.alert_on_change,
        })
        .returning();
      return reply.code(201).send({
        id: row!.id,
        address: row!.address,
        chain: row!.chain,
        label: row!.label,
        alert_on_change: row!.alertOnChange,
      });
    } catch (err) {
      const msg = String(err);
      if (msg.includes("idx_watch_uniq") || msg.includes("duplicate")) {
        return reply.code(409).send({ error: "already_in_watchlist" });
      }
      throw err;
    }
  });

  app.delete<{ Params: { id: string } }>("/v1/watchlist/:id", async (req, reply) => {
    const [row] = await db
      .delete(watchlist)
      .where(and(eq(watchlist.id, req.params.id), eq(watchlist.customerId, req.customer!.id)))
      .returning();
    if (!row) return reply.code(404).send({ error: "not_found" });
    return reply.code(204).send();
  });
}
