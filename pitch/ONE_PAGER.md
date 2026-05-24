# SybilShield — one-pager

## The problem

Airdrops are broken. Every major distribution in 2023-2025 lost 20-40% of value to Sybil farmers:

- Arbitrum: 148,595 addresses still slipped past Nansen, took ~22% of supply
- zkSync: one farmer extracted ~$753K from 85 wallets; another reportedly ran 21,000+ addresses
- Linea: 40% of 1.3M eligible addresses flagged as Sybil
- Aptos: 40% of distributed tokens deposited to exchanges within days

Projects either overspend on detection ($150K consulting), underinvest and lose millions, or delay launches while figuring it out.

## What we built

An API-first Sybil detection platform. Submit 10K-1M wallet addresses → get scored, clustered, evidence-backed analysis within hours.

Six detection methods combined:
1. Funding-source clustering (shared funder within tight time window)
2. Behavioral clustering (HDBSCAN on tx-pattern features)
3. Graph community detection (Leiden algorithm on tx graph)
4. Cross-chain identity linking (bridge correlation)
5. Temporal anomaly detection (entropy, autocorrelation)
6. ML ensemble scoring (LightGBM, tier-weighted training)

Output for every flagged address:
- Sybil score 0-100
- Cluster ID (which other wallets it groups with)
- **Evidence array** ("funded by 0xABC which funded 46 others within 1.0h", "pattern matches cluster B-17 with 94% similarity")
- Confidence

## Why this matters as public goods

The single biggest blocker to better airdrops is the **lack of an open, evidence-based detection methodology**. Today every project re-invents this from scratch, or pays Nansen, or buys Trusta (black box). We're open-sourcing:

- The clustering algorithms
- The feature extraction
- The audit log format
- The appeal flow specification

The hosted version is paid; the protocol is free. Same model as Sentry, Posthog, Supabase.

## Current status (production-ready code, pre-revenue)

- 63 automated tests passing in Docker (47 ML + 16 API + 4 real-DB integration)
- Working API: register → analyse → score → query → appeal flow
- Public appeal endpoint with 48h policy and immutable audit log
- Baseline model trained: AUC=1.0 on holdout (synthetic seed; real corpus is the grant-funded next step)
- Open-source MIT license

GitHub: https://github.com/[your-handle]/sybilshield
Live demo: https://sybilshield.vercel.app (when deployed)

## What we need

Grant funding to:
1. Scale the labeled dataset (10x current corpus)
2. Train a calibrated production model
3. Run public retro-analyses on Arbitrum/Linea/LayerZero airdrops (peer review the methodology)
4. Cover infra costs for the public free-tier (single-address scoring API for any project to test)

## Why now

- Sybil detection became mandatory in 2024-2026 (>90% of major airdrops filter)
- AI-driven farming bots make naive heuristics obsolete - need ML
- Tooling gap: Trusta is Ethereum-only with 100K monthly call limit; Nansen costs $150K/campaign
- Upcoming pipeline: Polymarket, Monad, MegaETH, MetaMask token - each will need this

## Contact

- GitHub: [...]
- Email: [...]
- Telegram: [...]
