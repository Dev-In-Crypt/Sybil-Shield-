/**
 * Public appeal endpoint.
 *
 * Anyone (not just our customers) can dispute a sybil score on their own
 * wallet. Submission writes to `feedback` (verdict=false_positive) and the
 * audit log, ready for reviewer action.
 *
 * Anti-abuse: per-IP rate limit (10/hour). No PII required, just the address
 * and a written explanation. Caller's signature would be best but optional
 * for v1 - we accept claims and route them to manual review.
 */
import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addressScores, analyses, db, feedback } from "../db/index.js";
import { writeAudit } from "../services/audit.js";
import { createNotification } from "./notifications.js";

const AppealSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chain: z.string().default("ethereum"),
  reason: z.string().min(20).max(2000),
  contact_email: z.string().email().optional(),
});

export async function appealsRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/appeals",
    {
      config: {
        rateLimit: { max: 10, timeWindow: "1 hour" },
      },
    },
    async (request, reply) => {
      const parsed = AppealSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
      }
      const { address, chain, reason, contact_email } = parsed.data;
      const norm = address.toLowerCase();

      // Find the most recent score on this address (for the audit prior_score).
      const [latest] = await db
        .select()
        .from(addressScores)
        .where(and(eq(addressScores.address, norm), eq(addressScores.chain, chain)))
        .orderBy(desc(addressScores.createdAt))
        .limit(1);

      if (!latest) {
        return reply.code(404).send({ error: "address_not_scored" });
      }

      // Persist as feedback (customer_id is null for public appeals).
      await db.insert(feedback).values({
        customerId: null,
        analysisId: latest.analysisId,
        address: norm,
        chain,
        verdict: "false_positive",
        evidence: contact_email ? `[contact:${contact_email}] ${reason}` : reason,
        source: "public_appeal",
      });

      await writeAudit({
        analysisId: latest.analysisId,
        address: norm,
        chain,
        eventType: "appealed",
        actor: "public:anonymous",
        priorScore: latest.sybilScore,
        reason,
      });

      // Notify the analysis owner
      const [parent] = await db
        .select({ customerId: analyses.customerId, name: analyses.name })
        .from(analyses)
        .where(eq(analyses.id, latest.analysisId));
      if (parent) {
        await createNotification({
          customerId: parent.customerId,
          kind: "appeal_received",
          title: `New appeal on ${parent.name}`,
          body: `Address ${norm.slice(0, 10)}… disputed (score was ${latest.sybilScore})`,
          link: `/dashboard/analyses/${latest.analysisId}`,
        });
      }

      return reply.code(202).send({
        status: "received",
        message: "Appeal recorded. A reviewer will examine the case within 48 hours.",
        reference: latest.analysisId,
      });
    },
  );

  app.get("/v1/appeals/policy", async (_request, reply) => {
    return reply.send({
      policy: "SybilShield appeals policy",
      response_time_hours: 48,
      contact: "support@sybilshield.org",
      what_we_review: [
        "Evidence of legitimate use of the flagged address",
        "Proof of identity (Gitcoin Passport, ENS, KYC) on request",
        "Counter-evidence to specific clusters or pattern matches",
      ],
      decision_outcomes: ["reversed", "confirmed", "no_change"],
    });
  });
}
