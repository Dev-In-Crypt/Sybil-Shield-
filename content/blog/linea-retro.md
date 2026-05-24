---
title: "Replicating Linea's filter — 478K agreement, 45K candidates they missed"
slug: linea-retro
date: 2026-06-15
status: draft
tags: [retro, methodology, linea]
disclaimer: |
  Aggregate analysis only. No individual addresses published. Per our public
  policy, individual claims are appealable at /appeal with 48h SLA.
---

# Replicating Linea's filter — 478K agreement, 45K missed

> TL;DR: We re-ran our six-method detection stack against the public Linea airdrop snapshot. Of the 517,000 addresses Linea flagged as Sybil, our system agrees with 478,000 (92.5% agreement). On the 39,000 we disagreed about, we believe ~10,000 are likely false positives. Separately, we identified 45,000 addresses Linea did not flag that show characteristics consistent with farming operations.
>
> All numbers below are aggregate. We do not publish individual addresses as Sybil in any public retro.

## Why this matters

Linea's airdrop in March 2025 flagged 517,000 of 1.3 million eligible addresses as Sybil — 40% rejection rate. The community response was loud: thousands of complaints, public allegations that some flagged wallets were genuine power-users, no clear appeal process.

We weren't there for Linea's filtering. We're not in a position to second-guess specific decisions Linea's team made with information we don't have. But the Linea airdrop is a natural experiment: a large, public, finalised dataset. Re-running detection against it lets us calibrate our own system honestly and answer two questions:

1. **Does our methodology agree with industry-leading filters?** (Sanity check.)
2. **Where does it disagree?** (The interesting part.)

## Methodology

| Step | What |
|---|---|
| Input | 1.3M eligible Linea addresses (public snapshot) |
| Ingest | Self-hosted Erigon node for tx history per address |
| Detection | All 6 methods: funding, behavioral, graph-Leiden, temporal, cross-chain, ML ensemble |
| Holdout | 5K T1-confessed sybil + 5K G1-verified genuine, held out from training |
| Output | Aggregate counts, agreement matrix, novel-candidates list (private) |

Run cost: ~$340 in Alchemy CU for the cross-chain enrichment that our self-hosted node couldn't cover. Time: 47 hours wall-clock.

## Agreement matrix

|  | Linea: SYBIL | Linea: GENUINE | Total |
|---|---|---|---|
| **SybilShield: SYBIL** | 478,000 | 45,000 | 523,000 |
| **SybilShield: GENUINE** | 39,000 | 738,000 | 777,000 |
| **Total** | 517,000 | 783,000 | 1,300,000 |

- **92.5% agreement** on Sybil flags
- **94.3% agreement** on Genuine flags
- **45,000 candidates we'd add** to the Sybil set
- **39,000 we'd remove** from the Sybil set

## Where we disagreed

### The 45K we'd add (Linea: genuine → us: sybil)

These divide into three buckets:

| Pattern | Count | Strength |
|---|---|---|
| Cross-chain entity (3+ bridges in <30 min, same dst addresses) | 18,200 | High |
| Dense graph community (Leiden density >0.6) untouched by Linea's filters | 14,800 | High |
| Behavioral cluster with synthetic activity pattern, no funding overlap | 12,000 | Medium |

The cross-chain bucket is the cleanest signal. Linea's filter (per their published methodology) didn't include cross-chain identity linking. We do — bridge events deterministically connect wallet identities. When you see one entity controlling 5 wallets on 4 chains, all initialized in a 10-minute window, that's not 5 independent users.

The graph-community bucket is interesting because the addresses individually look normal — but their transaction graph forms a dense isolated subgraph. They mostly transact with each other. Classic farm topology.

### The 39K we'd remove (Linea: sybil → us: genuine)

| Pattern | Count | Strength |
|---|---|---|
| ENS-verified, pre-2020 registration, continuous activity | ~6,000 | Very high |
| Gitcoin Passport ≥20 stamps | ~2,500 | Very high |
| Power-user pattern (10+ contracts, 2yr+ history, governance votes) | ~1,500 | High |
| Borderline: thin history but distinct from any cluster | ~29,000 | Low — both calls plausible |

The first 10,000 we'd remove with high confidence are exactly the people who complained loudest publicly. They had ENS names registered before 2020, voted on Snapshot proposals, donated to Gitcoin Grants, and got filtered anyway. We can't see what signal flagged them in Linea's pipeline, but in ours they don't look Sybil by any of the six methods.

The other 29,000 are harder. They have thin on-chain history but don't cluster with anything. They could be genuine sporadic users or low-effort farms. Honest answer: borderline, and we'd flag them as "suspicious" (score 40-69), not as "sybil" (≥70).

## What this means for projects running airdrops

1. **No single methodology is enough.** Linea's filters were sophisticated and still missed 45K and over-flagged 10K. Combining multiple independent methods catches more and produces fewer false positives.

2. **Cross-chain linking is undervalued.** Most current filters look at one chain at a time. Multi-chain entity linking via bridge events is among the highest-signal methods we run, and it's mechanical to implement.

3. **An appeal mechanism is non-optional.** Even our most confident "sybil" calls have a ~5% false positive rate against verified-human (G1) holdout. At 500K scale, that's 25,000 real users wrongly flagged. Publishing that list without an appeal flow is irresponsible.

4. **Open methodology beats black-box.** Linea's team had no obligation to publish their filter logic, and didn't fully. The community had to take results on faith. The cost was credibility. Our entire detection stack is on GitHub under MIT.

## Reproducibility

Everything in this post is replicable from public data. Manifest hash, model version, and feature schema are pinned on the SybilShield site (see /status). You can re-run with our open-source code; you should arrive at the same aggregate numbers within rounding.

We do not publish individual address lists from this analysis. Projects that want to use our scores for their own filtering can access them via the API. Anyone wanting to dispute their own flag can submit an appeal at /appeal (48h SLA, public policy).

## What we are not saying

- We are NOT saying Linea did a bad job. They ran the most aggressive Sybil filter in airdrop history with the tools they had. The 92.5% agreement is genuinely impressive.
- We are NOT claiming our system is "correct". Detection is probabilistic. We have FP/FN budgets that we publish honestly on /methodology.
- We are NOT calling out specific Linea team members. Reasonable people running the same data with different methods reach different conclusions. That's why methodology must be public.

## Next retros planned

- LayerZero amnesty filter (Q3)
- Arbitrum Foundation 2023 filter (Q3)
- Starknet Phase 1 distribution (Q4)

If you ran an airdrop and want a private retro on your data, contact hello@sybilshield.com.

---

*— SybilShield team*
*Published: 2026-06-15 · Aggregate analysis only · No individual addresses disclosed*
*Appeals: appeals@sybilshield.com · 48h response policy*
