# Gitcoin Grants — submission-ready

> Apply at: https://builder.gitcoin.co (Gitcoin Builders) or https://explorer.gitcoin.co
> Round to target: **OSS / Web3 Infra** round (rolls quarterly — check active rounds)
> Match funding type: **Quadratic Funding** (we need MANY small donations, not one large)

---

## Pre-requisites (set up BEFORE applying)

- [ ] Twitter account `@sybilshield` (active, ≥10 posts)
- [ ] Discord server (even 1-person) with public invite
- [ ] Gitcoin Passport stamps: GitHub, Twitter, Discord, ENS, Lens or Farcaster
- [ ] GitHub repo public with ≥10 stars (ask friends, post in Telegram)
- [ ] Mirror.xyz or Paragraph blog with ≥1 post (publish the Linea retro)

---

## Project name

```
SybilShield
```

## Tagline (max 60 chars)

```
Open-source Sybil detection with public appeal protocol
```

## Project banner

Use `/og-image.svg` from the repo or create a 1200×630 banner with the hexagonal shield logo + tagline.

## Project website

```
https://sybilshield.org
```

## Description (markdown, ~500 words)

```markdown
**SybilShield is the open detection infrastructure for Ethereum token distributions.**

Every major airdrop in 2023-2026 has been industrially farmed — Arbitrum lost ~22% to ~150K Sybil wallets, zkSync had a single farmer extract $753K from 85 wallets, Linea flagged 40% of 1.3M eligible addresses with no public appeal, LayerZero filtered 803K with private methodology and community backlash. The cost is paid by real users (less per-wallet), projects (capital diverted to dumpers), and the L2 ecosystem (worse PMF signal).

Closed-source competitors (Trusta, Nansen, Chainalysis) provide scores on faith with no methodology disclosure and no appeal. We treat Sybil filtering as **public infrastructure**.

### Six detection methods, all open

1. Funding-source clustering — catches multi-wallet farms funded from a single source
2. Behavioral HDBSCAN — finds wallets with statistically identical action sequences
3. Graph community detection (Leiden) — detects coordinated transfer rings
4. Temporal anomaly features — bot-rhythm inter-tx variance
5. Cross-chain identity linking via bridge events
6. LightGBM ensemble combining all five

### Mandatory appeal protocol

Every flagged event writes to an immutable audit log (actor, timestamps, evidence snapshot). A public appeal endpoint with 48h SLA is built into the API. Any project using SybilShield scores in a public filter list is **contractually required** to provide this mechanism. We're trying to establish "appeal flow mandatory" as a community norm.

### Status

- Live: https://sybilshield.org (full beta, real Alchemy data on 5 chains)
- API: https://api.sybilshield.org (free 100 calls/mo, no signup for lookup)
- Repo: https://github.com/Dev-In-Crypt/Sybil-Shield- (MIT)
- 18 + 47 automated tests green in CI
- LightGBM model v0.2.0 deployed; first published retro analysis Q3 2026

### What grant funding enables

This Gitcoin round funds the **public-good components** that paid customers don't subsidise:

- Free public single-address scoring API (rate-limited)
- 4 public retro-analyses on completed airdrops (Linea, LayerZero, Arbitrum, zkSync)
- TypeScript + Python SDK release for community integration
- Adversarial test set generator (open to red-teamers)
- "State of Sybil filtering 2026" annual report

The hosted commercial product (subscriptions, per-analysis batches) funds runway; Gitcoin funds the parts that benefit every airdropping project, not just paying customers.

### Why donate

If you've ever:
- Run an airdrop and worried about farmers
- Been flagged genuine but couldn't appeal
- Built a DAO and needed Sybil-resistant governance
- Wanted transparency in how filter lists are made

...then this is infrastructure you benefit from. Even $5 in a quadratic round signals legitimacy and gets us match funding orders of magnitude higher.

**MIT licensed, audit-able, appealable. Donate, fork, or just star the repo.**
```

## Categories (multi-select)

- Open source / public good
- Web3 infrastructure
- Developer tooling
- L2 / scaling

## Eligible chains

- Ethereum mainnet
- Arbitrum
- Optimism
- Base
- Polygon

## Tweet during round

```
Just listed SybilShield on @gitcoin Grants.

If you've run an airdrop, been flagged sybil unfairly, or just want open methodology in detection — even $1 in QF signals legitimacy and pulls match funding.

→ explorer.gitcoin.co/#/projects/[PROJECT_ID]

MIT licensed. Open methodology. Built-in appeal flow.
```
