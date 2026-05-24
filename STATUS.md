# SybilShield — feature status

Single source of truth for what's live, what's in beta, what's planned.
The frontend imports this status from `apps/web/lib/feature-status.ts` and
renders badges accordingly. Update both when shipping a feature.

Last updated: 2026-05-24

## Legend

- ✅ **available** — production-ready, fully functional
- 🟡 **beta** — works but uses synthetic data, no SLA, free
- 🔵 **sandbox** — works locally / on free-tier infra, no real on-chain data yet
- ⏳ **coming-soon** — built but gated behind funding / LLC / etc.
- 🗓️ **roadmap** — designed, not yet built

## Core API

| Feature | Status | Notes |
|---|---|---|
| `POST /v1/account/register` | ✅ available | |
| `POST /v1/analyses` | 🔵 sandbox | Runs against synthetic on-chain data via MockProvider. Real Alchemy ingest ships after first grant. |
| `GET /v1/analyses/:id/results` | ✅ available | |
| `GET /v1/analyses/:id/results/export` | ✅ available | CSV export |
| `GET /v1/analyses/:id/clusters` | ✅ available | |
| `GET /v1/score/:address` | 🔵 sandbox | Returns cached scores from prior analyses; one-shot scoring needs real ingest |
| `POST /v1/score/batch` | 🔵 sandbox | Same caveat |
| `GET /v1/entities/:address` | ✅ available | |
| `POST /v1/feedback` | ✅ available | |
| `POST /v1/appeals` | ✅ available | Public, no auth. 48h response policy. |
| `GET /v1/appeals/policy` | ✅ available | |

## Detection methods

| Method | Status |
|---|---|
| Funding-source clustering | ✅ available |
| Behavioral clustering (HDBSCAN) | ✅ available |
| Graph community detection (Leiden) | ✅ available |
| Cross-chain identity linking | 🟡 beta — works for 8 chains, bridge contracts seed list small |
| Temporal anomaly features | ✅ available |
| ML ensemble scoring (LightGBM) | 🟡 beta — baseline model trained on synthetic seed; calibration needs real corpus |

## Data sources

| Source | Status |
|---|---|
| ENS subgraph (G2) | ✅ live — 100 real veterans curated |
| Power users (G2) | ✅ live — 48 real addresses |
| Gitcoin Passport (G1) | 🗓️ roadmap — requires per-address API integration |
| LayerZero amnesty (T1) | ⏳ coming-soon — placeholder synthetic; replace with real CSV when sourced |
| Hop investigations (T2) | ⏳ coming-soon — same |
| Arbitrum Foundation (T4) | ⏳ coming-soon — same |
| Linea filtered (T4) | ⏳ coming-soon — same |

## On-chain providers

| Provider | Status |
|---|---|
| MockProvider (synthetic) | ✅ available — default |
| AlchemyProvider | 🟡 beta — code written, needs paid `ALCHEMY_API_KEY` |
| Self-hosted Erigon/Reth node | 🗓️ roadmap — needs infra budget |
| PublicNode RPC (for derive scripts) | ✅ available |

## Pipeline stages

| Stage | Status |
|---|---|
| Ingest | 🔵 sandbox (MockProvider) / 🟡 beta (Alchemy) |
| Feature extraction | ✅ available |
| Clustering | ✅ available |
| ML scoring | 🟡 beta |
| Evidence generation | ✅ available |
| Audit log | ✅ available |
| Webhook delivery | ✅ available |

## Adversarial / drift / retrain

| | Status |
|---|---|
| Adversarial test set | ✅ available |
| PSI drift detection job | ✅ available |
| Monthly retrain orchestrator | ✅ available |
| Automatic retrain on drift alert | 🗓️ roadmap — manual trigger now |
| Customer feedback loop into retraining | 🟡 beta — endpoint live, retraining pipeline reads feedback in next iteration |

## Frontend

| Page | Status |
|---|---|
| `/` landing | ✅ available |
| `/docs` | ✅ available |
| `/dashboard` overview | ✅ available |
| `/dashboard/analyses` list | ✅ available |
| `/dashboard/analyses/[id]` detail | ✅ available |
| `/dashboard/api-keys` | ✅ available |
| `/dashboard/new` | 🟡 beta — placeholder with API-as-curl |
| `/dashboard/billing` | ✅ available — usage chart + tiers (crypto checkout pending) |
| `/dashboard/settings` | 🗓️ roadmap |
| `/dashboard/analyses/:id` | ✅ available — full evidence detail |
| `/pricing` | ✅ available |
| `/roadmap` | ✅ available |
| `/methodology` | ✅ available |
| `/about` | 🟡 beta — placeholder team info |
| `/security` | ✅ available |
| `/appeal` | ✅ available |
| `/blog` | 🟡 beta — scaffold + 1 retro post |
| Cluster network visualisation | 🗓️ roadmap |

## Billing & accounts

| Feature | Status |
|---|---|
| Free tier (100 calls/mo) | ✅ available |
| Developer plan ($499/mo) | ⏳ coming-soon — crypto checkout via NowPayments after LLC OR after first grant |
| Growth plan ($1,499/mo) | ⏳ coming-soon |
| Enterprise plan | ⏳ coming-soon — requires LLC + custom contract |
| Per-analysis pricing | ⏳ coming-soon |
| Stripe card payments | 🗓️ roadmap — requires LLC |
| Crypto checkout (NowPayments) | 🗓️ roadmap — next infra task |
| API key rotation | ✅ available |
| Webhook subscriptions | ✅ available — HMAC-SHA256 signed |
| Usage tracking | ✅ available |

## Infrastructure

| | Status |
|---|---|
| Docker compose full stack | ✅ available |
| Drizzle migrations | ✅ available |
| CI on GitHub Actions | ✅ available |
| Free-tier deployment (Railway+Vercel+Supabase) | 🗓️ roadmap — config to be added |
| Production deployment guide | 🗓️ roadmap — after first grant lands |
| Self-hosted node | 🗓️ roadmap |

## Roadmap milestones

### Now (already shipped — public beta)
- Working API + dashboard with sandbox data
- 63 automated tests, full e2e flow verified
- Public appeal endpoint + audit log
- Open-source clustering algorithms (MIT)

### Next (Q3 2026 — depends on first grant or self-funding)
- Real Alchemy integration + production model
- NowPayments crypto checkout
- Free single-address scoring API (public good)
- Public retro-analysis posts (Linea, LayerZero - aggregate only)

### Later (Q4 2026 — depends on LLC + revenue)
- Card payments via Stripe
- Enterprise contracts with SLA
- Self-hosted node deployment
- Cluster network visualisation
- Custom-model training for enterprise customers
