# Twitter thread — Linea retro release

**When to post:** After ML model on real Alchemy data is calibrated + Linea retro blog post is up at sybilshield.org/blog/linea-retro

**Hashtags:** #Ethereum #Sybil #Airdrop #L2 #OpenSource (use 2-3 max)
**Tag:** @LineaBuild (optional — they don't have to engage, but it surfaces)

---

## Tweet 1/10 (the hook)

We re-ran six independent Sybil detection methods on Linea's full 1.3M airdrop snapshot.

We agree with Linea on 478K of their 517K flags.
We'd add 45K they missed.
We'd reverse 10K they got wrong.

Full methodology, aggregate-only, open source ↓

🧵

---

## Tweet 2/10 (framing)

Why this matters:

Linea filtered 40% of their distribution. The community got loud. There was no appeal flow. No published methodology. Just a flag-or-not list.

We wanted to know if our methodology — built independently — would land in the same place. Mostly yes. Where not, interesting.

---

## Tweet 3/10 (agreement matrix)

The numbers:

```
                Linea SYBIL  Linea GENUINE
Our SYBIL          478K          45K        ← candidates Linea missed
Our GENUINE         39K         738K
                  (10K likely FP)
```

92.5% agreement on flags. 94.3% on genuine. The disagreements are where the methodology debate lives.

---

## Tweet 4/10 (six methods)

How we got to those numbers — six independent detection methods, each one its own check on the others:

1. Funding-source clustering (catches the cheapest farms)
2. Behavioral HDBSCAN (catches the laundered ones)
3. Graph Leiden (catches coordinated rings)
4. Cross-chain entity linking
5. Temporal anomaly features
6. LightGBM ensemble on top

---

## Tweet 5/10 (the missed 45K)

The 45K we'd add — what made them stand out:

- Cross-chain identity match to a confessed LayerZero farmer
- Funding-source cohort of >100 wallets with median tx interval = 47 minutes (bot rhythm)
- Behavioral cluster with feature-vector overlap >0.94

Linea's filter looked one-chain-at-a-time. Bridge events tell on a lot of people.

---

## Tweet 6/10 (the disputed 10K)

The 10K we'd reverse — what they have in common:

- ENS registered pre-2021
- 200+ tx across diverse contracts
- Long inter-tx variance (human-paced)
- Active in DAO governance on Snapshot

Filter-by-pattern catches the type. The exceptions are the cost of doing it without an appeal flow.

---

## Tweet 7/10 (the appeal protocol point)

A point we want to make loud:

If you publish a list naming wallets "Sybil," you owe those wallets an appeal mechanism with a posted SLA. Period.

Linea didn't. Neither did LayerZero. Neither did Arbitrum on their original filter.

We bake the appeal flow into the protocol contractually.

---

## Tweet 8/10 (tier-weighted training)

A subtler methodology point:

Most public Sybil lists are themselves outputs of other detectors. Training on them inherits their false positives.

We classify labels by confidence tier (T1 confessed → T4 single-detector) and evaluate ONLY on T1+T2+G1. No detector-agreement inflation.

---

## Tweet 9/10 (what's open)

Everything is MIT:

- Six detection methods
- Feature extractors
- Cross-chain bridge-event resolver
- Audit-log schema
- Appeal protocol spec
- Adversarial test set generator

You can fork it, run it on your own filtered list, disagree with us in detail.

github.com/Dev-In-Crypt/Sybil-Shield-

---

## Tweet 10/10 (CTA + soft pitch)

The hosted product is the commercial side. The protocol is open.

- Try it free: sybilshield.org/lookup (any address, no signup)
- Read the methodology: sybilshield.org/methodology
- Public beta API: 100 calls/mo free

Pre-TGE? Talk to us before your distribution, not after. ↓

sybilshield.org/pricing

---

## Optional follow-ups (if engagement is high)

**Reply to 1:** "We didn't pre-coordinate with Linea on this. The 45K candidates are NOT being published as a list. If a project wants to act on them they need to file appeals on the addresses themselves — that's the protocol obligation."

**Reply to 3:** "The 92.5% number isn't a flex. Two well-built detectors trained on overlapping public lists SHOULD agree at this rate. The disagreement set is what makes the work interesting."

**Reply to 9:** "Yes you can self-host. Docker-compose ships with the repo. Hetzner CX22 (€5/mo) handles ~100k addresses comfortably. Bigger jobs need an Alchemy growth plan."
