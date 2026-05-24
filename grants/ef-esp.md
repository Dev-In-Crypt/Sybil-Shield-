# Ethereum Foundation — Ecosystem Support Program

**Submit at:** https://esp.ethereum.foundation/applicants
**Form:** General Grants (long form)
**Target ask:** $80,000 over 6 months

---

## Project name

SybilShield — open methodology for Sybil-resistant token distributions

## What are you building?

SybilShield is an open-source detection engine for Sybil farms in token distribution events (airdrops, governance, DeFi farming). Six independent detection methods produce evidence-backed scores; an immutable audit log and public appeal protocol make filtering decisions defensible to the community.

The hosted service is the commercial side. The protocol — clustering algorithms, feature extractors, audit-log schema, appeal flow — is MIT-licensed and lives on GitHub.

## Why does this matter for Ethereum?

Every major Ethereum-ecosystem distribution in 2023-2026 has been industrially farmed:
- Arbitrum: 148,595 Sybils slipped past Nansen → ~22% of supply leaked
- zkSync: one farmer extracted $753K from 85 wallets
- Linea: 40% of 1.3M eligible addresses flagged Sybil, no public appeal
- LayerZero: 803K filtered, methodology private, community backlash

The cost is paid by real users (less per-wallet allocation), projects (capital diverted to farmers who dump immediately), and the L2 ecosystem (worse PMF signal from token distributions). Better detection — especially detection that's open, auditable, and appealable — is a public good for the entire Ethereum economy.

## What's the unique technical insight?

Three things existing tools don't combine:

1. **Tier-weighted label training.** Most public Sybil lists are themselves outputs of other detectors. Training a model on them inherits their false positives. We classify labels by confidence tier (T1 confessed → T4 single-detector) and weight training accordingly. Evaluation is on T1+T2+G1 holdout ONLY — no agreement-with-another-detector inflation.

2. **Cross-chain identity linking via bridge events.** Bridge contracts emit structured events that deterministically link an EOA on one chain to an EOA on another. Most current filters work one chain at a time. Adding cross-chain linking surfaces ~15% of farms that would otherwise pass.

3. **Appeal-first design.** Every flagged event writes to an immutable audit log with actor / timestamp / evidence snapshot. A public appeal endpoint with a 48h SLA is built into the protocol. This isn't a UX feature — it's a contractual obligation for anyone using our scores in public filter lists. The current Sybil-detection landscape has no such norm.

## Current status

Public beta. 63 automated tests green in Docker. Full API + dashboard live in sandbox mode. Six detection methods implemented and unit-tested. Real ENS-veteran data (100 addresses) curated; synthetic T1-T4 placeholders for sybil seed. Baseline LightGBM model trained — AUC=1.0 on synthetic holdout, calibration pending real corpus.

GitHub: https://github.com/USER/sybilshield (MIT)
Live demo: https://sybilshield.com (sandbox)
First retro-analysis (Linea): publishing Q3 2026

## What does the funding cover?

| Item | Months | Cost |
|---|---|---|
| Alchemy Scale tier (production on-chain data) | 6 | $1,200 |
| Self-hosted Erigon node (Hetzner) | 6 | $1,800 |
| Hosting (Railway + Vercel + Supabase + Upstash) | 6 | $4,200 |
| Manual labeled-data curation (paid researchers) | one-time | $6,000 |
| Public retro-analyses on 4 completed airdrops | 4 reports | $8,000 |
| Founder time, 50% on public-good components | 6 months | $48,000 |
| Adversarial red-team contractor | 1 month | $8,000 |
| Defamation insurance | 1 year | $2,800 |
| **Total** | | **$80,000** |

The public-good components (free single-address scoring API, public retros, open-methodology docs) are unsubsidised by the commercial revenue we expect to generate by month 6. EF grant covers the bridge.

## Deliverables (verifiable)

| Month | Deliverable |
|---|---|
| 1 | Production deployment, real Alchemy data live, free public scoring API at /v1/score/:address |
| 2 | Linea retro-analysis published (aggregate-only, public methodology) |
| 3 | LayerZero amnesty retro published; calibrated production model v1.0 trained on real corpus |
| 4 | Arbitrum 2023 retro published; SDK release (TypeScript + Python) |
| 5 | Galxe / Gitcoin Passport integration as a credential |
| 6 | Q3 + Q4 ecosystem report: "State of Sybil filtering 2026" with aggregate stats from 6 retros |

Each deliverable verifiable from the public GitHub commit history + the live site.

## Team

Solo founder + open-source contributors at this stage. Pre-incorporation. Funded contributors will be named publicly as they join. Founder contact: [REAL NAME] · [EMAIL] · [LINKEDIN/TWITTER].

Plan to incorporate (Delaware C-corp via Stripe Atlas) after first paid customer or grant lands, whichever comes first.

## Why ESP and not VC?

The public-good components — open methodology, free scoring API, public retros, appeal protocol — don't have a venture-scale return. They benefit every Ethereum project running a distribution, not just our customers. VC funding would push us to gate everything behind payment.

EF funding lets us keep the methodology open while building a hosted business that subsidises the protocol over time.

## Sustainability after grant

Hosted product revenue:
- $499/mo Developer plan target: 30 customers by month 6 → $15K MRR
- $1,499/mo Growth plan target: 8 customers → $12K MRR
- Per-analysis: 3-5 deals/month at $5K avg → $15-25K
- **Run-rate target month 12:** $40-80K MRR, ~$500K ARR

Open-source components stay open regardless of revenue. If the company fails, the protocol survives.

## Risks

| Risk | Mitigation |
|---|---|
| Farmers adapt to detection methods | Adversarial test set + monthly retrain orchestrator already built (see /apps/ml/sybilshield/eval/) |
| Trusta or Nansen build competing open method | Differentiation is appeal protocol + audit log, not just detection quality |
| Defamation lawsuit | $2M insurance budgeted; public-retros policy is aggregate-only; per-customer SLAs require appeal flow |
| Founder bus factor | Solo today; first hire planned at month 3 with grant funds |

## What we are NOT asking for

We're not asking EF to validate any specific filtering decision, endorse our scores, or take political position on which projects should run airdrops. We're asking for funding to build open infrastructure that improves every project's ability to filter well.

## Open questions for the EF reviewer

- Is the public retro-analysis methodology aligned with EF's communications principles? Happy to share the Linea draft for review pre-publication.
- Are there other public-goods funders we should coordinate with (Octant, RetroPGF)? We'd prefer to avoid duplicate funding.
- Any concerns about the appeal protocol design we should address before the grant decision?

## References

- https://github.com/USER/sybilshield — MIT
- https://sybilshield.com — live sandbox
- https://sybilshield.com/methodology.html — public detection methodology
- https://sybilshield.com/security.html — security & vulnerability disclosure
- (Linea retro post URL once published)
