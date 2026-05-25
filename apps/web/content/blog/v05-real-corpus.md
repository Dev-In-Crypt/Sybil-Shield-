---
title: "Trained on 1000 real wallets: what we learned"
slug: v05-real-corpus
date: 2026-05-25
status: published
tags: [ml, methodology, transparency]
disclaimer: "Sandbox model. Metrics below are honest holdout numbers from a small, curated set — they are NOT a claim about wild-traffic performance. Production calibration requires customer feedback we don't have yet."
---

# Trained on 1000 real wallets: what we learned shipping v0.5.0

> **TL;DR.** Our previous model card hid a fact we weren't proud of: it
> was trained on synthetic data with a bolt-on adversarial set. v0.5.0
> moves us to a real corpus — 1,000 Ethereum addresses pulled through
> Alchemy at training time + 125 adversarial patterns. Genuine pool grew
> 10× thanks to a new on-chain governance-voters source. Adversarial
> recall on a held-out evasion batch went from 0 → 1.0. Holdout AUC is
> still 1.0, which is honest about one thing and dishonest about
> another — explained below.

## What v0.4.0 actually was

For the previous two weeks the model serving `/v1/score` and `/v1/analyses`
was trained on **80 sybil + 80 genuine** addresses sampled from public
labelled lists, with features extracted via Alchemy. That's enough to
prove the pipeline works end-to-end. It's not enough to put a number on
the page that means anything to a customer.

Worse, the genuine half came almost entirely from one source: 200 ENS-name
holders with ≥50 transactions. So the model's idea of "human" was "owns
an ENS domain." That correlates with humanity, but it correlates more
strongly with being early to Ethereum. A real user joining today with no
ENS would have looked statistically alien.

## What changed in v0.5.0

Two things.

**1. Genuine corpus expanded 10×.** We added a new G2-tier source:
`governance-voters` — addresses that voted on ≥2 distinct on-chain
proposals at Uniswap, Compound, or ENS governors. Casting an on-chain
vote requires holding the governance token at the proposal's snapshot
block AND paying gas — a signal a Sybil farm can't easily fake at scale.
The deriver pulls `VoteCast` event logs from a public Ethereum RPC node;
no third-party indexer dependency.

Result: genuine pool went from 170 unique addresses to **1,669**.

**2. Adversarial set baked into training, not just evaluation.** We
already had a synthetic adversarial generator covering 5 evasion
techniques (scripted timing with randomised noise, CEX-funded with
identical contract sequence, dormant-then-burst, multi-hop funding chain,
noisy-but-autocorrelated trades). Previously it was eval-only. Now we
mix 125 of those into the training set with a separate `ADV` tier and
weight 1.5, and **evaluate against a different seed** to measure honest
generalisation.

Before: adversarial recall = 0.0. After: **1.0** against a held-out
adversarial batch (100 patterns at seed 9999, training seen seed 42).

## Metrics

Holdout = 30 sybil (T1+T2 hand-verified) + 30 genuine (G2):

```
precision_at_70    1.000
recall_at_70       1.000
f1_at_70           1.000
roc_auc            1.000
fpr_on_G1          0.000
adversarial_recall 1.000   ← was 0.000 in v0.4.0
n_train            900     (after internal 80/20 split)
n_holdout_sybil    30
n_holdout_genuine  30
```

## Why holdout 1.0 is half-honest

The metrics above are real — we hold out the rows, the model never sees
them at training, the numbers come from `predict_proba`. What they
*don't* tell you is that **the holdout is small and trivially separable**.
LayerZero-amnesty sybils look very different from ENS+governance voters
even before any feature engineering. A linear classifier on `tx_count`
alone would probably hit 0.95+ on this split.

We could lie by reporting 1.0 and shipping a page that says "production
ready." We won't. The honest interpretation is:

- **The pipeline works.** Alchemy ingestion → feature extraction →
  scoring → evidence generation → audit log all execute correctly on
  real chain data.
- **The model has learned a real signal.** Not noise.
- **We do not know wild-traffic precision/recall.** A fresh wallet
  funded yesterday by a CEX, holding no governance tokens, is a normal
  new user — and our model has only ~1700 examples of "this is fine."
  Until we have wild-traffic feedback, the false-positive rate on
  small/new accounts is the open question.

## Concrete admissions

- **ENS-veterans source is frozen.** The hosted ENS subgraph at
  `api.thegraph.com` was deprecated in mid-2024 and now 429s. We didn't
  catch this earlier because the cached 200-row CSV was still on disk.
  Decentralised Graph requires GRT-funded API keys; we'll switch when
  the math makes sense.
- **Snapshot.org GraphQL is unreachable from our VPS** (timeouts on
  port 443). A separate Snapshot-voters deriver is written and disabled,
  awaiting a fix on their end or a residential-IP scraper.
- **Gitcoin Passport G1 source not integrated yet.** It's the strongest
  available "verified human" signal, but their endpoint is per-address
  and rate-limited. Needs caching infra we haven't built.
- **Production-customer feedback is the next milestone.** Until we have
  it, every external metric we publish includes the n= and the holdout
  composition, because we don't want anyone to mistake "1.0 on 60 hand-picked
  addresses" for "1.0 on your address list."

## What we want from you

If you ran an airdrop in 2024-2025 and have a labelled list (or even
just a "we think these are fine" list), email
[support@sybilshield.org](mailto:support@sybilshield.org). A pilot
analysis on your real corpus, with full evidence per address and a
public methodology brief, is the fastest way for both sides to know
whether the system actually works at your scale. Pricing on
[/pricing](/pricing).

## What's next

- **Wild-traffic feedback loop.** Score, get a thumbs-up/down, re-train.
- **Drift cron** that flips us back to retraining the moment feature
  distributions shift.
- **Gitcoin Passport G1 caching** — when it lands, our genuine ceiling
  goes from ~1,700 → ~50,000.
- **Cross-chain identity linking** out of beta (currently Ethereum +
  Arbitrum + Optimism + Base + Polygon all enabled but the multichain
  cluster code is conservative — would rather false-negative than
  false-positive a single human across chains).

Everything above is reproducible from the [public methodology page](/methodology),
the [open-source repo](https://github.com/Dev-In-Crypt/Sybil-Shield-),
and the per-analysis evidence payload that comes back with every
`/v1/analyses/:id/results` response.

If you find a wallet our model called wrong — file an appeal at
[/appeal](/appeal). 48-hour SLA, full audit-log trail, no NDA required.
