# SybilShield — feature status

**Source of truth:** `apps/web/lib/feature-status.ts`. Public mirror at <https://sybilshield.org/status>.

**Last synced:** 2026-05-25

## Legend

| Symbol | Label | Meaning |
|---|---|---|
| ✅ | Live | Available in production, fully working |
| 🟡 | Beta | Working but rough edges / limited surface |
| 🔵 | Sandbox | Live in the public sandbox; not production-calibrated |
| ⏳ | Coming soon | Decided + scheduled, not built |
| 🗓️ | Roadmap | Future, no committed date |

---

## Core API

| Endpoint | Status |
|---|---|
| `POST /v1/account/register` | ✅ Live |
| `POST /v1/analyses` | 🔵 Sandbox |
| `GET /v1/analyses/:id/results` | ✅ Live |
| `GET /v1/analyses/:id/results/export` | ✅ Live |
| `GET /v1/analyses/:id/clusters` | ✅ Live |
| `GET /v1/score/:address` | 🔵 Sandbox |
| `POST /v1/score/batch` | 🔵 Sandbox |
| `GET /v1/entities/:address` | ✅ Live |
| `POST /v1/feedback` | ✅ Live |
| `POST /v1/appeals` | ✅ Live |

Sandbox-status endpoints work end-to-end; the underlying model is in-the-loop training, not a calibrated v1.

## Detection methods

| Method | Status |
|---|---|
| Funding-source clustering | ✅ Live |
| Behavioral clustering (HDBSCAN) | ✅ Live |
| Graph community detection (Leiden) | ✅ Live |
| Cross-chain identity linking | 🟡 Beta |
| Temporal anomaly features | ✅ Live |
| ML ensemble scoring (LightGBM) | 🔵 Sandbox |

## Data sources

| Source | Status |
|---|---|
| ENS veterans (G2) | ✅ Live (real ENS subgraph) |
| Protocol power users (G2) | ✅ Live |
| Gitcoin Passport (G1) | 🗓️ Roadmap |
| LayerZero amnesty list (T1) | ⏳ Coming soon |
| Hop Protocol investigations (T2) | ⏳ Coming soon |
| Arbitrum Foundation list (T4) | ⏳ Coming soon |
| Linea filtered list (T4) | ⏳ Coming soon |

## On-chain providers

| Provider | Status |
|---|---|
| MockProvider (synthetic) | ✅ Live |
| AlchemyProvider (real) | ✅ Live (Ethereum, Arbitrum, Optimism, Base, Polygon enabled) |
| Self-hosted Erigon node | 🗓️ Roadmap |

## Pipeline stages

| Stage | Status |
|---|---|
| Ingest | 🔵 Sandbox |
| Feature extraction | ✅ Live |
| Clustering | ✅ Live |
| ML scoring | 🔵 Sandbox |
| Evidence generation | ✅ Live |
| Audit log writes | ✅ Live |
| Webhook delivery (HMAC-SHA256) | ✅ Live |

## Adversarial / drift

| Capability | Status |
|---|---|
| Adversarial test set | ✅ Live |
| PSI drift detection | ✅ Live |
| Retrain orchestrator | ✅ Live |
| Auto-retrain on drift alert | 🗓️ Roadmap |
| Feedback-driven label promotion | 🟡 Beta |

## Frontend pages

| Page | Status |
|---|---|
| `/` (Landing) | ✅ Live |
| `/docs` | ✅ Live |
| `/dashboard` | ✅ Live |
| `/dashboard/analyses` | ✅ Live |
| `/dashboard/analyses/[id]` | ✅ Live |
| `/dashboard/api-keys` | ✅ Live |
| `/dashboard/new` | 🗓️ Roadmap (CSV upload UI) |
| `/dashboard/billing` | 🟡 Beta |
| `/dashboard/settings` | 🗓️ Roadmap |
| `/pricing` | ✅ Live |
| `/roadmap` | ✅ Live |
| `/methodology` | ✅ Live |
| `/about` | ✅ Live |
| `/security` | ✅ Live |
| `/appeal` | ✅ Live |
| `/blog` | ✅ Live (1 published post; 3 drafts visible) |
| Cluster network visualisation | 🗓️ Roadmap |

## Billing & accounts

| Capability | Status |
|---|---|
| Free Sandbox (100 calls/mo) | ✅ Live |
| Developer plan ($499/mo) | ⏳ Coming soon |
| Growth plan ($1,499/mo) | ⏳ Coming soon |
| Enterprise plan | ⏳ Coming soon |
| Per-analysis pricing | ⏳ Coming soon (manual pilot today via support@) |
| Stripe card payments | 🗓️ Roadmap (post-incorporation) |
| Crypto checkout (Atlos) | 🟡 Beta (works in code; one pilot flow uses it) |
| API key rotation | ✅ Live |
| Webhook subscriptions | ✅ Live |
| Usage tracking | ✅ Live |

---

## Roadmap milestones

### Now

- ML model calibration on real labeled corpus (LayerZero amnesty + Hop investigations as T1/T2)
- Off-site Postgres backup (Backblaze B2)
- First published retro: Linea airdrop methodology

### Next

- CSV-upload UI for analyses creation
- Resend email integration (team invites + analysis-complete notifications)
- Multi-chain Alchemy: enable BSC + Avalanche + Linea (Growth tier)
- Stripe products + production billing once Delaware C-corp is incorporated

### Later

- Self-hosted Erigon/Reth node (when Alchemy CU stops being enough)
- SOC 2 Type I (after first enterprise customer asks)
- Pentest (after SOC 2 Type I)
- Cluster network visualization (D3/Sigma)
- TypeScript + Python SDK packages on npm/PyPI
- Auto-retrain cron triggered by drift alerts
