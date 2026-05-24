# Arbitrum DAO — Domain Allocator (Education / Infra)

**Submit at:** https://forum.arbitrum.foundation/ (temperature check first)
**Form:** DAO proposal (temp check → snapshot → on-chain)
**Target ask:** 50,000 ARB over 6 months

---

## Proposal title

Funding open-source Sybil-detection infrastructure for Arbitrum ecosystem airdrops

## Summary

Arbitrum's 2023 airdrop lost ~22% of supply to ~148K Sybil addresses that slipped past industry-leading filters. Ecosystem projects launching on Arbitrum (Camelot, Gains, Trader Joe, et al.) face the same problem with each distribution. SybilShield is an open-source detection engine — six methods, public methodology, public appeal flow — that any Arbitrum-ecosystem project can use to filter distributions.

We request 50,000 ARB to fund:
1. Free public scoring tier for Arbitrum-ecosystem projects (12 months)
2. Public retrospective analysis of 2023 distribution + 3 ecosystem airdrops
3. Arbitrum-specific cross-chain identity linking (Stargate, Hop, etc. bridge correlation)

## Why Arbitrum DAO should fund this

Arbitrum's 2023 distribution is the most-studied airdrop in crypto. The numbers are public, the failures are documented, the community drew the right lessons. Funding the next generation of detection infrastructure on Arbitrum closes that loop publicly and helps every project that launches on the L2.

This is infrastructure that benefits:
- **L2 token holders** — better filtering = less dilution from farmers dumping
- **Ecosystem projects** — lower cost-per-analysis vs Nansen consulting
- **DAO governance** — Sybil-resistant voting infrastructure ships as a side effect
- **Long-term ecosystem reputation** — fewer "Arbitrum airdrop was farmed" headlines

## What's been built

- 6 detection methods, full pipeline, 63 automated tests green
- Public methodology, MIT-licensed
- Audit log + public appeal endpoint
- Live sandbox at https://sybilshield.com

GitHub: https://github.com/USER/sybilshield

## Deliverables (paid in tranches)

| Milestone | Deliverable | ARB |
|---|---|---|
| 1 | Production deployment + free Arbitrum-project scoring at /v1/score (1000 calls/day per project, no payment) | 12,000 |
| 2 | Public retrospective: "Arbitrum 2023 — what we'd flag differently" (aggregate-only) | 10,000 |
| 3 | Arbitrum-specific cross-chain linker: Stargate, Hop, Synapse, Across bridge events fully indexed | 10,000 |
| 4 | 3 ecosystem airdrop retros (project of DAO's choice, mutually agreed) | 10,000 |
| 5 | Arbitrum DAO governance Sybil-detection pilot for 1 vote, full report | 8,000 |

Each milestone paid only on completion verified by public deliverable (GitHub commit, published post, working endpoint).

## Why not just use Nansen / Trusta?

| | Nansen | Trusta | SybilShield |
|---|---|---|---|
| Methodology open | No | Partial | MIT |
| Per-analysis cost | $50-150K | $1-3K | $2.5-15K (free for ecosystem projects in this grant) |
| Audit log | No | No | Immutable, queryable |
| Appeal protocol | No | No | Public, 48h SLA |
| Cross-chain | Some | Limited | 8 chains + bridge correlation |
| Multi-tier label training | No | No | Yes |

Specifically for Arbitrum: a free public tier for ecosystem projects (funded by this grant) lets even small projects pre-airdrop run quality filtering. Today only well-funded projects can afford Nansen-grade analysis.

## Sustainability

The hosted business runs on commercial subscriptions (Developer $499/mo, Growth $1499/mo, Enterprise). The grant funds the Arbitrum-specific public-good components (free ecosystem tier + retros + bridge-correlation tooling). After 12 months the bridge-correlation code remains open-source and the retros remain published, even if SybilShield as a company ceases to exist.

## Risks & mitigations

| Risk | Mitigation |
|---|---|
| Project fails / disappears | All code MIT; ecosystem-tier scoring service can be self-hosted by any DAO grantee |
| Detection quality insufficient | Retros are aggregate; methodology open so claims are auditable; appeals public |
| Misuse of free tier (project uses for unrelated chains) | Free tier rate-limited and Arbitrum-ecosystem-only; tracked via API key scope |

## Proposal structure

1. Forum temperature check (target: 30+ engaged replies, 70%+ positive)
2. Snapshot vote (target: pass with >5% quorum)
3. On-chain vote (final approval)
4. ARB transferred to multi-sig (Gnosis Safe, 2-of-3 with: founder, contributor, neutral observer from DAO)
5. Milestones paid on public verification

## Founder

[REAL NAME] · [EMAIL] · [TELEGRAM]
GitHub: https://github.com/USER
Doxxed: yes (LinkedIn / Twitter linked above)

## Comments welcome

This proposal is in temp-check form. Specific things we want DAO feedback on:
- Tranche sizes appropriate?
- Anything about Arbitrum-specific methodology we should add?
- Multi-sig participant suggestions (need a 3rd neutral signer)
- Alternative deliverables you'd value more
