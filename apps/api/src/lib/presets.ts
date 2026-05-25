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

interface PresetConfig {
  description: string;
  // DROP rule: a score threshold OR a cluster-size threshold (any of the
  // conditions satisfied → DROP). null disables that side.
  drop: { score_gte: number | null; cluster_size_gte: number | null };
  // REVIEW threshold sits between DROP and KEEP; same shape.
  review: { score_gte: number | null; cluster_size_gte: number | null };
}

export const PRESETS: Record<DecisionPreset, PresetConfig> = {
  airdrop: {
    description: "Aggressive filtering for token distributions",
    drop: { score_gte: 85, cluster_size_gte: 10 },
    review: { score_gte: 60, cluster_size_gte: 5 },
  },
  dao: {
    description: "Conservative — false-positives matter more in governance",
    drop: { score_gte: 90, cluster_size_gte: 3 },
    review: { score_gte: 50, cluster_size_gte: 2 },
  },
  grant: {
    description: "Cluster-first — check if applicants are connected entities",
    drop: { score_gte: null, cluster_size_gte: 5 },
    review: { score_gte: 70, cluster_size_gte: 2 },
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
 * Apply a preset to a single address's score + cluster signals.
 *
 * @param score - raw 0-100 model output
 * @param clusterSize - size of the address's largest cluster (or null)
 * @param preset - which preset's thresholds to apply
 * @param extraCodes - rationale codes already derived from evidence
 *   (e.g. "scripted_timing", "shared_funder_3w")
 */
export function computeDecision(
  score: number,
  clusterSize: number | null,
  preset: DecisionPreset,
  extraCodes: string[] = [],
): DecisionResult {
  const cfg = PRESETS[preset];
  const codes: string[] = [...extraCodes];

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
