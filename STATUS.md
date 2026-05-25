# SybilShield — feature status

**Source of truth:** `apps/web/lib/feature-status.ts`. Public mirror at <https://sybilshield.org/status>.

**Last synced:** 2026-05-25 (ML v0.5.0-gov-expanded on 1000+125 corpus; governance-voters G2 source live; backup+monitor cron on Hetzner; deploy automation queued)

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
| `GET /v1/score/:address` | ✅ Live (public, no auth — read-only cached lookup) |
| `POST /v1/score/batch` | 🔵 Sandbox |
| `GET /v1/entities/:address` | ✅ Live |
| `POST /v1/feedback` | ✅ Live |
| `POST /v1/appeals` | ✅ Live |
| `GET /v1/audit-log?analysis_id=…` | ✅ Live (tenant-scoped, JSON + CSV) |

Sandbox-status endpoints work end-to-end on Alchemy data; LightGBM model is
trained on a real-Alchemy 545-sample corpus (incl. adversarial), but
production calibration on wild-traffic feedback is the next milestone.

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
| ENS veterans (G2) | 🟡 Beta — frozen at 200 (hosted ENS subgraph deprecated mid-2024) |
| Protocol power users (G2) | 🟡 Beta — 92 entries from old derive seed |
| Governance voters (G2) | ✅ Live — 1500 from Uniswap+Compound+ENS via publicnode RPC |
| Snapshot voters (G2) | 🗓️ Roadmap — deriver written but Snapshot GraphQL unreachable from prod |
| Gitcoin Passport (G1) | 🗓️ Roadmap — needs per-address API key |
| LayerZero amnesty list (T1) | ✅ Live (1974 addresses) |
| Hop Protocol investigations (T2) | ✅ Live (496 addresses) |
| Arbitrum Foundation list (T4) | ✅ Live (5000 addresses) |
| Linea filtered list (T4) | ✅ Live (8000 addresses) |

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
| `/privacy` | ✅ Live (sandbox version) |
| `/terms` | ✅ Live (sandbox version) |
| `/cookies` | ✅ Live |
| `/trust`, `/sub-processors`, `/changelog`, `/status` | ✅ Live |
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

- Hardening the v0.5.0 model: wild-traffic feedback loop, drift cron, real precision/recall once an external holdout exists
- Activate off-site B2 sync on existing backup script (env file already in place, just needs B2 application key + `rclone config`)
- Wire deploy.yml secrets so pushes auto-deploy to Hetzner (DEPLOY_SSH_*, DEPLOY_DISCORD_WEBHOOK)
- Gitcoin Passport G1 integration for true ground-truth genuine signal

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
