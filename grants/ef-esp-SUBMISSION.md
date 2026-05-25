# EF ESP application — submission-ready text

> Open https://esp.ethereum.foundation/applicants
> Form: **General Grants** (long form)
> Paste each section below into the matching form field.
> Replace `[BRACKETED]` placeholders before submitting.

---

## Personal info (top of form)

| Field | Value |
|---|---|
| First name | `[YOUR FIRST NAME]` |
| Last name | `[YOUR LAST NAME]` |
| Email | `support@sybilshield.org` (forwards to your Gmail) |
| GitHub | `Dev-In-Crypt` |
| Twitter / X | `[YOUR HANDLE]` *(create one named `@sybilshield` if you don't have)* |
| Country | `[YOUR RESIDENCE]` |
| ETH wallet for grant disbursement | `[FRESH ETH ADDRESS — generate a new wallet just for grants, not personal]` |

---

## Project name

```
SybilShield — open methodology for Sybil-resistant token distributions
```

---

## One-line description (max ~140 chars)

```
Open-source Sybil detection engine for airdrops, DAO governance, and DeFi farms. Six methods, evidence per address, public appeal flow.
```

---

## Website / GitHub / Live demo

```
Website:    https://sybilshield.org
GitHub:     https://github.com/Dev-In-Crypt/Sybil-Shield-
Live API:   https://api.sybilshield.org/health
Methodology: https://sybilshield.org/methodology
```

---

## Funding amount requested

```
$80,000 (USD-equivalent in ETH or USDC) — 6 months runway
```

---

## What are you building? (~300 words)

SybilShield is an open-source detection engine for Sybil farms in Ethereum token distribution events: airdrops, DAO governance votes, DeFi reward programs, and grant disbursements.

Six independent detection methods (funding-source clustering, behavioral HDBSCAN, graph Leiden community detection, temporal anomaly features, cross-chain identity linking via bridge events, LightGBM ensemble) produce a probabilistic score 0–100 per address. Each flag is accompanied by a structured evidence payload listing which methods fired and which features pushed the score.

Two protocol choices set us apart from existing tools:

**1. Immutable audit log.** Every score change, every appeal, every reversal is written append-only with actor, prior/new score, evidence snapshot, and timestamp. Legal defensibility — both for the projects acting on our scores and for the wallets being flagged.

**2. Mandatory appeal protocol.** Any project that publishes filter lists derived from our scores is contractually required to provide a public appeal mechanism with a stated SLA (48h). We expose a public endpoint (`POST /v1/appeals`) so flagged wallets always have a recourse — this is built into the API, not a UX afterthought.

The hosted product (API subscriptions + per-analysis batches) is the commercial side. The protocol — algorithms, feature extractors, schemas, appeal flow specification, adversarial test set — is MIT-licensed and lives on GitHub.

Current state: public beta live at sybilshield.org. All six detection methods implemented and unit-tested. 63 automated tests green in Docker. Free single-address scoring endpoint working at `/lookup`. Calibrated production model and first published retro-analysis are the immediate next milestones.

---

## Why does this matter for Ethereum? (~250 words)

Every major Ethereum-ecosystem distribution in 2023-2026 has been industrially farmed:

- **Arbitrum (2023):** Nansen-verified Sybil list of 148,595 addresses; estimated ~22% of supply leaked to farmers
- **zkSync (2024):** one farmer extracted $753K from 85 wallets, methodology since dissected publicly
- **Linea (2024):** 40% of 1.3M eligible addresses flagged Sybil; community backlash from absent appeal process
- **LayerZero (2024):** 803K addresses filtered, methodology private, on-chain amnesty as remediation

The cost is paid by:
- **Real users** — every farm wallet reduces real-user allocation
- **Projects** — capital diverted to actors who dump immediately, distorting PMF signal
- **The L2 ecosystem** — each painful airdrop reduces willingness to launch tokens transparently

The current detection landscape (Trusta, Nansen, Chainalysis, in-house Dune queries) shares two flaws: methodology is private (you trust the score on faith), and no appeal mechanism is standard. The combination means projects ship filter lists that nobody can verify and flagged wallets have no recourse.

SybilShield treats Sybil filtering as a public infrastructure problem. If detection happens transparently and appeals are protocol-level, the Ethereum-economy cost of bad-faith filtering drops. EF support for open detection infrastructure is consistent with prior ESP grants to public-good observability (Otterscan, Curve Whitepaper, multiple wallet-debugging tools).

---

## What's the unique technical insight? (~250 words)

Three things existing tools don't combine:

**1. Tier-weighted label training.** Most public Sybil lists are themselves outputs of other detectors. Training a model on them inherits their false positives at unknown rates. We classify every label by confidence tier (T1 confessed under amnesty → T2 manually verified by researchers → T4 single-detector output) and weight samples accordingly. Evaluation is on T1+T2+G1 holdout *only* — no agreement-with-another-detector inflation, no leakage between train and test.

**2. Cross-chain identity linking via bridge events.** Bridge contracts emit structured events (Stargate, Hop, Across, official bridges) that deterministically link an EOA on one chain to an EOA on another. Most current filters work one chain at a time. Adding cross-chain linking surfaces an estimated ~15% of farms that would otherwise pass per-chain filters by splitting activity across L1/L2s.

**3. Appeal-first design.** Every flagged event writes to an immutable audit log with actor (`system:model:vX` or `customer:<id>` or `reviewer:<id>`), timestamps, evidence snapshot. A public appeal endpoint with 48h SLA is exposed at `POST /v1/appeals` with no authentication required. This is contractual — anyone using our scores in public filter lists must provide their own appeal mechanism. The current Sybil-detection landscape has no such norm; we're trying to establish one.

The hosted service is the commercial bridge; the protocol — algorithms, audit-log schema, appeal flow specification — is MIT and reusable by any project filtering distributions.

---

## Current status

Public beta live at https://sybilshield.org

- All 6 detection methods implemented and unit-tested
- 18 vitest cases (API) + 47 pytest cases (ML) — all green in Docker CI
- Backend live on Hetzner with Let's Encrypt TLS at https://api.sybilshield.org
- Frontend on Vercel with custom 404, sitemap, OG-tagged for social shares
- Real-data integration: Alchemy provider live for 5 chains (Ethereum + Arbitrum + Optimism + Base + Polygon)
- Billing enforcement live (per-plan quota + per-customer rate-limit + Atlos crypto checkout)
- Baseline LightGBM model `v0.2.0` trained on real on-chain features (15,640 train + 60 holdout)

Repo: https://github.com/Dev-In-Crypt/Sybil-Shield- (MIT)

---

## What does the funding cover?

| Item | Months | Cost |
|---|---|---|
| Alchemy Scale tier (production on-chain data) | 6 | $1,200 |
| Self-hosted Erigon node + Hetzner CCX22 | 6 | $1,800 |
| Hosting overflow (Vercel Pro after free tier, Supabase Pro) | 6 | $1,200 |
| Manual labeled-data curation (paid researchers) | one-time | $6,000 |
| Public retro-analyses on 4 completed airdrops | 4 reports | $8,000 |
| Founder time, 50% on public-good components | 6 months | $48,000 |
| Adversarial red-team contractor | 1 month | $8,000 |
| Legal incorporation + defamation insurance | 1 year | $3,000 |
| Bug bounty pool (Immunefi or self-managed) | one-time | $2,800 |
| **Total** | | **$80,000** |

The public-good components — free single-address scoring API, public retros, open-methodology docs, adversarial test set — are unsubsidised by the commercial revenue we expect to generate by month 6. EF grant covers the bridge.

---

## Verifiable deliverables (one per month)

| Month | Deliverable | How verifiable |
|---|---|---|
| 1 | Production deployment with multi-chain Alchemy, free public `/v1/score/:address` API | Live curl from any IP |
| 2 | Linea retro-analysis published (aggregate-only, public methodology) | sybilshield.org/blog/linea-retro |
| 3 | LayerZero amnesty retro; calibrated production model v1.0 trained on real corpus | GitHub commit + blog post |
| 4 | Arbitrum 2023 retro; SDK release (TypeScript + Python) | npm + pypi publishes |
| 5 | Galxe / Gitcoin Passport integration as a verifiable credential | On-chain credential issued |
| 6 | Q3+Q4 ecosystem report: "State of Sybil filtering 2026" with aggregate stats from 6 retros | Published PDF + tweet |

Each deliverable verifiable from the public GitHub commit history + the live site without any reporting overhead.

---

## Sustainability after grant

Hosted product revenue plan:
- **Developer plan** ($499/mo): target 30 customers by month 6 → **$15K MRR**
- **Growth plan** ($1,499/mo): target 8 customers → **$12K MRR**
- **Per-analysis** ($2,500-15,000 per batch): target 3-5 deals/month at $5K avg → **$15-25K**
- **Run-rate target month 12:** $40-80K MRR → ~$500K-1M ARR

Open-source components stay open regardless of revenue. If the company fails, the protocol survives in the repo and on any forked install.

---

## Risks

| Risk | Mitigation |
|---|---|
| Methodology challenged in public dispute | Open methodology + per-flag evidence + public appeal protocol mean any disagreement is appealable & verifiable |
| Defamation lawsuit from flagged wallet operator | (1) Scores are probabilistic, framed as such; (2) appeal flow built into ToS; (3) defamation insurance budgeted; (4) audit log preserves chain-of-custody |
| Adversarial bypass research | Adversarial red-team contractor + ongoing adversarial test set ensure methodology evolves with farmers |
| Alchemy / cloud cost overrun | Self-hosted Erigon backstop; rate-limited free public API caps abuse |
| Solo founder burnout | Codebase + docs designed for hand-off; MIT license means project survives even if I step away |

---

## Why ESP and not VC?

The public-good components — open methodology, free public scoring API, public retros, appeal protocol specification — don't have a venture-scale return. They benefit every Ethereum project running a distribution, not just our customers.

VC funding would push us to gate everything behind payment. EF funding lets us keep the methodology open while building a hosted business that subsidises the protocol over time.

---

## Anything else?

We've deliberately scoped the ask small ($80K, 6 months) so the milestone outcomes are tightly verifiable. We expect to apply for follow-on funding (likely Octant or RetroPGF) based on adoption metrics after the first 6 months, not as a continuation grant.

We're not asking the EF to validate our scores or endorse the methodology. We're asking for runway to publish enough public retros that the methodology can be peer-reviewed openly — same way Otterscan made transaction tracing auditable, we want to make Sybil filtering auditable.

Happy to hop on a call if useful.
