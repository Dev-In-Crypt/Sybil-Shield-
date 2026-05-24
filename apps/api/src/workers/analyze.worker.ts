/**
 * Worker that drains the analyses queue and forwards jobs to the Python ML
 * service. Updates `analyses` row status as it progresses, writes results into
 * `address_scores` and `clusters`.
 *
 * Run: tsx src/workers/analyze.worker.ts
 */
import { Worker } from "bullmq";
import { eq } from "drizzle-orm";
import IORedis from "ioredis";
import { addressScores, analyses, clusters, customers, db, evidenceAuditLog } from "../db/index.js";
import { createNotification } from "../routes/notifications.js";
import { recordDelivery } from "../routes/webhook-deliveries.js";
import { deliverWebhook } from "../services/webhooks.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8001";

interface AnalysisJob {
  analysisId: string;
  addresses: string[];
  addressesFileUrl?: string;
  chains: string[];
  sensitivity: string;
}

interface MLScore {
  address: string;
  chain?: string;
  sybil_score: number;
  label: string;
  confidence: number;
  cluster_id: string | null;
  cluster_size: number | null;
  evidence: unknown;
}

interface MLClusterOut {
  id: string;
  method: string;
  size: number;
  confidence: number;
  evidence: string;
}

interface MLResponse {
  analysis_id: string;
  summary: {
    total_scored: number;
    sybil_count: number;
    suspicious_count: number;
    genuine_count: number;
    cluster_count: number;
    largest_cluster_size: number;
  };
  scores: MLScore[];
  clusters: MLClusterOut[];
  cu_consumed: number;
}

async function fetchAddressesFromUrl(url: string): Promise<string[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  const csv = await r.text();
  const lines = csv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  // Skip optional header row
  const start = /^0x[0-9a-fA-F]{40}$/.test(lines[0] ?? "") ? 0 : 1;
  const out: string[] = [];
  for (let i = start; i < lines.length; i++) {
    const cell = (lines[i] ?? "").split(",")[0]?.trim().toLowerCase();
    if (cell && /^0x[0-9a-f]{40}$/.test(cell)) out.push(cell);
  }
  return out;
}

async function runAnalysis(job: AnalysisJob): Promise<void> {
  const startedAt = new Date();
  await db
    .update(analyses)
    .set({ status: "ingesting", startedAt })
    .where(eq(analyses.id, job.analysisId));

  let addresses = job.addresses;
  if ((!addresses || addresses.length === 0) && job.addressesFileUrl) {
    addresses = await fetchAddressesFromUrl(job.addressesFileUrl);
  }
  if (!addresses || addresses.length === 0) {
    throw new Error("no addresses to analyze");
  }

  const resp = await fetch(`${ML_SERVICE_URL}/run`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      analysis_id: job.analysisId,
      addresses,
      chains: job.chains,
    }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`ML service failed: ${resp.status} ${text}`);
  }
  const result = (await resp.json()) as MLResponse;

  // Look up the customer (for webhook delivery later)
  const [analysisRow] = await db
    .select({ customerId: analyses.customerId })
    .from(analyses)
    .where(eq(analyses.id, job.analysisId));

  const defaultChain = job.chains[0] ?? "ethereum";

  await db.transaction(async (tx) => {
    if (result.scores.length > 0) {
      await tx.insert(addressScores).values(
        result.scores.map((s) => ({
          analysisId: job.analysisId,
          address: s.address.toLowerCase(),
          chain: s.chain ?? defaultChain,
          sybilScore: s.sybil_score,
          confidence: s.confidence?.toFixed(3),
          label: s.label,
          clusterId: s.cluster_id ?? undefined,
          clusterSize: s.cluster_size ?? undefined,
          features: {},
          evidence: s.evidence ?? [],
        })),
      );
    }
    // Write audit log entries for every flagged/suspicious score.
    const auditActor = `system:${process.env.ML_MODEL_VERSION ?? "rule_based"}`;
    const auditRows = result.scores
      .filter((s) => s.sybil_score >= 40)
      .map((s) => ({
        analysisId: job.analysisId,
        address: s.address.toLowerCase(),
        chain: s.chain ?? defaultChain,
        eventType: "flagged" as const,
        actor: auditActor,
        priorScore: undefined,
        newScore: s.sybil_score,
        reason: s.label,
        evidenceSnapshot: s.evidence ?? null,
      }));
    if (auditRows.length > 0) {
      await tx.insert(evidenceAuditLog).values(auditRows);
    }

    if (result.clusters.length > 0) {
      await tx.insert(clusters).values(
        result.clusters.map((c) => ({
          analysisId: job.analysisId,
          clusterId: c.id,
          size: c.size,
          detectionMethod: c.method,
          evidenceSummary: c.evidence,
        })),
      );
    }
    const completedAt = new Date();
    await tx
      .update(analyses)
      .set({
        status: "complete",
        completedAt,
        processingTimeSeconds: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
        totalScored: result.summary.total_scored,
        sybilCount: result.summary.sybil_count,
        suspiciousCount: result.summary.suspicious_count,
        genuineCount: result.summary.genuine_count,
        clusterCount: result.summary.cluster_count,
        largestClusterSize: result.summary.largest_cluster_size,
        cuConsumed: result.cu_consumed,
      })
      .where(eq(analyses.id, job.analysisId));
  });

  // After commit: notification + webhook delivery (best-effort, no rollback)
  if (analysisRow) {
    await createNotification({
      customerId: analysisRow.customerId,
      kind: "analysis_complete",
      title: `Analysis complete — ${result.summary.sybil_count} sybils flagged`,
      body: `${result.summary.total_scored} addresses scored across ${job.chains.join(", ")}.`,
      link: `/dashboard/analyses/${job.analysisId}`,
    });

    const [cust] = await db
      .select({ webhookUrl: customers.webhookUrl, webhookSecret: customers.webhookSecret })
      .from(customers)
      .where(eq(customers.id, analysisRow.customerId));
    if (cust?.webhookUrl && cust.webhookSecret) {
      const delivery = await deliverWebhook(cust.webhookUrl, cust.webhookSecret, {
        type: "analysis.completed",
        analysisId: job.analysisId,
        data: result.summary,
      });
      await recordDelivery({
        customerId: analysisRow.customerId,
        analysisId: job.analysisId,
        url: cust.webhookUrl,
        eventType: "analysis.completed",
        payload: result.summary,
        statusCode: delivery.status,
        error: delivery.error,
      });
      if (!delivery.ok) {
        console.warn(`[worker] webhook delivery failed for ${job.analysisId}:`, delivery);
      }
    }
  }
}

export function startWorker(): Worker {
  const conn = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });
  const worker = new Worker<AnalysisJob>(
    "sybilshield-analyses",
    async (job) => {
      try {
        await runAnalysis(job.data);
      } catch (err) {
        await db
          .update(analyses)
          .set({ status: "failed" })
          .where(eq(analyses.id, job.data.analysisId));
        throw err;
      }
    },
    {
      connection: conn,
      concurrency: Number(process.env.WORKER_CONCURRENCY ?? 2),
    },
  );

  worker.on("completed", (job) => {
    console.log(`[worker] completed: ${job.id} (analysis=${job.data.analysisId})`);
  });
  worker.on("failed", (job, err) => {
    console.error(`[worker] failed: ${job?.id}`, err);
  });

  return worker;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startWorker();
  console.log("[worker] started, draining sybilshield:analyses");
}
