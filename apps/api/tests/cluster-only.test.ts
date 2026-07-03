import { describe, expect, it } from "vitest";
import { normaliseClusterOnlyResponse } from "../src/lib/cluster-only.js";

// A minimal `/cluster-only` ML response: two clusters and an address→cluster
// membership map. Mirrors the shape the ML service returns (lowercased keys).
const RAW = {
  clusters: [
    { id: "c-small", method: "funding", size: 3, confidence: 0.8, evidence: "shared funder" },
    { id: "c-big", method: "graph", size: 9, confidence: 0.9, evidence: "transfer ring" },
  ],
  addr_to_clusters: {
    "0xaaaa000000000000000000000000000000000001": ["c-small"],
    "0xbbbb000000000000000000000000000000000002": ["c-small", "c-big"],
  },
  cu_consumed: 42,
};

const IN_SMALL = "0xAAAA000000000000000000000000000000000001"; // mixed-case on input
const IN_BOTH = "0xbbbb000000000000000000000000000000000002";
const IN_NONE = "0xcccc000000000000000000000000000000000003"; // in no cluster

describe("normaliseClusterOnlyResponse", () => {
  it("emits an unscored row for a clustered address — no per-address verdict", () => {
    const out = normaliseClusterOnlyResponse(RAW, [IN_SMALL], "ethereum");
    expect(out.scores).toHaveLength(1);
    const row = out.scores[0]!;
    expect(row.label).toBe("unscored");
    expect(row.sybil_score).toBe(0);
    expect(row.confidence).toBe(0);
    // cluster-only carries no DROP/REVIEW/KEEP decision — the synthesised row
    // has no `decision` field at all (decisions are full-mode only).
    expect("decision" in row).toBe(false);
    expect(row.cluster_id).toBe("c-small");
    expect(row.cluster_size).toBe(3);
  });

  it("lowercases the output address regardless of input casing", () => {
    const out = normaliseClusterOnlyResponse(RAW, [IN_SMALL], "ethereum");
    expect(out.scores[0]!.address).toBe(IN_SMALL.toLowerCase());
  });

  it("picks the biggest cluster when an address is in several", () => {
    const out = normaliseClusterOnlyResponse(RAW, [IN_BOTH], "ethereum");
    expect(out.scores[0]!.cluster_id).toBe("c-big");
    expect(out.scores[0]!.cluster_size).toBe(9);
  });

  it("drops addresses that landed in no cluster", () => {
    const out = normaliseClusterOnlyResponse(RAW, [IN_SMALL, IN_NONE], "ethereum");
    expect(out.scores).toHaveLength(1);
    expect(out.scores[0]!.address).toBe(IN_SMALL.toLowerCase());
  });

  it("applies the default chain to synthesised rows", () => {
    const out = normaliseClusterOnlyResponse(RAW, [IN_SMALL], "arbitrum");
    expect(out.scores[0]!.chain).toBe("arbitrum");
  });

  it("summarises clusters and passes through cu_consumed", () => {
    const out = normaliseClusterOnlyResponse(RAW, [IN_SMALL, IN_BOTH], "ethereum");
    expect(out.summary.cluster_count).toBe(2);
    expect(out.summary.largest_cluster_size).toBe(9);
    expect(out.summary.total_scored).toBe(2);
    // No per-address scoring happens in cluster-only mode.
    expect(out.summary.sybil_count).toBe(0);
    expect(out.summary.suspicious_count).toBe(0);
    expect(out.summary.genuine_count).toBe(0);
    expect(out.cu_consumed).toBe(42);
    expect(out.clusters).toHaveLength(2);
  });

  it("returns an empty, safe result when the ML response has no clusters", () => {
    const out = normaliseClusterOnlyResponse({}, [IN_SMALL], "ethereum");
    expect(out.scores).toEqual([]);
    expect(out.clusters).toEqual([]);
    expect(out.summary.cluster_count).toBe(0);
    expect(out.summary.largest_cluster_size).toBe(0);
    expect(out.summary.total_scored).toBe(0);
    expect(out.cu_consumed).toBe(0);
  });
});
