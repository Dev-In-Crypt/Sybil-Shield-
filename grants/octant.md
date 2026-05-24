# Octant — Public Goods Funding

**Submit at:** https://octant.app/projects/new
**Form:** Short project profile + quadratic round
**Target ask:** Whatever the quadratic match yields

---

## Project name

SybilShield

## One-liner

Open-source Sybil detection for token distributions. Six methods. Public methodology. MIT licensed.

## Why this is a public good

Airdrops lose 20-40% of value to industrial Sybil farming. The cost is paid by real users (less allocation per wallet) and entire ecosystems (worse PMF signals from distributions). Better Sybil detection benefits every project running a distribution and every user receiving one.

We open-source the detection methodology, audit-log schema, and appeal protocol. The hosted service is paid; the protocol is free. Same model as Sentry, Posthog, Supabase — the operations are commercial, the protocol is a public good.

## What we've shipped

- 6 independent detection methods (funding, behavioral HDBSCAN, graph Leiden, temporal, cross-chain, ML ensemble)
- 63 automated tests, full Docker stack
- Public appeal endpoint with 48h SLA + immutable audit log
- Methodology documentation
- Static preview at https://sybilshield.com (sandbox)

## What public-good components Octant funding supports

| | |
|---|---|
| Free public scoring API | `GET /v1/score/:address` rate-limited but free for any project to test |
| Open methodology | All algorithms MIT on GitHub; we maintain documentation |
| Public retrospectives | 4 retros/year on completed airdrops (Linea, LayerZero, Arbitrum, etc.) — aggregate-only |
| Appeal protocol spec | Documented, reference-implemented, freely reusable |
| Adversarial test set | Public, versioned, so others can benchmark their own detectors |

## Cost transparency

We track public-good spending separately from commercial. Per-quarter budget:

| Category | Per-quarter cost |
|---|---|
| Alchemy CU for free scoring tier | $200 |
| Hosting for public-good endpoints | $150 |
| One retrospective post (research + writing + verification) | $2,000 |
| Updates to open-source methodology docs | $500 |
| Adversarial test set maintenance | $300 |
| **Public-good total / quarter** | **$3,150** |

We commit to publishing actual spending vs budget every quarter.

## Identity / accountability

- Founder: [REAL NAME] · [EMAIL]
- GitHub: https://github.com/USER (will be linked when public)
- Multi-sig: planned Gnosis Safe (2-of-3) for grant funds

## What we won't do with grant funds

- Pay for paid commercial features (Stripe integration, enterprise SLA, dedicated instances)
- Marketing / paid acquisition
- Token launch (we have no plans for one)
- Equity dilution

If we ever raise venture funding, the public-good components stay funded by grants or by carve-out from commercial revenue. Public-good doesn't become VC roadkill.

## Links

- https://github.com/USER/sybilshield
- https://sybilshield.com
- https://sybilshield.com/methodology.html
