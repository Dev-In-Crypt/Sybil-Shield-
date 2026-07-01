# SybilShield — feature status

**Source of truth:** `apps/web/lib/feature-status.ts`. Public mirror at <https://sybilshield.org/status>.

**Last synced:** 2026-06-01 (decision-ready API + cluster_only mode + 4 presets calibrated against 600 real wallets; CSV-upload form on /dashboard/new; feedback loop wired; free-tier enforcement live; OG image + auto-deploy + Discord pings active)

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
| `/dashboard/billing` | ✅ Live (usage view — no billing) |
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

## Access & accounts

SybilShield is a free public good — no billing, no plans. Payment code (Stripe/Atlos)
remains in the repo but dormant (disabled when env unset).

| Capability | Status |
|---|---|
| Free public sandbox (100 calls/mo, fair use) | ✅ Live |
| Billing / paid plans | ❌ None (free public good) |
| API key rotation | ✅ Live |
| Webhook subscriptions | ✅ Live |
| Usage tracking | ✅ Live |

---

## Roadmap milestones

### Now (active work)

- **Pilot calibration on real labelled corpus** — pre-pilot retro on 600 wallets is done (100% recall, 0% FP after threshold tune). Next: a real airdrop team's post-hoc verified list to validate against external data.
- **Exchange-wallet entity table** — proper fix for the funding-clusterer FP that we worked around in the preset-calibration retro. Excludes known-CEX hot wallets from the funding clusterer.
- **Per-customer preset overrides** — pilots will get `cluster_size_gte` + `score_gte` overrides in their analysis config. Manual `psql UPDATE` today.
- **Wild-traffic drift cron** — weekly PSI check on prod feature distribution vs training set. Manual today; auto-retrain on alert is in Later.
- **Off-site B2 backup activation** — `rclone` + Backblaze B2; env placeholders ready, awaiting B2 application key. Local pg_dump rotation works today.
- **Gitcoin Passport G1 integration** — strongest "verified human" signal. Per-address API needs caching layer. Bumps genuine pool ~1,700 → ~50,000.

### Next (blocked / queued)

- **Resend email** — account confirmations + analysis-complete notifications + monthly usage. Needs Resend account + DNS records.
- **TypeScript + Python SDK** — auto-generate from OpenAPI. Removes raw-curl friction for developer customers.
- **Multi-chain Alchemy: enable BSC + Avalanche + Linea** — code path exists, just need to enable in provider config + add to chains array.

### Later (after entity / first enterprise customer)

- **Auto-retrain on drift alert** — PSI > 0.25 → retrain pipeline + ship new model with audit-log entry.
- **Cluster network visualization** — interactive D3/Sigma graph in analysis detail page.
- **Self-hosted Erigon/Reth node** — when Alchemy CU bill justifies ops cost.
- **SOC 2 Type I + pentest** — after first enterprise customer asks.
- **Galxe / Gitcoin Passport credential** — score-as-credential embedded in airdrop campaign platforms.

### Recently shipped (since the last STATUS sync — was 2026-05-25)

- **Decision-ready API** (preset + mode params, decision/decision_confidence/rationale_codes per row, drop/review/keep counts)
- **Cluster-only mode** (`POST /v1/analyses` with `mode: "cluster_only"` + new ML `/cluster-only` endpoint)
- **Four named presets** (airdrop / dao / grant / balanced) — calibrated against 600 real wallets, blog post at /blog/preset-calibration
- **CSV-upload form on `/dashboard/new`** — replaces the roadmap-stub, parses .csv/.txt client-side, dedupes addresses, picks preset + mode
- **Live progress card + auto-refresh on analysis detail** — replaces static "Loading…", polls every 2s, stages shown
- **Customer feedback loop** — thumbs-up / false-positive / false-negative buttons → `feedback` table + audit-log
- **Free-tier enforcement** (5 caps: addresses per analysis, concurrent, file size, CU budget, polling-free reads)
- **Auto-deploy from main → Hetzner** with Discord pings on deploy + monitor probes + worker exceptions
- **OG image** as real PNG via next/og (Twitter/Discord cards now actually render)
- **3 blog posts published**: linea-retro, v05-real-corpus, preset-calibration
- **Public score lookup unauth** (`GET /v1/score/:address`) matching Trust page promise
- **Legal pages** (`/privacy`, `/terms`, `/cookies`) live
