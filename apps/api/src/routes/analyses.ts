import { and, asc, desc, eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addressScores, analyses, clusters, db } from "../db/index.js";
import { enqueueAnalysis } from "../services/pipeline-client.js";

const CreateAnalysisSchema = z.object({
  name: z.string().min(1).max(200),
  chains: z.array(z.string()).min(1).max(8),
  addresses: z.array(z.string().regex(/^0x[0-9a-fA-F]{40}$/)).optional(),
  addresses_file_url: z.string().url().optional(),
  sensitivity: z.enum(["strict", "balanced", "lenient"]).default("balanced"),
  include_evidence: z.boolean().default(true),
});

export async function analysesRoutes(app: FastifyInstance): Promise<void> {
  app.post("/v1/analyses", async (request, reply) => {
    const parsed = CreateAnalysisSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
    }
    const body = parsed.data;
    if (!body.addresses && !body.addresses_file_url) {
      return reply.code(400).send({ error: "addresses_or_file_url_required" });
    }
    const addressCount = body.addresses?.length ?? 0;
    const customerId = request.customer!.id;

    const [created] = await db
      .insert(analyses)
      .values({
        customerId,
        name: body.name,
        chains: body.chains,
        addressCount,
        addressesFileUrl: body.addresses_file_url,
        sensitivity: body.sensitivity,
        includeEvidence: body.include_evidence,
        status: "pending",
      })
      .returning();

    await enqueueAnalysis({
      analysisId: created!.id,
      addresses: body.addresses ?? [],
      addressesFileUrl: body.addresses_file_url,
      chains: body.chains,
      sensitivity: body.sensitivity,
    });

    return reply.code(202).send({
      id: created!.id,
      status: created!.status,
      address_count: addressCount,
      estimated_time_minutes: estimateMinutes(addressCount),
    });
  });

  app.get("/v1/analyses", async (request, reply) => {
    const rows = await db
      .select()
      .from(analyses)
      .where(eq(analyses.customerId, request.customer!.id))
      .orderBy(desc(analyses.createdAt))
      .limit(50);
    return reply.send({ data: rows });
  });

  app.get<{ Params: { id: string } }>("/v1/analyses/:id", async (request, reply) => {
    const [row] = await db
      .select()
      .from(analyses)
      .where(and(eq(analyses.id, request.params.id), eq(analyses.customerId, request.customer!.id)));
    if (!row) return reply.code(404).send({ error: "not_found" });
    return reply.send({
      id: row.id,
      status: row.status,
      name: row.name,
      chains: row.chains,
      address_count: row.addressCount,
      summary: row.status === "complete"
        ? {
            total_scored: row.totalScored,
            sybil_count: row.sybilCount,
            suspicious_count: row.suspiciousCount,
            genuine_count: row.genuineCount,
            cluster_count: row.clusterCount,
            largest_cluster_size: row.largestClusterSize,
          }
        : undefined,
      processing_time_seconds: row.processingTimeSeconds,
      created_at: row.createdAt,
      completed_at: row.completedAt,
      results_csv_url: row.resultsFileUrl,
    });
  });

  app.get<{ Params: { id: string }; Querystring: { page?: string; limit?: string; label?: string } }>(
    "/v1/analyses/:id/results",
    async (request, reply) => {
      const [analysis] = await db
        .select()
        .from(analyses)
        .where(
          and(eq(analyses.id, request.params.id), eq(analyses.customerId, request.customer!.id)),
        );
      if (!analysis) return reply.code(404).send({ error: "not_found" });

      const limit = Math.min(1000, Number(request.query.limit ?? 100));
      const page = Math.max(0, Number(request.query.page ?? 0));
      const baseConditions = [eq(addressScores.analysisId, request.params.id)];
      if (request.query.label) {
        baseConditions.push(eq(addressScores.label, request.query.label));
      }

      const rows = await db
        .select()
        .from(addressScores)
        .where(and(...baseConditions))
        .orderBy(desc(addressScores.sybilScore), asc(addressScores.address))
        .limit(limit)
        .offset(page * limit);

      return reply.send({
        data: rows.map((r) => ({
          address: r.address,
          chain: r.chain,
          sybil_score: r.sybilScore,
          label: r.label,
          confidence: r.confidence,
          cluster_id: r.clusterId,
          cluster_size: r.clusterSize,
          evidence: r.evidence,
        })),
        page,
        limit,
      });
    },
  );

  app.get<{ Params: { id: string } }>(
    "/v1/analyses/:id/results/export",
    async (request, reply) => {
      const [analysis] = await db
        .select()
        .from(analyses)
        .where(
          and(eq(analyses.id, request.params.id), eq(analyses.customerId, request.customer!.id)),
        );
      if (!analysis) return reply.code(404).send({ error: "not_found" });

      const rows = await db
        .select()
        .from(addressScores)
        .where(eq(addressScores.analysisId, request.params.id))
        .orderBy(desc(addressScores.sybilScore));

      const header = "address,chain,sybil_score,label,confidence,cluster_id,cluster_size\n";
      const body = rows
        .map(
          (r) =>
            `${r.address},${r.chain},${r.sybilScore},${r.label},${r.confidence ?? ""},${r.clusterId ?? ""},${r.clusterSize ?? ""}`,
        )
        .join("\n");
      reply.header("content-type", "text/csv");
      reply.header("content-disposition", `attachment; filename="analysis-${request.params.id}.csv"`);
      return reply.send(header + body);
    },
  );

  app.get<{ Params: { id: string } }>("/v1/analyses/:id/clusters", async (request, reply) => {
    const [analysis] = await db
      .select()
      .from(analyses)
      .where(
        and(eq(analyses.id, request.params.id), eq(analyses.customerId, request.customer!.id)),
      );
    if (!analysis) return reply.code(404).send({ error: "not_found" });
    const rows = await db
      .select()
      .from(clusters)
      .where(eq(clusters.analysisId, request.params.id))
      .orderBy(desc(clusters.size));
    return reply.send({
      data: rows.map((c) => ({
        cluster_id: c.clusterId,
        size: c.size,
        detection_method: c.detectionMethod,
        evidence: c.evidenceSummary,
        avg_sybil_score: c.avgSybilScore,
      })),
    });
  });
}

function estimateMinutes(n: number): number {
  // Rough Alchemy-Scale throughput: ~10 req/sec, 2 calls per address.
  return Math.max(2, Math.ceil((n * 2) / 10 / 60));
}
