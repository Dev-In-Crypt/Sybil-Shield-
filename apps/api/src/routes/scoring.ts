import { and, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addressScores, db, knownEntities } from "../db/index.js";

const AddressParam = z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{40}$/) });

const BatchSchema = z.object({
  addresses: z.array(z.string().regex(/^0x[0-9a-fA-F]{40}$/)).min(1).max(100),
  chain: z.string().default("ethereum"),
});

/**
 * Public read-only score lookup. Promised on the Trust page as a free
 * public-good endpoint — no API key required. Returns the most recent
 * cached score for the address (does NOT trigger fresh analysis).
 */
export async function publicScoringRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { address: string }; Querystring: { chain?: string } }>(
    "/v1/score/:address",
    async (request, reply) => {
      const parsed = AddressParam.safeParse(request.params);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_address" });
      const chain = request.query.chain ?? "ethereum";
      const address = parsed.data.address.toLowerCase();

      const [score] = await db
        .select()
        .from(addressScores)
        .where(and(eq(addressScores.address, address), eq(addressScores.chain, chain)))
        .orderBy(desc(addressScores.createdAt))
        .limit(1);
      if (!score) {
        return reply.code(404).send({ error: "not_scored", message: "address not in any analysis yet" });
      }
      return reply.send({
        address: score.address,
        chain: score.chain,
        sybil_score: score.sybilScore,
        confidence: score.confidence,
        label: score.label,
        cluster_id: score.clusterId,
        cluster_size: score.clusterSize,
        evidence: score.evidence,
      });
    },
  );
}

export async function scoringRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/score/batch", async (request, reply) => {
    const parsed = BatchSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const { addresses, chain } = parsed.data;
    const normalized = addresses.map((a) => a.toLowerCase());

    const results = [];
    for (const addr of normalized) {
      const [s] = await db
        .select()
        .from(addressScores)
        .where(and(eq(addressScores.address, addr), eq(addressScores.chain, chain)))
        .orderBy(desc(addressScores.createdAt))
        .limit(1);
      results.push({
        address: addr,
        chain,
        sybil_score: s?.sybilScore ?? null,
        label: s?.label ?? "unknown",
        cluster_id: s?.clusterId ?? null,
      });
    }
    return reply.send({ data: results });
  });

  app.get<{ Params: { address: string }; Querystring: { chain?: string } }>(
    "/v1/entities/:address",
    async (request, reply) => {
      const parsed = AddressParam.safeParse(request.params);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_address" });
      const chain = request.query.chain ?? "ethereum";
      const address = parsed.data.address.toLowerCase();

      const [entity] = await db
        .select()
        .from(knownEntities)
        .where(and(eq(knownEntities.address, address), eq(knownEntities.chain, chain)));
      if (!entity) return reply.code(404).send({ error: "not_known" });
      return reply.send({
        address: entity.address,
        chain: entity.chain,
        label: entity.entityLabel,
        times_flagged: entity.timesFlagged,
        avg_score: entity.avgScore,
        source: entity.source,
      });
    },
  );
}
