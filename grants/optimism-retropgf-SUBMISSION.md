# Optimism RetroPGF — submission-ready

> Apply at: https://retrolist.app/list (during open round — check round schedule)
> Round: **RetroPGF 5+** (round numbers ongoing)
> Type: **Retroactive funding** — for IMPACT already delivered, not roadmaps

---

## Pre-requisites (CRITICAL for RetroPGF)

- [ ] **Deployment on OP Mainnet** — RetroPGF requires demonstrated impact on Optimism. Enable Optimism in Alchemy app + adjust at least one customer analysis to be on OP
- [ ] **Public contribution proof** — links to GitHub commits, deployed contracts, published analyses
- [ ] **Measurable user/usage metrics** — number of analyses, addresses scored, repos forked, etc.
- [ ] Atestations from OP ecosystem projects who used the tool (even 1-2 quotes)

---

## Project name

```
SybilShield
```

## Category (RetroPGF rounds have specific categories — pick the closest)

```
Onchain builders / Tooling / Public goods infrastructure
(Match against the specific categories for the round you're applying to)
```

## Project URL

```
https://sybilshield.org
```

## Repo

```
https://github.com/Dev-In-Crypt/Sybil-Shield-
```

## Impact statement (~300 words)

SybilShield delivered open Sybil detection infrastructure live on Optimism in [MONTH] 2026. Concrete impact during the eligible period:

**1. Free public scoring on OP addresses.**
The `GET /v1/score/:address?chain=optimism` endpoint scored [N] unique OP addresses, free, no signup required, with HMAC-signed evidence per flag. This is infrastructure other OP projects can call directly — and have called [N] times in the eligible period.

**2. Open methodology for the OP ecosystem.**
All 6 detection methods, the audit-log schema, and the appeal protocol specification are MIT-licensed at github.com/Dev-In-Crypt/Sybil-Shield-. The OP airdrop debrief and any future OP-ecosystem distribution can use this without paying licensing fees.

**3. Appeal protocol — a structural improvement to the OP airdrop process.**
Past OP airdrops had no standardised appeal mechanism for flagged wallets. SybilShield's protocol specifies a public `POST /v1/appeals` endpoint with 48h SLA. We're proposing this as a default for OP grants programs and future airdrops. [Tag relevant OP delegates who've engaged].

**4. Public retro-analysis of [airdrop]**
Aggregate-only retro of [airdrop name] published at sybilshield.org/blog/[slug] with full methodology. This is the kind of public post-mortem that makes future OP distributions auditable.

**5. Adversarial test set v1**
Open red-team set so other OP-ecosystem detection tools can stress-test claims publicly. [N] addresses, [N] scenarios, freely forkable.

## Measurable metrics for the eligible period

| Metric | Value |
|---|---|
| Unique OP addresses scored via public API | [TO FILL after launch metrics] |
| Total OP API requests | [TO FILL] |
| OP-ecosystem projects using the tool | [TO FILL — list any] |
| GitHub stars | [TO FILL] |
| Forks | [TO FILL] |
| Blog post views (Linea retro) | [TO FILL] |
| Appeal endpoint usage | [TO FILL] |

(Will be populated from PostHog + GitHub at the round-snapshot moment.)

## Why this is RPGF-eligible

RetroPGF rewards builders for **value already created**, not promises. We've shipped:

- Production deployment with multi-chain Alchemy including OP
- Open MIT-licensed methodology in production use
- Public scoring API live, rate-limited, free
- First retro analysis published with full methodology
- Audit-log + appeal protocol — community-norm-establishing work

This is "tooling for the OP collective" — directly usable by Optimism RPGF-funded projects, governance, and grants programs that need Sybil filtering.

## Linked attestations / supporters

```
[NAME] (delegate / project lead at [PROJECT]):
"We used SybilShield to filter our [grant / airdrop / vote]. [Quote]."

— Need 2-3 quotes from real OP ecosystem people. Reach out NOW to:
- @optimismgov delegates who care about Sybil
- OP grants program leads (their grants get sybiled too)
- Builders of OP-ecosystem governance frontends
```

## Funding-link suggestion

Conservative ask aligned with measurable impact: **$15,000 - $50,000** depending on metrics at snapshot. RetroPGF tends to over-fund projects with clear public-good contribution + measurable usage; we'll let the badge-holders decide.
