import { describe, expect, it } from "vitest";
import { computeDecision, PRESETS } from "../src/lib/presets.js";

describe("computeDecision — preset baseline", () => {
  it("airdrop drops a high score", () => {
    const d = computeDecision(90, null, "airdrop");
    expect(d.decision).toBe("DROP");
    expect(d.rationale_codes).toContain("score_ge_85");
  });

  it("airdrop keeps a clean low-score, no-cluster address", () => {
    const d = computeDecision(0, null, "airdrop");
    expect(d.decision).toBe("KEEP");
    expect(d.confidence).toBe("high");
  });

  it("grant does NOT drop a high-score singleton (cluster-first preset)", () => {
    // grant.drop has score_gte=null — score alone can't DROP; needs a cluster.
    const d = computeDecision(100, null, "grant");
    expect(d.decision).toBe("REVIEW"); // review.score_gte = 70
  });

  it("high confidence when both score and cluster rules fire", () => {
    const d = computeDecision(95, 60, "airdrop");
    expect(d.decision).toBe("DROP");
    expect(d.confidence).toBe("high");
  });
});

describe("computeDecision — per-analysis threshold overrides", () => {
  it("tightening cluster_size_gte drops an address the preset would keep", () => {
    // airdrop preset: drop.cluster_size_gte = 50. A 12-wallet cluster with
    // score 0 is KEEP under the preset. A pilot who's excluded their own CEX
    // wallets can tighten the cluster knob to 10 → same address now DROPs.
    const base = computeDecision(0, 12, "airdrop");
    expect(base.decision).toBe("KEEP");

    const tightened = computeDecision(0, 12, "airdrop", [], {
      drop: { cluster_size_gte: 10 },
    });
    expect(tightened.decision).toBe("DROP");
    expect(tightened.rationale_codes).toContain("cluster_size_ge_10");
    expect(tightened.rationale_codes).toContain("custom_thresholds");
  });

  it("loosening score_gte keeps an address the preset would drop", () => {
    // balanced preset: drop.score_gte = 80. Score 85 → DROP normally.
    const base = computeDecision(85, null, "balanced");
    expect(base.decision).toBe("DROP");

    const loosened = computeDecision(85, null, "balanced", [], {
      drop: { score_gte: 95 },
    });
    expect(loosened.decision).toBe("REVIEW"); // review.score_gte still 50
  });

  it("null override disables a threshold side", () => {
    // Disable airdrop's score-based DROP entirely; cluster rule still applies.
    const d = computeDecision(99, null, "airdrop", [], {
      drop: { score_gte: null },
    });
    // Score 99 can no longer DROP; falls to REVIEW (review.score_gte=60).
    expect(d.decision).toBe("REVIEW");
  });

  it("partial override leaves untouched knobs at the preset value", () => {
    // Override only review.cluster_size_gte; drop rules unchanged.
    const d = computeDecision(90, null, "airdrop", [], {
      review: { cluster_size_gte: 3 },
    });
    // Score 90 still triggers the unchanged drop.score_gte=85.
    expect(d.decision).toBe("DROP");
  });

  it("undefined overrides reproduce the exact preset decision", () => {
    for (const preset of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
      const a = computeDecision(72, 25, preset);
      const b = computeDecision(72, 25, preset, [], undefined);
      expect(b.decision).toBe(a.decision);
    }
  });
});
