import { describe, expect, it } from "vitest";
import { computeDecision, evidenceToCodes, PRESETS, presetRuleText } from "../src/lib/presets.js";

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

describe("presetRuleText — canonical rule strings (no dashboard drift)", () => {
  it("formats both threshold sides when set", () => {
    expect(presetRuleText("airdrop")).toEqual({
      drop: "score ≥ 85 OR cluster_size ≥ 50",
      review: "score ≥ 60 OR cluster_size ≥ 20",
    });
  });

  it("omits a disabled (null) side — grant drop is cluster-only", () => {
    expect(presetRuleText("grant")!.drop).toBe("cluster_size ≥ 20");
  });

  it("omits the cluster side when it is null — balanced is score-only", () => {
    expect(presetRuleText("balanced")).toEqual({ drop: "score ≥ 80", review: "score ≥ 50" });
  });

  it("returns null for an unknown or absent preset", () => {
    expect(presetRuleText(null)).toBeNull();
    expect(presetRuleText(undefined)).toBeNull();
    expect(presetRuleText("nonsense")).toBeNull();
  });

  it("stays in lockstep with the canonical PRESETS thresholds", () => {
    // If someone edits a PRESETS number, this derived string must move with it —
    // that is the whole point of sourcing the dashboard copy from here.
    for (const [name, cfg] of Object.entries(PRESETS)) {
      const text = presetRuleText(name)!;
      if (cfg.drop.score_gte !== null) expect(text.drop).toContain(`score ≥ ${cfg.drop.score_gte}`);
      if (cfg.drop.cluster_size_gte !== null)
        expect(text.drop).toContain(`cluster_size ≥ ${cfg.drop.cluster_size_gte}`);
    }
  });
});

describe("computeDecision — QF pairwise signal (TODO-310, grant preset only)", () => {
  it("REVIEWs a zero-score, no-cluster grant address that carries the pairwise code", () => {
    // The whole point: the ML score is untrained on this signal and may be
    // near 0, with no cluster_size to speak of either — only the pairwise
    // code should be able to move this off KEEP.
    const d = computeDecision(0, null, "grant", ["qf_pairwise_coordinated_pair"]);
    expect(d.decision).toBe("REVIEW");
    expect(d.confidence).toBe("medium");
    expect(d.rationale_codes).toContain("qf_pairwise_coordinated_pair");
  });

  it("does not fire without the code — grant preset baseline is unaffected", () => {
    const d = computeDecision(0, null, "grant");
    expect(d.decision).toBe("KEEP");
  });

  it("never DROPs on the pairwise code alone — REVIEW-tier only by design", () => {
    const d = computeDecision(0, null, "grant", ["qf_pairwise_coordinated_pair"]);
    expect(d.decision).not.toBe("DROP");
  });

  it("is scoped to the grant preset — the same code on another preset does nothing", () => {
    const d = computeDecision(0, null, "airdrop", ["qf_pairwise_coordinated_pair"]);
    expect(d.decision).toBe("KEEP");
  });

  it("does not disturb the existing 5/20 cluster-size thresholds", () => {
    // A grant address hitting the real cluster_size_gte=20 DROP rule must
    // still DROP exactly as before — the pairwise branch is additive only.
    const withoutPairwise = computeDecision(0, 20, "grant");
    const withPairwise = computeDecision(0, 20, "grant", ["qf_pairwise_coordinated_pair"]);
    expect(withoutPairwise.decision).toBe("DROP");
    expect(withPairwise.decision).toBe("DROP");
  });
});

describe("evidenceToCodes — pairwise_funding_link mapping", () => {
  it("maps the ML pairwise evidence type to the rationale code", () => {
    const codes = evidenceToCodes([
      { type: "pairwise_funding_link", description: "shares a funder", confidence: 0.95 },
    ]);
    expect(codes).toContain("qf_pairwise_coordinated_pair");
  });
});
