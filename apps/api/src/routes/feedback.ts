import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db, feedback } from "../db/index.js";
import { verdictToEventType, writeAudit } from "../services/audit.js";

const FeedbackSchema = z.object({
  analysis_id: z.string().uuid().optional(),
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chain: z.string().default("ethereum"),
  verdict: z.enum(["false_positive", "false_negative", "confirmed"]),
  evidence: z.string().max(2000).optional(),
});

export async function feedbackRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/feedback", async (request, reply) => {
    const parsed = FeedbackSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const body = parsed.data;
    const [created] = await db
      .insert(feedback)
      .values({
        customerId: request.customer!.id,
        analysisId: body.analysis_id,
        address: body.address.toLowerCase(),
        chain: body.chain,
        verdict: body.verdict,
        evidence: body.evidence,
      })
      .returning();

    if (body.analysis_id) {
      await writeAudit({
        analysisId: body.analysis_id,
        address: body.address,
        chain: body.chain,
        eventType: verdictToEventType(body.verdict),
        actor: `customer:${request.customer!.id}`,
        reason: body.evidence,
      });
    }

    return reply.code(201).send({ id: created!.id, status: "recorded" });
  });
}
