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
import {
  computeDecision,
  evidenceToCodes,
  type DecisionPreset,
  type PresetOverrides,
} from "../lib/presets.js";
import { planLimits } from "../middleware/auth.js";
import { createNotification } from "../routes/notifications.js";
import { recordDelivery } from "../routes/webhook-deliveries.js";
import { emitAlert } from "../services/alerts.js";
import { deliverWebhook } from "../services/webhooks.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8001";

interface AnalysisJob {
  analysisId: string;
  addresses: string[];
  addressesFileUrl?: string;
  chains: string[];
  sensitivity: string;
  preset?: DecisionPreset;
  mode?: "full" | "cluster_only";
  thresholdOverrides?: PresetOverrides;
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

/**
 * Fetch a CSV/TXT of addresses from a customer-provided URL.
 *
 * Block 4 enforcement:
 *   - Respect Content-Length when the server sends it — bail BEFORE
 *     downloading the body if the file exceeds the customer's plan cap.
 *   - Post-hoc check after .text() in case Content-Length was missing/lying.
 *
 * `maxBytes` is the customer's PlanLimits.maxFileBytes (1MB on free).
 */
async function fetchAddressesFromUrl(url: string, maxBytes: number): Promise<string[]> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`fetch ${url} -> ${r.status}`);
  const contentLength = Number(r.headers.get("content-length") ?? 0);
  if (contentLength > maxBytes) {
    throw new Error(
      `addresses_file_url too large: ${contentLength} bytes (plan limit ${maxBytes}). Use a smaller file or upgrade your plan.`,
    );
  }
  const csv = await r.text();
  if (csv.length > maxBytes) {
    throw new Error(
      `addresses_file_url too large after read: ${csv.length} bytes (plan limit ${maxBytes}).`,
    );
  }
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

  // Need the customer's plan to enforce plan-specific caps on this run
  // (file size, address count, CU budget). Join now so we don't have to
  // re-query later.
  const [meta] = await db
    .select({ customerId: analyses.customerId, plan: customers.plan })
    .from(analyses)
    .innerJoin(customers, eq(analyses.customerId, customers.id))
    .where(eq(analyses.id, job.analysisId));
  const planCfg = planLimits(meta?.plan ?? "free");

  let addresses = job.addresses;
  if ((!addresses || addresses.length === 0) && job.addressesFileUrl) {
    addresses = await fetchAddressesFromUrl(job.addressesFileUrl, planCfg.maxFileBytes);
  }
  if (!addresses || addresses.length === 0) {
    throw new Error("no addresses to analyze");
  }
  // Second-pass address-count check — catches submissions via
  // addresses_file_url that bypass the route handler's check
  // (which only sees the empty body array).
  if (addresses.length > planCfg.maxAddressesPerAnalysis) {
    throw new Error(
      `URL contains ${addresses.length} addresses, exceeds plan limit ${planCfg.maxAddressesPerAnalysis}. Trim the file or upgrade your plan.`,
    );
  }

  // Pick the ML endpoint based on requested mode. cluster_only short-circuits
  // ML inference; the ML side returns clusters + addr_to_clusters and the
  // worker synthesises minimal "unscored" addressScores rows for addresses
  // that landed in any cluster (so the dashboard can show membership).
  const mode = job.mode ?? "full";
  const endpoint = mode === "cluster_only" ? "/cluster-only" : "/run";
  const resp = await fetch(`${ML_SERVICE_URL}${endpoint}`, {
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
  const rawResult = await resp.json();
  const result =
    mode === "cluster_only"
      ? normaliseClusterOnlyResponse(rawResult, addresses, job.chains[0] ?? "ethereum")
      : (rawResult as MLResponse);

  // Compute decisions per row using the preset (only meaningful for full mode).
  const preset: DecisionPreset = job.preset ?? "balanced";
  const overrides = job.thresholdOverrides;
  const enrichedScores = result.scores.map((s) => {
    if (mode === "cluster_only") {
      // No per-address verdict in cluster-only — null decision, but we still
      // store the row so the dashboard can show cluster membership.
      return { ...s, decision: null, decisionConfidence: null, rationaleCodes: [] as string[] };
    }
    const extraCodes = evidenceToCodes(s.evidence);
    const d = computeDecision(s.sybil_score, s.cluster_size, preset, extraCodes, overrides);
    return {
      ...s,
      decision: d.decision,
      decisionConfidence: d.confidence,
      rationaleCodes: d.rationale_codes,
    };
  });
  // Decision-aware tally (only computed when full mode produced decisions).
  let dropCount = 0;
  let reviewCount = 0;
  let keepCount = 0;
  for (const s of enrichedScores) {
    if (s.decision === "DROP") dropCount++;
    else if (s.decision === "REVIEW") reviewCount++;
    else if (s.decision === "KEEP") keepCount++;
  }

  // Look up the customer (for webhook delivery later)
  const [analysisRow] = await db
    .select({ customerId: analyses.customerId })
    .from(analyses)
    .where(eq(analyses.id, job.analysisId));

  const defaultChain = job.chains[0] ?? "ethereum";

  // Two-phase write so callers that poll GET /analyses/:id and see
  // status='complete' can immediately read /results without hitting an
  // empty page. Phase 1 inserts all child rows in one atomic tx; the
  // status flip happens in a SEPARATE tx that runs only after phase 1
  // commits, guaranteeing scores/audit/clusters are visible before
  // 'complete' becomes observable. The trade-off: if phase 2 fails we
  // end up with orphaned scores under status='ingesting' — but BullMQ
  // will retry the whole job and the analysisId is stable, so the
  // second attempt sees an already-populated child set and just re-flips
  // status (which is idempotent).
  await db.transaction(async (tx) => {
    if (enrichedScores.length > 0) {
      await tx.insert(addressScores).values(
        enrichedScores.map((s) => ({
          analysisId: job.analysisId,
          address: s.address.toLowerCase(),
          chain: s.chain ?? defaultChain,
          sybilScore: s.sybil_score,
          confidence: s.confidence?.toFixed(3),
          label: s.label,
          clusterId: s.cluster_id ?? undefined,
          clusterSize: s.cluster_size ?? undefined,
          decision: s.decision ?? undefined,
          decisionConfidence: s.decisionConfidence ?? undefined,
          rationaleCodes: s.rationaleCodes,
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
  });

  // Phase 2: flip status to 'complete' only after phase 1 has committed.
  // Block 5 — if ML reported more CU than the customer's plan allows,
  // we still keep the partial results (already in DB after phase 1) but
  // mark the row as `complete_over_budget` so the dashboard can surface
  // a banner instead of pretending everything was fine.
  const overBudget = result.cu_consumed > planCfg.maxCuPerAnalysis;
  const completedAt = new Date();
  await db
    .update(analyses)
    .set({
      status: overBudget ? "complete_over_budget" : "complete",
      completedAt,
      processingTimeSeconds: Math.round((completedAt.getTime() - startedAt.getTime()) / 1000),
      totalScored: result.summary.total_scored,
      sybilCount: result.summary.sybil_count,
      suspiciousCount: result.summary.suspicious_count,
      genuineCount: result.summary.genuine_count,
      // Decision-aware tallies (null on cluster_only — no per-row verdict).
      dropCount: mode === "cluster_only" ? null : dropCount,
      reviewCount: mode === "cluster_only" ? null : reviewCount,
      keepCount: mode === "cluster_only" ? null : keepCount,
      clusterCount: result.summary.cluster_count,
      largestClusterSize: result.summary.largest_cluster_size,
      cuConsumed: result.cu_consumed,
    })
    .where(eq(analyses.id, job.analysisId));

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

/**
 * Adapt the ML service's `/cluster-only` response (which has clusters +
 * addr_to_clusters but no per-address scores) into the same MLResponse
 * shape the rest of the worker expects. For each address that landed in
 * any cluster we synthesise a minimal "unscored" addressScores row so the
 * dashboard can show cluster membership; addresses outside any cluster
 * are dropped from `scores` (so the table only renders meaningful rows).
 */
function normaliseClusterOnlyResponse(
  raw: unknown,
  inputAddresses: string[],
  defaultChain: string,
): MLResponse {
  const r = raw as {
    clusters?: MLClusterOut[];
    addr_to_clusters?: Record<string, string[]>;
    cu_consumed?: number;
  };
  const clustersOut = r.clusters ?? [];
  const addrMap = r.addr_to_clusters ?? {};
  // Build a lookup of cluster id → size + biggest-cluster picker per address.
  const sizeById = new Map<string, number>();
  for (const c of clustersOut) sizeById.set(c.id, c.size);

  const scores: MLScore[] = [];
  for (const addr of inputAddresses) {
    const lower = addr.toLowerCase();
    const ids = addrMap[lower] ?? [];
    if (ids.length === 0) continue;
    let biggestId = ids[0]!;
    let biggestSize = sizeById.get(biggestId) ?? 0;
    for (const id of ids) {
      const s = sizeById.get(id) ?? 0;
      if (s > biggestSize) {
        biggestId = id;
        biggestSize = s;
      }
    }
    scores.push({
      address: lower,
      chain: defaultChain,
      sybil_score: 0,
      label: "unscored",
      confidence: 0,
      cluster_id: biggestId,
      cluster_size: biggestSize,
      evidence: [],
    });
  }

  return {
    analysis_id: "",
    summary: {
      total_scored: scores.length,
      sybil_count: 0,
      suspicious_count: 0,
      genuine_count: 0,
      cluster_count: clustersOut.length,
      largest_cluster_size: clustersOut.reduce((m, c) => Math.max(m, c.size), 0),
    },
    scores,
    clusters: clustersOut,
    cu_consumed: r.cu_consumed ?? 0,
  };
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
        // Fire-and-forget Discord ping so we don't have to tail container
        // logs to notice a stuck queue / dead ML service.
        await emitAlert(
          `🔴 worker exception · analysis=${job.data.analysisId} · attempt=${job.attemptsMade}/${job.opts.attempts ?? 1}\n` +
            `${(err as Error)?.stack ?? String(err)}`,
        );
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
