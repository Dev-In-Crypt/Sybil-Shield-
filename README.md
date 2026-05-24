# SybilShield

> The open-source trust layer for token distributions.
> Evidence-based Sybil detection. MIT licensed.

[![CI](https://github.com/USER/sybilshield/actions/workflows/ci.yml/badge.svg)](https://github.com/USER/sybilshield/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-c0ff00.svg)](LICENSE)
[![Public beta](https://img.shields.io/badge/status-public%20beta-c0ff00)](STATUS.md)
[![Tests](https://img.shields.io/badge/tests-63%20passing-c0ff00)](docker-compose.test.yml)

---

## What this is

Airdrops lose 20–40% of value to industrial Sybil farming. Every project either overspends on detection consulting ($150K+) or underspends and ships broken filters.

**SybilShield is the open-source detection engine.** Submit wallet addresses, get back evidence-backed scores in hours. Six independent detection methods. Open methodology. Public appeal flow. Immutable audit log.

See [project description](SybilShield_Project_Description.md) for context. See [technical spec](SybilShield_Technical_Spec.md) for design rationale.

## Detection methods

| | |
|---|---|
| Funding-source clustering | Wallets funded by the same source within tight time windows |
| Behavioral clustering (HDBSCAN) | Tx-pattern density clustering at scale |
| Graph community detection (Leiden) | Dense isolated transaction subgraphs |
| Temporal anomaly | Hour entropy, inter-tx autocorrelation, dormant-burst |
| Cross-chain identity linking | Bridge events deterministically link wallets across 8 chains |
| ML ensemble (LightGBM) | Tier-weighted training, honest holdout-only metrics |

Source: `apps/ml/sybilshield/clustering/` and `apps/ml/sybilshield/features/`.

## Quick start (Docker, one command)

```bash
git clone https://github.com/USER/sybilshield.git
cd sybilshield
docker compose up -d --build
# wait ~30s for migrations

# Try it
curl -X POST http://localhost:3001/v1/account/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}'
```

Services that come up:

| Service | Port | What |
|---|---|---|
| postgres | 5432 | DB (migrations auto-applied) |
| redis | 6379 | BullMQ queue |
| ml | 8001 | Python pipeline (FastAPI) |
| api | 3001 | Fastify gateway |
| worker | — | Drains analyses queue |

## Tests

```bash
docker compose -f docker-compose.test.yml up --build
```

**47 ML tests + 16 API tests = 63 green** (including 4 real-DB integration).

## Preview the website

Static HTML previews of all marketing & dashboard pages:

```bash
docker run --rm -d --name sybilshield-preview -p 8080:80 \
  -v "$PWD/previews:/usr/share/nginx/html:ro" nginx:alpine
open http://localhost:8080
```

16 pages: landing, pricing, methodology, docs, roadmap, status, about, security, appeal, blog, dashboard + 5 dashboard subpages.

## Project layout

```
apps/
  api/                     Fastify API + workers (TypeScript)
  ml/                      Python pipeline (FastAPI service + CLI scripts)
  web/                     Next.js production frontend
previews/                  Static HTML mockups (Genesis design system)
grants/                    Grant application materials
content/blog/              Blog post drafts
docker-compose.yml         Full stack for local dev
docker-compose.test.yml    Test runner
```

## Open methodology

Every detection rule is documented in [`previews/methodology.html`](previews/methodology.html). Source code under [`apps/ml/`](apps/ml/). Reproducible from the published artifact + manifest hashes.

We use a tiered confidence system for labels:

| Tier | Confidence | Source |
|---|---|---|
| T1 | 0.98 | Confessed (LayerZero amnesty) |
| T2 | 0.95 | Manually verified |
| T4 | 0.65 | Single detector (Arbitrum/Linea raw) |
| G1 | 0.95 | Verified human (Gitcoin Passport) |
| G2 | 0.80 | Likely human (ENS pre-2021 + activity) |

Holdout uses T1+T2+G1 only — honest evaluation, no agreement-with-other-detectors inflation.

## Status

| | |
|---|---|
| Code | Public beta — 63 tests green |
| Hosted service | Pre-production (sandbox only) |
| Real on-chain data | Pending Alchemy/grant |
| Production model | Baseline trained, calibration pending |
| Legal entity | Pre-incorporation |

Full [STATUS.md](STATUS.md).

## Roadmap

[STATUS.md](STATUS.md) tracks feature flags. The product roadmap lives at [previews/roadmap.html](previews/roadmap.html).

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security disclosures: [SECURITY.md](SECURITY.md).

## License

MIT. See [LICENSE](LICENSE).

---

## What this is NOT

- Not a KYC service — that's Worldcoin/Civic/Holonym's lane.
- Not a token — there is no $SHIELD. Anyone selling one is scamming.
- Not a black box — every flag traces back to specific evidence.

## Contact

- Email: hello@sybilshield.com
- Security: security@sybilshield.com
- Appeals: appeals@sybilshield.com

## Layout

```
apps/
  api/    Fastify + Drizzle + BullMQ (TypeScript)
  ml/     Python ML pipeline (FastAPI service + worker logic)
  web/    Next.js 14 dashboard
packages/
  shared/ Shared TS types
```

## Quick start (one command full stack)

```bash
docker compose up -d --build
# wait ~30s for migrate to finish

curl http://localhost:3001/health
curl http://localhost:8001/health

# Register and try an analysis
KEY=$(curl -s -X POST http://localhost:3001/v1/account/register \
  -H 'content-type: application/json' \
  -d '{"email":"you@example.com"}' | python -c "import sys,json;print(json.load(sys.stdin)['api_key'])")

ADDRS=$(python -c "import json;print(json.dumps(['0x'+format(i,'040x') for i in range(1,21)]))")
curl -X POST http://localhost:3001/v1/analyses \
  -H "Authorization: Bearer $KEY" -H 'content-type: application/json' \
  -d "{\"name\":\"hello\",\"chains\":[\"ethereum\"],\"addresses\":$ADDRS}"
```

Services that come up:

| Service | Port | Purpose |
|---|---|---|
| postgres | 5432 | Primary DB (migrations auto-applied) |
| redis | 6379 | BullMQ queue |
| ml | 8001 | Python pipeline (FastAPI) |
| api | 3001 | Fastify gateway |
| worker | — | Drains the analyses queue |

Set `USE_MOCK_PROVIDERS=true` (default in dev) to use the synthetic on-chain provider. Real Alchemy ingestion needs `ALCHEMY_API_KEY` and `USE_MOCK_PROVIDERS=false`.

Frontend (Next.js) is separate — run `cd apps/web && npm install && npm run dev` to get the dashboard at `http://localhost:3000`.

## Tests

Recommended path — Docker (handles hdbscan/leidenalg C extensions automatically):

```bash
docker compose -f docker-compose.test.yml up --build --abort-on-container-exit
```

Both suites must exit 0. Current state: **47 ML tests + 16 API tests = 63 green** (including 4 real-DB integration tests).

Native, if you have the build toolchain:

```bash
cd apps/api && npm install && npm test
cd apps/ml  && pip install -e ".[dev]" && pytest -q
```

## Scheduled jobs

```cron
# Weekly drift check (Sundays 00:00 UTC) - alerts only, no retrain
0 0 * * 0  cd /app/apps/ml && python -m sybilshield.eval.drift_check_job

# Monthly retrain (1st of month 02:00 UTC) - decides + acts
0 2 1 * *  cd /app/apps/ml && python -m sybilshield.scoring.retrain

# Triggered retrain (manual or via CI on drift alert)
docker compose exec ml python -m sybilshield.scoring.retrain --dry-run
```

## Deriving G1/G2 labels

The honest evaluation set needs verified-genuine addresses. Two scripts produce
them from free public sources (no API keys):

```bash
# G1 - ENS owners pre-2021-06-01 with >=50 txs
docker compose exec ml python -m sybilshield.data.derive_ens_veterans --limit 5000

# G2 - power users (>=2yr active, >=10 contracts across >=2 of {defi,nft,governance})
# Seeds from G1 to keep precision high
docker compose exec ml python -m sybilshield.data.derive_power_users --limit 3000

# Then curate
docker compose exec ml python -m sybilshield.data.curate
docker compose exec ml python -m sybilshield.data.holdout
```

Both scripts are checkpoint-resumable: rerun on failure picks up where it left off.

## Honest metrics

This repo is opinionated about evaluation: precision/recall are measured on **T1+T2+G1** held-out data only (confessed sybil farmers + manually verified + verified-genuine identities). Other detectors' outputs (Arbitrum/Linea filter lists) train the model with reduced sample weight but do **not** set the evaluation bar.

| Metric | MVP target | Year-1 target |
|---|---|---|
| Precision @ score 70 | ≥0.85 | ≥0.92 |
| Recall @ score 70 | ≥0.75 | ≥0.85 |
| FPR on G1 verified-genuine | ≤5% | ≤3% |
| Adversarial recall | ≥60% | ≥80% |

## Appeals

Customers may publish their own filter results using SybilShield scores. Per the Risks section in the project description, customers **must** include disclaimers and provide an appeal address. Internal appeals: `appeals@sybilshield.com` (48hr response policy).

## Frontend pages

Full marketing + dashboard site at `apps/web/`. Run with `cd apps/web && npm install && npm run dev` then open http://localhost:3000.

Pages shipped:

| Route | Purpose |
|---|---|
| `/` | Landing — hero, problem, six methods, evidence demo, comparison table, pricing teaser, FAQ |
| `/pricing` | Full pricing: 4 subscription tiers + 3 per-analysis tiers, payment-method cards, FAQ |
| `/roadmap` | Now / Next / Later view with status badges |
| `/status` | Per-feature status flags (single source of truth) |
| `/methodology` | All 6 detection methods documented with source file references |
| `/docs` | curl examples for every API endpoint |
| `/about` | Mission, team placeholders, legal posture |
| `/security` | Data classification, key handling, webhook verification, vulnerability reporting |
| `/appeal` | Public form for disputing a Sybil score |
| `/blog` | Scaffolded post list (drafts marked coming-soon) |
| `/dashboard` | Onboarding flow → overview cards + recent analyses |
| `/dashboard/analyses` | Full analyses table |
| `/dashboard/analyses/[id]` | Summary cards + scored-address table + evidence drawer + CSV export |
| `/dashboard/api-keys` | Rotate keys + manage webhook URL + secret |
| `/dashboard/new` | Roadmap placeholder with API-as-curl instructions |
| `/dashboard/billing` | Live usage + tier comparison + crypto-checkout coming-soon notice |
| `/dashboard/settings` | Roadmap placeholder |

Feature flags live at `apps/web/lib/feature-status.ts` and rendered as badges throughout. Update both that file and `STATUS.md` when shipping a feature.

A sandbox banner appears on every page making clear we're running synthetic on-chain data until the first grant or paid analysis lands. Honest > shiny.

## Bootstrap model

A baseline model has been trained end-to-end on a mixed corpus:

| Source | Tier | Type | Rows |
|---|---|---|---|
| ens-veterans | G2 | Real (ENS subgraph + PublicNode RPC) | 100 |
| protocol-power-users | G2 | Real (filtered G1 with high tx + reverse ENS) | 48 |
| layerzero-amnesty | T1 | **Synthetic placeholder** | 50 |
| hop-protocol-sybil | T2 | **Synthetic placeholder** | 50 |
| arbitrum-foundation-sybil | T4 | **Synthetic placeholder** | 100 |
| linea-filtered | T4 | **Synthetic placeholder** | 160 |
| **Curated total** | | | **460** |
| Holdout (T1/T2 sybil + G2 genuine) | | | 30 + 30 |
| Train | | | 400 |

Model `current.pkl`:
- ROC-AUC = **1.000** on holdout (perfect separation under the synthetic seed)
- Probability outputs need calibration on a larger corpus before the 0.7 threshold is meaningful
- Feature schema hash pinned; artifact loads with schema validation

**Real sybil-list CSVs** are placeholder synthetic data (`apps/ml/sybilshield/data/seed_sybil.py`). To make precision/recall claims honestly, replace them with downloaded LayerZero amnesty / Hop investigations / Arbitrum / Linea lists before re-running `curate -> holdout -> build_features -> retrain`.

## What's left for production

This codebase is a fully integrated MVP — all tests green, full stack runs end-to-end with mock data. Before launching to paying customers you still need:

### Data & model (real corpus — need network and/or manual download)

A bootstrap pipeline has already run with 100 real ENS-veteran addresses + synthetic sybil seed. To upgrade to real labels:

1. **Scale derive scripts** for a serious G1/G2 corpus:
   ```bash
   docker compose exec ml python -m sybilshield.data.derive_ens_veterans --limit 10000  # ~3-6h on free RPC
   docker compose exec ml python -m sybilshield.data.derive_power_users --limit 5000    # ~2-4h
   ```
2. **Manually download the T1/T2/T4 sybil source CSVs** (the URLs in `manifest.yaml` were placeholders — actual current locations may be in airdrop project blogs, Dune dashboards, or GitHub forks). Drop them into `apps/ml/sybilshield/data/labeled/raw/` matching the manifest source IDs (e.g. `layerzero-amnesty.csv`). Replace the synthetic placeholders generated by `seed_sybil.py`.
3. **Re-train**:
   ```bash
   docker compose exec ml python -m sybilshield.data.curate
   docker compose exec ml python -m sybilshield.data.holdout
   docker compose exec ml python -m sybilshield.data.build_features  # uses MockProvider; switch to AlchemyProvider for real features
   docker compose exec ml python -m sybilshield.scoring.retrain --model-dir /app/apps/ml/sybilshield/data/models --train /app/apps/ml/sybilshield/data/labeled/train_with_features.parquet --holdout /app/apps/ml/sybilshield/data/labeled/holdout_with_features.parquet
   ```
   Then set `ML_MODEL_PATH=/app/apps/ml/sybilshield/data/models/current.pkl` for the ML service.

### Infra (need ops decisions)

4. **Alchemy account at Scale tier** ($199/mo) — set `ALCHEMY_API_KEY` and `USE_MOCK_PROVIDERS=false`. For analyses >100K addresses, provision a self-hosted Erigon/Reth node and point `SELF_HOSTED_NODE_URL` at it.
5. **Stripe account** — create the three Price IDs for developer/growth/enterprise plans, set them in env (`STRIPE_PRICE_DEVELOPER`, etc.), set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
6. **Hosting**: API + worker → Railway or Fly.io. ML service → Railway with at least 2GB RAM for HDBSCAN. Frontend → Vercel. Postgres → Supabase or Neon. Redis → Upstash.
7. **Domain + TLS + appeals@ inbox** — required by the legal policy in the project description.
8. **Defamation insurance** (~$2K-5K/yr) — non-optional for the public-retro GTM strategy.

### Polish (nice-to-haves)

9. Playwright E2E covering the dashboard flow (signup → upload CSV → see results → export). Repository has a sample CSV-to-analysis curl flow that proves the backend; UI E2E left as follow-up.
10. Cluster visualisation in the analyses detail page (currently table-only).
11. Real Etherscan/Dune integration for contract labels — currently `contract_labels` is empty when not passed, which degrades behavioral feature richness.
12. Replace the inline label map in `derive_power_users.py` with a live Etherscan label fetch (it currently uses ~20 hardcoded top contracts).

Everything else from the original 24-week plan in `SybilShield_Technical_Spec.md` is shipped.
