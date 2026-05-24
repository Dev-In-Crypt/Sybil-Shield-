# LayerZero Foundation Grant

**Submit at:** https://foundation.layerzero.network/grants (or via Discord intake)
**Form:** Medium grant application
**Target ask:** $40,000-$75,000 over 6 months

---

## Project name

SybilShield — cross-chain identity linking via bridge events

## What we're building

The piece of SybilShield most directly relevant to LayerZero: a deterministic cross-chain identity linker that uses bridge events (Stargate, LayerZero OFTs, etc.) as ground truth for linking wallet identities across the 8+ chains the LayerZero protocol connects.

This is critical infrastructure for:
- LayerZero-deployed airdrops (where farmers run wallets across 5-10 chains to multiply allocations)
- Cross-chain governance Sybil resistance
- The LayerZero ecosystem broadly — every project using Stargate / OFT has this problem

The full SybilShield system (6 methods) is open-source and MIT licensed. The cross-chain linker is the LayerZero-specific component we'd accelerate with this grant.

## Why this matters to LayerZero

LayerZero ran the most aggressive anti-Sybil filter in airdrop history — 803K addresses filtered, an amnesty program where 100K farmers self-reported. The methodology was solid given what was available; the community pain was the lack of public methodology and appeal process.

Cross-chain identity linking — what bridge events imply about wallet ownership — was a major part of LayerZero's filter. Open-sourcing this capability:
1. Lets every project deploying on LayerZero apply the same anti-Sybil rigor
2. Makes appeal claims auditable (the community can see what evidence flagged them)
3. Strengthens the LayerZero ecosystem's reputation for distribution integrity

## What's already shipped

- 6 detection methods including basic cross-chain linker
- Stargate, Hop, Synapse, Across bridge contract correlation
- Union-find aggregation for entity components
- Public methodology at https://sybilshield.com/methodology.html
- 63 tests green

GitHub: https://github.com/USER/sybilshield (MIT)

## What grant funding accelerates

| Deliverable | Months | Cost |
|---|---|---|
| Full LayerZero OFT event indexing (not just bridge contracts) across all supported chains | 1 | $5,000 |
| LayerZero-specific cross-chain entity database (open-source, daily updated) | 1 | $5,000 |
| Public retrospective: "LayerZero amnesty filter — what we'd agree with, what we'd add" (aggregate-only) | 1 | $8,000 |
| Documentation for LayerZero-ecosystem projects on integrating SybilShield | 1 | $4,000 |
| Free scoring tier for LayerZero-deployed projects (12 months) | ongoing | $18,000 |
| Infrastructure (Alchemy + self-hosted node + hosting) | 6 | $10,000 |
| Founder time on LayerZero-specific work, 30% allocation | 6 | $15,000 |
| **Total** | | **$65,000** |

## Deliverables (verifiable, paid in tranches)

| # | Milestone | Funding |
|---|---|---|
| 1 | Full OFT event indexing across 8+ chains, repo at github.com/USER/sybilshield-lz-indexer | 20% |
| 2 | Cross-chain entity DB live, public read API endpoint | 20% |
| 3 | LayerZero amnesty retro published (aggregate, methodology peer-reviewed) | 25% |
| 4 | Documentation + 3 case studies with LayerZero-ecosystem projects | 15% |
| 5 | 6-month operational continuity report (uptime, projects served, addresses scored) | 20% |

## Why us specifically

| | Trusta | Nansen | In-house | SybilShield |
|---|---|---|---|---|
| Open methodology | No | No | Variable | MIT |
| LayerZero-specific tooling | No | Some | Project-by-project | This grant funds it |
| Appeal protocol | No | No | No standard | Built-in |
| Pre-existing 6-method stack | No | Partial | No | Yes |

## Public-good positioning

The cross-chain entity database we build is permissionless to query. Any LayerZero-ecosystem project — not just our paying customers — can use it. The hosted scoring service is commercial. The data + methodology are public good.

If SybilShield as a company fails, the LayerZero-specific code lives on GitHub and the entity database can be self-hosted by any LayerZero Foundation grantee.

## Identity / accountability

- Founder: [REAL NAME] · [EMAIL] · [TELEGRAM]
- GitHub: https://github.com/USER
- Doxxed via [LINKEDIN/TWITTER]
- Treasury: Gnosis Safe (multi-sig, 2-of-3)

## Risk mitigation

| Risk | Mitigation |
|---|---|
| Farmers adapt to cross-chain detection | We track and publish adversarial-recall metrics monthly |
| LayerZero OFT spec changes | Indexer designed for plugability; rebuilds documented |
| False positives flag legitimate cross-chain users | Public appeal protocol; 48h SLA; aggregate-only public retros |

## What we won't ask LayerZero Foundation for

- Endorsement of specific filtering decisions
- Co-marketing or PR
- Equity stake (we're pre-incorporation; will incorporate Q4)
- Anything that compromises the public-good nature of the work

## Links

- https://github.com/USER/sybilshield
- https://sybilshield.com
- https://sybilshield.com/methodology.html (see "Cross-chain identity linking" section)
