/**
 * GET /v1/audit-log
 *
 * Returns the customer-scoped audit-log slice. Auth required (Bearer).
 *
 * Query params:
 *   analysis_id   uuid          required — which analysis to read entries for
 *   limit         int (1..1000) default 100
 *   page          int (>=0)     default 0
 *   format        json|csv      default json
 *
 * Scope: the analysis must belong to the requesting customer. Otherwise we
 * return 404 (not 403) so we don't leak existence of other customers' analyses.
 */
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { analyses, db, evidenceAuditLog } from "../db/index.js";

const Query = z.object({
  analysis_id: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  page: z.coerce.number().int().min(0).default(0),
  format: z.enum(["json", "csv"]).default("json"),
});

export async function auditLogRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/audit-log", async (request, reply) => {
    const parsed = Query.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_query", details: parsed.error.flatten() });
    }
    const { analysis_id, limit, page, format } = parsed.data;

    // Tenant scope: confirm the analysis belongs to this customer
    const [owned] = await db
      .select({ id: analyses.id })
      .from(analyses)
      .where(and(eq(analyses.id, analysis_id), eq(analyses.customerId, request.customer!.id)));
    if (!owned) return reply.code(404).send({ error: "analysis_not_found" });

    const rows = await db
      .select({
        id: evidenceAuditLog.id,
        analysisId: evidenceAuditLog.analysisId,
        address: evidenceAuditLog.address,
        chain: evidenceAuditLog.chain,
        eventType: evidenceAuditLog.eventType,
        actor: evidenceAuditLog.actor,
        priorScore: evidenceAuditLog.priorScore,
        newScore: evidenceAuditLog.newScore,
        reason: evidenceAuditLog.reason,
        evidenceSnapshot: evidenceAuditLog.evidenceSnapshot,
        createdAt: evidenceAuditLog.createdAt,
      })
      .from(evidenceAuditLog)
      .where(eq(evidenceAuditLog.analysisId, analysis_id))
      .orderBy(desc(evidenceAuditLog.createdAt))
      .limit(limit)
      .offset(page * limit);

    if (format === "csv") {
      const header =
        "event_id,event_type,actor,address,chain,prior_score,new_score,reason,created_at";
      const body = rows
        .map((r) => {
          const cells = [
            r.id,
            r.eventType,
            r.actor,
            r.address,
            r.chain,
            r.priorScore ?? "",
            r.newScore ?? "",
            (r.reason ?? "").replace(/,/g, ";"),
            r.createdAt.toISOString(),
          ];
          return cells.join(",");
        })
        .join("\n");
      return reply
        .header("content-type", "text/csv")
        .header(
          "content-disposition",
          `attachment; filename="audit-log-${analysis_id}.csv"`,
        )
        .send(`${header}\n${body}\n`);
    }

    return reply.send({
      data: rows.map((r) => ({
        event_id: r.id,
        event_type: r.eventType,
        actor: r.actor,
        address: r.address,
        chain: r.chain,
        prior_score: r.priorScore,
        new_score: r.newScore,
        reason: r.reason,
        evidence_snapshot: r.evidenceSnapshot,
        created_at: r.createdAt,
      })),
      page,
      limit,
      analysis_id,
    });
  });
}
