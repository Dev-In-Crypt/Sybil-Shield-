---
title: "Calibrating presets against 600 real wallets — and why we found a 66% false-positive rate before we shipped"
slug: preset-calibration
date: 2026-05-26
status: published
tags: [methodology, retro, transparency]
disclaimer: "Real numbers from a real production run. Addresses sampled from LayerZero, Arbitrum, and on-chain governance vote logs. We did not retrain the ML model for this calibration — only the cluster_size thresholds in presets.ts changed."
---

# Calibrating presets against 600 real wallets

> **TL;DR.** Before we tell anyone to use the `airdrop` preset, we ran it against 600 known-tier addresses pulled from public lists. Result: 100% recall on confessed sybils — and **66% false-positive rate on confirmed governance voters**. We were one customer away from shipping a filter that drops 2 out of 3 ordinary users. Calibration brought FP rate to 0% while keeping recall at 100%. Full numbers + the one-line fix below.

## What we did

Three 200-address samples (`random.seed(42)`, all real Ethereum addresses we have ground truth on):

- **LayerZero T1** — 200 wallets randomly sampled from LayerZero's published self-confessed sybil amnesty list. Strongest sybil ground truth available.
- **Arbitrum T4** — 200 wallets from Arbitrum Foundation's sybil-detection list. Weaker (single-detector output) but useful as recall sanity.
- **Governance G2** — 200 wallets that voted on ≥2 distinct on-chain proposals at Uniswap, Compound, or ENS governors. Each one had to hold the governance token at proposal snapshot AND pay gas — extremely strong genuine signal.

All three samples ran through the actual `POST /v1/analyses` endpoint on api.sybilshield.org with `preset: "airdrop"`. Real Alchemy ingestion. Real cluster detection. Real ML model (v0.5.0-gov-expanded).

## What we found, take 1

```
                       DROP    REVIEW   KEEP
LayerZero T1  (sybil)  200/200    0      0      ← 100% recall
Arbitrum T4   (sybil)  200/200    0      0      ← 100% recall
Governance G2 (good)   132/200    17    51      ← 66% FALSE POSITIVE
```

The model's per-address sybil score was correctly **0/100 on every flagged governance voter**. The DROP verdicts came entirely from a rule:

```
airdrop.drop_if = { score >= 85  OR  cluster_size >= 10 }
```

Inspecting the rationale codes on flagged governance voters:

```
0x01ff373a583c...  score=0  cluster=F-4461dabb  codes=['cluster_size_ge_10']
0x03700ae1b430...  score=0  cluster=F-4461dabb  codes=['cluster_size_ge_10']
0x05b5c14e2f45...  score=0  cluster=F-4461dabb  codes=['cluster_size_ge_10']
```

That cluster `F-4461dabb` is a funding-source cluster — addresses funded from the same wallet within a short window. The shared funder, when we dug into it, was a **Binance hot wallet**. Hundreds of thousands of ordinary Ethereum users get their first ETH from Binance. By the funding-clusterer's reckoning, they're all in one big "cluster," and a threshold of 10 catches them trivially.

That's not sybil signal. That's baseline noise.

## What we changed

Bumped the cluster-size thresholds 5–10× across all presets so only meaningfully large clusters trigger:

| Preset | Old DROP | New DROP | Old REVIEW | New REVIEW |
|---|---|---|---|---|
| airdrop | `cluster ≥ 10` | `cluster ≥ 50` | `cluster ≥ 5` | `cluster ≥ 20` |
| dao | `cluster ≥ 3` | `cluster ≥ 30` | `cluster ≥ 2` | `cluster ≥ 10` |
| grant | `cluster ≥ 5` | `cluster ≥ 20` | `cluster ≥ 2` | `cluster ≥ 5` |
| balanced | (score-only) | (unchanged) | (score-only) | (unchanged) |

Score thresholds untouched. The model recall on known sybils was already correct; the FP was structural, on the cluster rule alone.

Same 600 addresses, re-ran:

```
                       DROP    REVIEW   KEEP
LayerZero T1  (sybil)  200/200    0      0      ← 100% recall preserved
Arbitrum T4   (sybil)  200/200    0      0      ← 100% recall preserved
Governance G2 (good)     0/200   60    140      ← 0% false-positive
```

100% recall maintained. False-positive rate on confirmed genuine voters went from 66% to **0%**.

The 60 voters that landed in REVIEW are real cluster co-residents — the largest cluster among them was 37 wallets. Some of those clusters are probably legitimate (a person voting from multiple addresses, a delegate aggregator, a DAO multisig signer pool) and some might be coordinated. They go to manual review, which is exactly what `REVIEW` is supposed to mean.

## Why we're publishing this

Two reasons.

**1. Honesty.** This is exactly the failure mode our own blog post warned about a day ago — "we don't know wild-traffic precision/recall until customer feedback shows up." Now we do know. Pre-pilot we'd have shipped a 66%-FP filter to the first customer. We didn't, because we ran calibration on our own dogfood before letting anyone else.

**2. Methodology.** Cluster-based detection has a built-in scale problem: the more wallets share a funder, the bigger the cluster, the more likely the cluster is benign infrastructure rather than a single farm. Any team building this kind of detection eventually runs into the same issue. Our fix — bump the threshold against ground truth — is one valid answer. A better long-term answer is to exclude known-CEX hot wallets from the funding clusterer entirely. That's on the roadmap.

If you're a team that's already filtering airdrops, **run this same audit on your own filter** before publication. Pick a sample of governance voters from your chain's biggest DAOs (Snapshot, on-chain governors, RetroPGF voters — all public) and check what fraction of them your filter flags. If it's above 5% you have a problem similar to ours, and almost certainly the same root cause.

## What's next

- **Exchange-wallet entity table** for the funding clusterer — exclude addresses on the known-CEX list from cluster-membership counting (in-progress).
- **Per-customer threshold override** — pilots will get a `cluster_size_gte` override in their analysis config so they can dial precision/recall to their tolerance.
- **Real wild-traffic feedback loop** is now live — the analysis-detail drawer has thumbs-up/down on every verdict, which writes to the `feedback` table + audit log. Once we have ~100 thumbs-down from pilots we'll retrain `presets.ts` automatically from real disagreement signal rather than hand-tuned thresholds.

All calibration code, the threshold table, the model, the cluster algorithms, and this very blog post are MIT-licensed at [github.com/Dev-In-Crypt/Sybil-Shield-](https://github.com/Dev-In-Crypt/Sybil-Shield-). You can reproduce this entire run yourself — public methodology, public data, public source.
