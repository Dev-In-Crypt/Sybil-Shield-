import { and, asc, desc, eq, gt, inArray, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { addressScores, analyses, clusters, db } from "../db/index.js";
import { planLimits } from "../middleware/auth.js";
import { enqueueAnalysis } from "../services/pipeline-client.js";

const CreateAnalysisSchema = z.object({
  name: z.string().min(1).max(200),
  chains: z.array(z.string()).min(1).max(8),
  addresses: z.array(z.string().regex(/^0x[0-9a-fA-F]{40}$/)).optional(),
  addresses_file_url: z.string().url().optional(),
  sensitivity: z.enum(["strict", "balanced", "lenient"]).default("balanced"),
  include_evidence: z.boolean().default(true),
  // Decision preset — drives the server-side DROP/REVIEW/KEEP verdict
  // computed at worker time. See apps/api/src/lib/presets.ts for thresholds.
  preset: z.enum(["airdrop", "dao", "grant", "balanced"]).default("balanced"),
  // "full" runs the ML scoring pipeline; "cluster_only" short-circuits it
  // and returns only multi-wallet cluster groupings.
  mode: z.enum(["full", "cluster_only"]).default("full"),
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
    const planCfg = planLimits(request.customer!.plan);

    // Block 1 — address-count cap. Dashboard /dashboard/new caps at 1000
    // client-side, but raw API submitters bypass that. When the caller used
    // addresses_file_url the body array is empty here (addressCount=0) and
    // the cap is enforced AGAIN in the worker after the URL is fetched —
    // see fetchAddressesFromUrl in analyze.worker.ts.
    if (addressCount > planCfg.maxAddressesPerAnalysis) {
      return reply.code(400).send({
        error: "too_many_addresses",
        limit: planCfg.maxAddressesPerAnalysis,
        submitted: addressCount,
        plan: request.customer!.plan,
        upgrade_url: `${process.env.WEB_PUBLIC_URL ?? ""}/pricing`,
      });
    }

    // Block 5 — pre-flight CU budget check. Rough heuristic: ~5 CU per
    // address in full mode (one ML inference + a handful of feature RPCs),
    // ~3 CU in cluster_only (skips the ML pass). The worker still hard-caps
    // on the real cu_consumed reported by the Python pipeline.
    const estimatedCu = addressCount * (body.mode === "cluster_only" ? 3 : 5);
    if (estimatedCu > planCfg.maxCuPerAnalysis) {
      return reply.code(400).send({
        error: "estimated_cu_exceeds_budget",
        estimated_cu: estimatedCu,
        limit: planCfg.maxCuPerAnalysis,
        plan: request.customer!.plan,
        suggestion: "trim addresses, switch to mode=cluster_only, or upgrade your plan",
        upgrade_url: `${process.env.WEB_PUBLIC_URL ?? ""}/pricing`,
      });
    }

    // Block 2 — concurrent in-flight cap. Excludes rows older than 1 hour
    // in case the worker died mid-job and left a stale "pending" row; it
    // would otherwise block the customer forever.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const inFlight = await db
      .select({ id: analyses.id })
      .from(analyses)
      .where(
        and(
          eq(analyses.customerId, customerId),
          inArray(analyses.status, ["pending", "ingesting"]),
          gt(analyses.createdAt, oneHourAgo),
        ),
      );
    if (inFlight.length >= planCfg.maxConcurrent) {
      return reply.code(429).send({
        error: "concurrent_limit_exceeded",
        limit: planCfg.maxConcurrent,
        in_flight: inFlight.length,
        plan: request.customer!.plan,
        retry_when: "wait for one of your running analyses to complete",
        upgrade_url: `${process.env.WEB_PUBLIC_URL ?? ""}/pricing`,
      });
    }

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
        preset: body.preset,
        mode: body.mode,
        status: "pending",
      })
      .returning();

    await enqueueAnalysis({
      analysisId: created!.id,
      addresses: body.addresses ?? [],
      addressesFileUrl: body.addresses_file_url,
      chains: body.chains,
      sensitivity: body.sensitivity,
      preset: body.preset,
      mode: body.mode,
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
      preset: row.preset,
      mode: row.mode,
      summary: row.status === "complete"
        ? {
            total_scored: row.totalScored,
            // Legacy label-based counters (score-band tallies)
            sybil_count: row.sybilCount,
            suspicious_count: row.suspiciousCount,
            genuine_count: row.genuineCount,
            // Decision counters (preset-aware) — preferred for new clients
            drop_count: row.dropCount,
            review_count: row.reviewCount,
            keep_count: row.keepCount,
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

  app.get<{
    Params: { id: string };
    Querystring: { page?: string; limit?: string; label?: string; decision?: string };
  }>(
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
      if (request.query.decision) {
        // Decision filter: DROP|REVIEW|KEEP. Case-insensitive accept.
        baseConditions.push(eq(addressScores.decision, request.query.decision.toUpperCase()));
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
          // Decision payload (preset-aware). Null on legacy rows or
          // cluster_only analyses where per-address verdicts don't apply.
          decision: r.decision,
          decision_confidence: r.decisionConfidence,
          rationale_codes: r.rationaleCodes,
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

      const header =
        "address,chain,sybil_score,label,decision,decision_confidence,confidence,cluster_id,cluster_size,rationale_codes\n";
      const body = rows
        .map(
          (r) =>
            `${r.address},${r.chain},${r.sybilScore},${r.label},${r.decision ?? ""},${r.decisionConfidence ?? ""},${r.confidence ?? ""},${r.clusterId ?? ""},${r.clusterSize ?? ""},${(r.rationaleCodes ?? []).join("|")}`,
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
