import { and, desc, eq } from "drizzle-orm";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { z } from "zod";
import { addressScores, analyses, customers, db } from "../db/index.js";
import { dedupeInFlight } from "../lib/first-sight-inflight.js";
import { checkGlobalFirstSightBudget } from "../lib/first-sight-throttle.js";
import { computeDecision, evidenceToCodes } from "../lib/presets.js";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "http://localhost:8001";

// Single chain only, from the same set the rest of the site offers on
// /dashboard/new and /lookup — see docs/design/realtime-first-sight-scoring.md
// §3: multi-chain on this path multiplies real Alchemy cost 1:1 per chain
// for zero added rate-limit protection.
const FirstSightSchema = z.object({
  address: z.string().regex(/^0x[0-9a-fA-F]{40}$/),
  chain: z.enum(["ethereum", "arbitrum", "optimism", "base", "polygon"]).default("ethereum"),
});

type AddressScoreRow = typeof addressScores.$inferSelect;

/**
 * `address_scores.analysis_id` is NOT NULL with a real FK to `analyses`
 * (apps/api/src/db/schema.ts) — editing that constraint is a migration,
 * a Forbidden area needing explicit approval (SECURITY_NOTES.md). Rather
 * than requesting a schema change for this prototype, first-sight rows
 * attach to one well-known, lazily-created "system" analysis — ordinary
 * application-level rows via the existing tables, not a schema change.
 * Invisible to every customer-facing route: GET /v1/analyses is scoped by
 * `customerId = request.customer.id`, and no real customer authenticates
 * as this system account (it has no API key).
 */
const SYSTEM_CUSTOMER_EMAIL = "system+first-sight@sybilshield.internal";
let cachedSystemAnalysisId: string | null = null;

async function ensureSystemAnalysisId(): Promise<string> {
  if (cachedSystemAnalysisId) return cachedSystemAnalysisId;

  let [customer] = await db.select().from(customers).where(eq(customers.email, SYSTEM_CUSTOMER_EMAIL));
  if (!customer) {
    [customer] = await db
      .insert(customers)
      .values({ email: SYSTEM_CUSTOMER_EMAIL, name: "System (first-sight scoring)", plan: "free" })
      .onConflictDoNothing({ target: customers.email })
      .returning();
    if (!customer) {
      // Lost a race with a concurrent request creating the same row — reselect.
      [customer] = await db.select().from(customers).where(eq(customers.email, SYSTEM_CUSTOMER_EMAIL));
    }
  }

  let [analysis] = await db.select().from(analyses).where(eq(analyses.customerId, customer!.id));
  if (!analysis) {
    [analysis] = await db
      .insert(analyses)
      .values({
        customerId: customer!.id,
        name: "System: first-sight synchronous scoring",
        status: "complete",
        chains: [],
        addressCount: 0,
        preset: "balanced",
        mode: "full",
      })
      .returning();
  }
  cachedSystemAnalysisId = analysis!.id;
  return cachedSystemAnalysisId;
}

function formatResponse(row: AddressScoreRow, firstSight: boolean) {
  return {
    address: row.address,
    chain: row.chain,
    sybil_score: row.sybilScore,
    confidence: row.confidence,
    label: row.label,
    decision: row.decision,
    decision_confidence: row.decisionConfidence,
    rationale_codes: row.rationaleCodes,
    cluster_id: row.clusterId,
    cluster_size: row.clusterSize,
    evidence: row.evidence,
    // true only when THIS call actually triggered new ingestion — false
    // means the write-through cache already had it (free, no Alchemy
    // spend). Lets a caller distinguish "fresh" from "cached" honestly.
    first_sight: firstSight,
  };
}

type ScoreOutcome =
  | { kind: "row"; row: AddressScoreRow; firstSight: boolean }
  | { kind: "throttled" }
  | { kind: "scoring_failed" };

/**
 * The full check-then-act sequence (cache check → throttle → real ML
 * ingestion → persist) for one address+chain, factored out so it can be
 * wrapped in `dedupeInFlight` (TODO-327) — two concurrent callers for the
 * SAME key share this exact call rather than each racing through it
 * independently, which is what let a concurrent burst double-spend real
 * Alchemy budget on one address before the fix.
 */
async function scoreAddress(address: string, chain: string, log: FastifyBaseLogger): Promise<ScoreOutcome> {
  // 1. Write-through cache FIRST — never spend Alchemy budget on an
  // address already scored by this call, a prior first-sight call, or
  // any real batch analysis. Same table + same "most recent row wins"
  // rule GET /v1/score/:address already reads.
  const [existing] = await db
    .select()
    .from(addressScores)
    .where(and(eq(addressScores.address, address), eq(addressScores.chain, chain)))
    .orderBy(desc(addressScores.createdAt))
    .limit(1);
  if (existing) {
    return { kind: "row", row: existing, firstSight: false };
  }

  // 2. Global throughput reservation — protects the batch worker's
  // share of the shared Alchemy account ceiling from a first-sight
  // burst, independent of the per-origin cap above (many different
  // origins could otherwise still exhaust it together).
  if (!checkGlobalFirstSightBudget()) {
    return { kind: "throttled" };
  }

  // 3. Real ingestion — single address, single chain, same process as
  // the batch worker's ML service (reuses its Alchemy rate limiter;
  // see docs/design/realtime-first-sight-scoring.md §4 for why a
  // separate process would be unsafe here).
  let mlResult: {
    sybil_score: number;
    label: string;
    confidence: number;
    evidence: unknown[];
  };
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/first-sight`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ address, chain }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      log.warn({ status: resp.status, text }, "first-sight ML call failed");
      return { kind: "scoring_failed" };
    }
    mlResult = (await resp.json()) as typeof mlResult;
  } catch (err) {
    log.warn({ err }, "first-sight ML call errored");
    return { kind: "scoring_failed" };
  }

  // 4. Decision + write-through persistence. No preset context exists
  // for a public first-sight call (no analysis, no customer choice) —
  // "balanced" is the documented default ("pick this if unsure").
  // clusterSize is always null here: no batch, no clustering, by
  // design (Phase 2, not this task) — computeDecision() needs zero
  // changes for this, its own confidence tiers already cover the
  // "model-only, no structural signal" case.
  const extraCodes = evidenceToCodes(mlResult.evidence);
  const decision = computeDecision(mlResult.sybil_score, null, "balanced", extraCodes);
  const analysisId = await ensureSystemAnalysisId();

  const [inserted] = await db
    .insert(addressScores)
    .values({
      analysisId,
      address,
      chain,
      sybilScore: mlResult.sybil_score,
      confidence: mlResult.confidence.toFixed(3),
      label: mlResult.label,
      decision: decision.decision,
      decisionConfidence: decision.confidence,
      rationaleCodes: decision.rationale_codes,
      features: {},
      evidence: mlResult.evidence,
    })
    .returning();

  return { kind: "row", row: inserted!, firstSight: true };
}

export async function firstSightRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Body: { address: string; chain?: string } }>(
    "/v1/score/first-sight",
    {
      config: {
        // Per-origin, not per-IP or per-API-key — this is a public,
        // unauthenticated route called from third-party claim pages; the
        // traffic driver is THEIR visitors, not the embedding site itself.
        // Same reasoning TODO-104's /v1/resolve reached, adapted: capping
        // by visitor IP does nothing to bound what any one embed can cost
        // in aggregate. Falls back to req.ip for non-browser callers.
        rateLimit: {
          max: 20,
          timeWindow: "1 minute",
          keyGenerator: (req) => (req.headers.origin as string | undefined) ?? req.ip,
        },
      },
    },
    async (request, reply) => {
      const parsed = FirstSightSchema.safeParse(request.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", details: parsed.error.flatten() });
      }
      const address = parsed.data.address.toLowerCase();
      const chain = parsed.data.chain;

      // TODO-327: de-dupe concurrent requests for the SAME address+chain
      // so at most one of them actually runs scoreAddress's real ingestion
      // — every waiter shares that one call's result instead of each
      // racing through the cache-check independently.
      const outcome = await dedupeInFlight(`${address}:${chain}`, () => scoreAddress(address, chain, request.log));

      if (outcome.kind === "throttled") {
        return reply.code(429).send({
          error: "first_sight_budget_exceeded",
          message:
            "Real-time scoring is at capacity right now. Try again shortly, or run a batch analysis instead.",
        });
      }
      if (outcome.kind === "scoring_failed") {
        return reply.code(502).send({ error: "scoring_failed" });
      }
      return reply.send(formatResponse(outcome.row, outcome.firstSight));
    },
  );
}
