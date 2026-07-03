/**
 * Pure adapters + shared types for the ML service response shapes.
 *
 * `normaliseClusterOnlyResponse` adapts the `/cluster-only` ML response
 * (clusters + addr_to_clusters, but no per-address scores) into the same
 * `MLResponse` shape the rest of the worker expects. Kept here (not in the
 * worker module) so it can be unit-tested without dragging the worker's
 * BullMQ / Redis / DB import graph into the test.
 */

export interface MLScore {
  address: string;
  chain?: string;
  sybil_score: number;
  label: string;
  confidence: number;
  cluster_id: string | null;
  cluster_size: number | null;
  evidence: unknown;
}

export interface MLClusterOut {
  id: string;
  method: string;
  size: number;
  confidence: number;
  evidence: string;
}

export interface MLResponse {
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
 * Adapt the ML service's `/cluster-only` response (which has clusters +
 * addr_to_clusters but no per-address scores) into the same MLResponse
 * shape the rest of the worker expects. For each address that landed in
 * any cluster we synthesise a minimal "unscored" addressScores row so the
 * dashboard can show cluster membership; addresses outside any cluster
 * are dropped from `scores` (so the table only renders meaningful rows).
 */
export function normaliseClusterOnlyResponse(
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
