/**
 * Decision presets — single source of truth for threshold rules.
 *
 * The Python pipeline mirrors this in apps/ml/sybilshield/scoring/presets.py.
 * Keep them in sync manually for v1 (any deviation will produce divergent
 * decisions between dashboard preview and server response).
 *
 * Confidence rule (computeDecision):
 *   - `high`   = both the score rule AND a cluster rule fire (or both genuine)
 *   - `medium` = exactly one rule fires
 *   - `low`    = only the model classifier nudged us across the threshold
 *                with no supporting structural signal
 */
export type DecisionPreset = "airdrop" | "dao" | "grant" | "balanced";
export type Decision = "DROP" | "REVIEW" | "KEEP";
export type DecisionConfidence = "high" | "medium" | "low";

interface ThresholdRule {
  score_gte: number | null;
  cluster_size_gte: number | null;
}

interface PresetConfig {
  description: string;
  // DROP rule: a score threshold OR a cluster-size threshold (any of the
  // conditions satisfied → DROP). null disables that side.
  drop: ThresholdRule;
  // REVIEW threshold sits between DROP and KEEP; same shape.
  review: ThresholdRule;
}

/**
 * Per-analysis threshold overrides. A pilot customer can tighten or loosen
 * any of the four threshold knobs on top of a named preset — e.g. drop the
 * cluster_size_gte from 50 to 12 because they've already excluded their own
 * CEX deposit wallets. Only the keys provided are overridden; the rest fall
 * back to the preset. `null` explicitly disables a threshold; omitting a key
 * keeps the preset's value.
 */
export interface PresetOverrides {
  drop?: Partial<ThresholdRule>;
  review?: Partial<ThresholdRule>;
}

// Threshold calibration history:
//   v1 (initial): cluster_size thresholds were 3-10. Pre-pilot retro on 200
//   governance voters showed 66% false-positive rate — almost all triggered
//   by cluster_size_ge_10 from shared CEX hot-wallet funding (Binance,
//   Coinbase) which is BASELINE NOISE, not sybil signal. v0.5.0 ML model
//   correctly scored those 0/100 but the cluster rule overrode.
//   Bumped thresholds 5-10× so only truly large coordinated clusters
//   trigger; ordinary CEX-funded users are no longer false-flagged.
export const PRESETS: Record<DecisionPreset, PresetConfig> = {
  airdrop: {
    description: "Aggressive filtering for token distributions",
    drop: { score_gte: 85, cluster_size_gte: 50 },
    review: { score_gte: 60, cluster_size_gte: 20 },
  },
  dao: {
    description: "Conservative — false-positives matter more in governance",
    drop: { score_gte: 90, cluster_size_gte: 30 },
    review: { score_gte: 50, cluster_size_gte: 10 },
  },
  grant: {
    description: "Cluster-first — check if applicants are connected entities",
    drop: { score_gte: null, cluster_size_gte: 20 },
    review: { score_gte: 70, cluster_size_gte: 5 },
  },
  balanced: {
    description: "Default symmetric threshold around the model's separability point",
    drop: { score_gte: 80, cluster_size_gte: null },
    review: { score_gte: 50, cluster_size_gte: null },
  },
};

interface DecisionResult {
  decision: Decision;
  confidence: DecisionConfidence;
  /** Short tags describing which rules fired (machine-readable). */
  rationale_codes: string[];
}

/**
 * Resolve the effective threshold config = preset merged with any per-analysis
 * overrides. Override keys win; absent keys fall back to the preset. A key set
 * to `null` disables that threshold.
 */
function resolveConfig(preset: DecisionPreset, overrides?: PresetOverrides): PresetConfig {
  const base = PRESETS[preset];
  if (!overrides) return base;
  return {
    description: base.description,
    drop: {
      score_gte: overrides.drop?.score_gte !== undefined ? overrides.drop.score_gte : base.drop.score_gte,
      cluster_size_gte:
        overrides.drop?.cluster_size_gte !== undefined
          ? overrides.drop.cluster_size_gte
          : base.drop.cluster_size_gte,
    },
    review: {
      score_gte: overrides.review?.score_gte !== undefined ? overrides.review.score_gte : base.review.score_gte,
      cluster_size_gte:
        overrides.review?.cluster_size_gte !== undefined
          ? overrides.review.cluster_size_gte
          : base.review.cluster_size_gte,
    },
  };
}

/**
 * Apply a preset to a single address's score + cluster signals.
 *
 * @param score - raw 0-100 model output
 * @param clusterSize - size of the address's largest cluster (or null)
 * @param preset - which preset's thresholds to apply
 * @param extraCodes - rationale codes already derived from evidence
 *   (e.g. "scripted_timing", "shared_funder_3w")
 * @param overrides - optional per-analysis threshold overrides (pilot tuning)
 */
export function computeDecision(
  score: number,
  clusterSize: number | null,
  preset: DecisionPreset,
  extraCodes: string[] = [],
  overrides?: PresetOverrides,
): DecisionResult {
  const cfg = resolveConfig(preset, overrides);
  const codes: string[] = [...extraCodes];
  if (overrides) codes.push("custom_thresholds");

  const scoreDrops = cfg.drop.score_gte !== null && score >= cfg.drop.score_gte;
  const clusterDrops =
    cfg.drop.cluster_size_gte !== null && (clusterSize ?? 0) >= cfg.drop.cluster_size_gte;
  const scoreReviews = cfg.review.score_gte !== null && score >= cfg.review.score_gte;
  const clusterReviews =
    cfg.review.cluster_size_gte !== null && (clusterSize ?? 0) >= cfg.review.cluster_size_gte;

  if (scoreDrops) codes.push(`score_ge_${cfg.drop.score_gte}`);
  if (clusterDrops) codes.push(`cluster_size_ge_${cfg.drop.cluster_size_gte}`);

  if (scoreDrops || clusterDrops) {
    const confidence: DecisionConfidence =
      scoreDrops && clusterDrops ? "high" : "medium";
    return { decision: "DROP", confidence, rationale_codes: dedupe(codes) };
  }
  if (scoreReviews || clusterReviews) {
    if (scoreReviews) codes.push(`score_ge_${cfg.review.score_gte}`);
    if (clusterReviews) codes.push(`cluster_size_ge_${cfg.review.cluster_size_gte}`);
    const confidence: DecisionConfidence =
      scoreReviews && clusterReviews ? "high" : extraCodes.length > 0 ? "medium" : "low";
    return { decision: "REVIEW", confidence, rationale_codes: dedupe(codes) };
  }
  return { decision: "KEEP", confidence: "high", rationale_codes: dedupe(codes) };
}

/** Map ML evidence-generator types → machine-readable rationale codes. */
export function evidenceToCodes(evidence: unknown): string[] {
  if (!Array.isArray(evidence)) return [];
  const codes: string[] = [];
  for (const item of evidence as Array<{ type?: string }>) {
    switch (item?.type) {
      case "temporal_scripting":
        codes.push("scripted_timing");
        break;
      case "low_entropy":
        codes.push("low_hour_entropy");
        break;
      case "high_autocorrelation":
        codes.push("high_autocorrelation");
        break;
      case "shared_funding":
        codes.push("shared_funder_cluster");
        break;
      case "shared_funding_weak":
        codes.push("shared_funder_weak");
        break;
      case "behavioral_clone":
        codes.push("behavioral_cluster");
        break;
      case "graph_cluster":
        codes.push("graph_cluster");
        break;
      case "cross_chain_link":
        codes.push("cross_chain_link");
        break;
      case "thin_account":
        codes.push("thin_account");
        break;
      case "model_classification":
        codes.push("model_classification");
        break;
    }
  }
  return dedupe(codes);
}

function dedupe<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}
