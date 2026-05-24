# SybilShield — Technical Specification & Implementation Plan for AI Coder

## Complete blueprint: from empty repo to production Sybil detection API

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js 14)                          │
│  Landing │ Dashboard │ Analysis Results │ API Docs │ Billing      │
└───────────────────────────┬──────────────────────────────────────┘
                            │ REST API
┌───────────────────────────▼──────────────────────────────────────┐
│                    API GATEWAY (Fastify)                           │
│  Auth (API Keys + JWT) │ Rate Limiter │ Request Validation        │
└──┬──────────┬───────────┬──────────┬──────────┬─────────────────┘
   │          │           │          │          │
┌──▼───┐  ┌───▼────┐  ┌───▼───┐  ┌──▼───┐  ┌───▼────┐
│Ingest│  │Analyze │  │Score  │  │Report│  │Billing │
│Engine│  │Engine  │  │Engine │  │Engine│  │Service │
└──┬───┘  └───┬────┘  └───┬───┘  └──┬───┘  └───┬────┘
   │          │           │         │           │
┌──▼──────────▼───────────▼─────────▼───────────▼─────────────────┐
│                   PostgreSQL (primary data)                       │
│  analyses │ addresses │ clusters │ features │ customers           │
└──────────────────────────┬──────────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│               Redis (job queues + caching)                        │
│  BullMQ queues │ Feature cache │ Rate limit state                │
└──┬──────────┬──────────┬──────────┬─────────────────────────────┘
   │          │          │          │
 Alchemy   Dune Sim   Etherscan  CoinGecko
 (txns)    (balances)  (labels)   (prices)
```

## Tech Stack

| Layer | Technology | Why |
|---|---|---|
| API Server | Fastify 5 | High throughput for batch scoring requests |
| Language | TypeScript + Python | TS for API/web, Python for ML pipeline |
| Database | PostgreSQL 16 | Relational data, JSONB for flexible features |
| Graph Store | Neo4j (or NetworkX in-memory) | Transaction graph analysis, community detection |
| Queue | BullMQ + Redis 7 | Job queue for async analysis pipelines |
| ML Framework | Python: scikit-learn, LightGBM, NetworkX | Proven ML stack for tabular + graph features |
| Frontend | Next.js 14 + Tailwind + shadcn/ui | Dashboard for results visualization |
| Auth | API keys (for API) + NextAuth (for dashboard) |
| Billing | Stripe | Per-analysis charges + subscriptions |
| On-chain Data | Alchemy (transactions), Dune Sim (balances), Etherscan (labels) |
| Deploy | Railway (API + workers) + Vercel (frontend) |
| CI/CD | GitHub Actions |

## Project Structure

```
sybilshield/
├── apps/
│   ├── api/                          # Fastify API server (TypeScript)
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   │   ├── analyses.ts       # CRUD for analysis jobs
│   │   │   │   ├── scoring.ts        # Single-address scoring endpoint
│   │   │   │   ├── clusters.ts       # Cluster lookup endpoints
│   │   │   │   └── billing.ts        # Stripe integration
│   │   │   ├── services/
│   │   │   │   ├── ingest.ts         # Fetch on-chain data for addresses
│   │   │   │   ├── features.ts       # Extract features from raw data
│   │   │   │   └── report.ts         # Generate evidence reports
│   │   │   ├── workers/
│   │   │   │   ├── ingest.worker.ts  # Data ingestion job processor
│   │   │   │   ├── analyze.worker.ts # Triggers Python ML pipeline
│   │   │   │   └── report.worker.ts  # Evidence report generation
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts           # API key validation
│   │   │   │   └── rate-limit.ts
│   │   │   ├── db/
│   │   │   │   ├── schema.ts         # Drizzle schema
│   │   │   │   └── index.ts
│   │   │   └── index.ts              # Server entry point
│   │   └── tests/
│   │
│   ├── ml/                           # Python ML pipeline
│   │   ├── sybilshield/
│   │   │   ├── pipeline.py           # Main orchestrator
│   │   │   ├── features/
│   │   │   │   ├── funding.py        # Funding source features
│   │   │   │   ├── temporal.py       # Timing pattern features
│   │   │   │   ├── behavioral.py     # Transaction behavior features
│   │   │   │   └── graph.py          # Graph structural features
│   │   │   ├── clustering/
│   │   │   │   ├── funding_cluster.py    # Cluster by funding source
│   │   │   │   ├── behavior_cluster.py   # Cluster by behavior similarity
│   │   │   │   └── graph_community.py    # Louvain community detection
│   │   │   ├── scoring/
│   │   │   │   ├── model.py          # LightGBM ensemble model
│   │   │   │   ├── train.py          # Model training script
│   │   │   │   └── predict.py        # Batch prediction
│   │   │   └── evidence/
│   │   │       └── generator.py      # Evidence report per address
│   │   ├── data/
│   │   │   ├── labeled/              # Labeled Sybil datasets
│   │   │   └── models/               # Trained model artifacts
│   │   ├── requirements.txt
│   │   └── tests/
│   │
│   └── web/                          # Next.js frontend
│       ├── app/
│       │   ├── (marketing)/          # Landing page, pricing
│       │   ├── (dashboard)/          # Customer dashboard
│       │   │   ├── analyses/         # Analysis list + results
│       │   │   ├── api-keys/         # Manage API keys
│       │   │   └── billing/          # Subscription management
│       │   └── docs/                 # API documentation
│       └── components/
│           ├── ui/                   # shadcn/ui
│           ├── charts/               # Cluster visualizations
│           └── results/              # Analysis result components
│
├── packages/
│   └── shared/                       # Shared types & constants
│
├── docker-compose.yml
└── turbo.json
```

---

## DATABASE SCHEMA

```sql
-- =============================================
-- CUSTOMERS & AUTH
-- =============================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  company TEXT,
  plan TEXT NOT NULL DEFAULT 'free',    -- free | developer | growth | enterprise
  stripe_customer_id TEXT,
  api_key_hash TEXT UNIQUE,             -- hashed API key
  api_calls_this_month INTEGER DEFAULT 0,
  api_calls_limit INTEGER DEFAULT 100,  -- free tier: 100 calls
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ANALYSES (batch analysis jobs)
-- =============================================
CREATE TABLE analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  name TEXT NOT NULL,                   -- "Mainnet Airdrop Q2 2026"
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | ingesting | analyzing | scoring | complete | failed
  
  -- Input
  chains TEXT[] NOT NULL,               -- ['ethereum', 'arbitrum', 'base']
  address_count INTEGER NOT NULL,
  addresses_file_url TEXT,              -- S3/R2 URL to uploaded CSV
  
  -- Configuration
  sensitivity TEXT DEFAULT 'balanced',  -- strict | balanced | lenient
  include_evidence BOOLEAN DEFAULT true,
  
  -- Results summary
  total_scored INTEGER,
  sybil_count INTEGER,                 -- score >= 70
  suspicious_count INTEGER,            -- score 40-69
  genuine_count INTEGER,               -- score < 40
  cluster_count INTEGER,
  largest_cluster_size INTEGER,
  
  -- Timing
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  processing_time_seconds INTEGER,
  
  -- Output
  results_file_url TEXT,               -- CSV with all scores
  report_url TEXT,                     -- Summary report PDF/HTML
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- ADDRESS SCORES (per-address results)
-- =============================================
CREATE TABLE address_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  
  -- Scores
  sybil_score INTEGER NOT NULL,        -- 0-100 (higher = more Sybil)
  confidence NUMERIC(4,3),             -- 0.000 to 1.000
  label TEXT NOT NULL,                 -- genuine | suspicious | sybil
  
  -- Cluster assignment
  cluster_id TEXT,                     -- null if not clustered
  cluster_size INTEGER,
  
  -- Feature values (for evidence)
  features JSONB NOT NULL,             -- {funding_source, tx_count, first_tx, ...}
  
  -- Evidence
  evidence JSONB,                      -- [{type, description, confidence}]
  
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scores_analysis ON address_scores(analysis_id);
CREATE INDEX idx_scores_address ON address_scores(address, chain);
CREATE INDEX idx_scores_cluster ON address_scores(cluster_id);
CREATE INDEX idx_scores_label ON address_scores(analysis_id, label);

-- =============================================
-- CLUSTERS (detected Sybil groups)
-- =============================================
CREATE TABLE clusters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  cluster_id TEXT NOT NULL,            -- "C-4872"
  
  -- Cluster properties
  size INTEGER NOT NULL,
  detection_method TEXT NOT NULL,      -- funding | behavior | graph | multi
  avg_sybil_score NUMERIC(5,2),
  
  -- Common properties
  common_funding_source TEXT,          -- shared funder address
  common_pattern TEXT,                 -- "bridge→swap→LP→withdraw"
  temporal_window TEXT,                -- "14:00-14:30 UTC, Mon/Wed/Fri"
  
  -- Evidence summary
  evidence_summary TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- KNOWN SYBIL ENTITIES (cross-analysis intelligence)
-- =============================================
CREATE TABLE known_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  
  -- Intelligence
  entity_label TEXT,                   -- "Cluster funding wallet" | "Known farmer"
  first_seen_analysis UUID REFERENCES analyses(id),
  times_flagged INTEGER DEFAULT 1,
  avg_score NUMERIC(5,2),
  
  -- Source
  source TEXT NOT NULL,                -- internal | public_dataset | community_report
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX idx_known_entity ON known_entities(address, chain);

-- =============================================
-- FEATURE STORE (cached per-address features)
-- =============================================
CREATE TABLE feature_store (
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  features JSONB NOT NULL,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (address, chain)
);

-- =============================================
-- MODEL VERSIONS (for reproducibility)
-- =============================================
CREATE TABLE model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT UNIQUE NOT NULL,             -- "v1.3.0-2026-05-15"
  model_artifact_url TEXT NOT NULL,         -- S3/R2 path to .lgb file
  feature_schema_hash TEXT NOT NULL,        -- SHA256 of feature list
  training_manifest_hash TEXT NOT NULL,     -- SHA256 of dataset manifest
  eval_metrics JSONB NOT NULL,              -- {precision, recall, auc, fpr, adversarial_recall}
  trained_at TIMESTAMPTZ NOT NULL,
  deployed_at TIMESTAMPTZ,
  retired_at TIMESTAMPTZ
);

-- =============================================
-- ANALYSIS RUNS (reproducibility: same analysis, multiple model versions)
-- =============================================
CREATE TABLE analysis_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  model_version_id UUID NOT NULL REFERENCES model_versions(id),
  is_primary BOOLEAN DEFAULT true,          -- the run shown to customer by default
  cu_consumed BIGINT,                       -- on-chain data API units used
  cost_usd NUMERIC(10,2),                   -- variable cost attribution
  pipeline_config JSONB,                    -- sensitivity, methods enabled, thresholds
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_runs_analysis ON analysis_runs(analysis_id);

-- Link scores to specific run/model
ALTER TABLE address_scores ADD COLUMN run_id UUID REFERENCES analysis_runs(id);

-- =============================================
-- EVIDENCE AUDIT LOG (appeal flow + legal defensibility)
-- =============================================
CREATE TABLE evidence_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES analyses(id),
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  event_type TEXT NOT NULL,                 -- flagged | appealed | reviewed | reversed | confirmed
  actor TEXT NOT NULL,                      -- system | customer:<id> | reviewer:<id>
  prior_score INTEGER,
  new_score INTEGER,
  reason TEXT,
  evidence_snapshot JSONB,                  -- frozen copy of evidence at time of event
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_address ON evidence_audit_log(address, chain);
CREATE INDEX idx_audit_analysis ON evidence_audit_log(analysis_id);

-- =============================================
-- CUSTOMER FEEDBACK (FP/FN reports)
-- =============================================
CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  analysis_id UUID REFERENCES analyses(id),
  address TEXT NOT NULL,
  chain TEXT NOT NULL,
  verdict TEXT NOT NULL,                    -- false_positive | false_negative | confirmed
  evidence TEXT,
  reviewed BOOLEAN DEFAULT false,
  promoted_to_label_tier TEXT,              -- T3 if promoted; null if rejected/pending
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## IMPLEMENTATION PLAN — STEP BY STEP

### PHASE 0: DATA FOUNDATION (Step 0)

#### Step 0: Labeled dataset curation and ground truth tiers

**Task:** Before any code, assemble the labeled dataset with explicit confidence tiers. The ML model's quality is upper-bounded by this work; it cannot be skipped or parallelized with implementation.

**Critical insight:** Most "public Sybil lists" (Arbitrum, Linea, LayerZero filter results) are labels produced by other detectors with known false-positive issues. Training on them = inheriting their errors. We must tier labels by ground-truth strength and weight accordingly during training.

**Label tiers:**

| Tier | Source | Confidence | Examples |
|---|---|---|---|
| T1 — Confessed | Self-reported by farmers under amnesty programs | ~0.98 | LayerZero amnesty (~100K addresses), Optimism self-reports |
| T2 — Manually verified | Hand-labeled by security researchers, court-documented cases | ~0.95 | Public farmer wallet exposés, on-chain investigators' published lists |
| T3 — High-quality detector | Multiple independent detectors agree | ~0.85 | Intersection of Trusta + Nansen + custom Dune queries |
| T4 — Single-detector | One detector's output | ~0.65 | Raw Arbitrum filter list, Linea filter list |
| T5 — Heuristic | Trivially-funded same-block clusters with ≥10 members | ~0.75 | Self-derived from on-chain data |
| G1 — Verified genuine | Addresses with verified human identity (Gitcoin Passport stamps, ENS+social, NFT mints from known artists pre-2022) | ~0.95 | Curated allowlist |
| G2 — Likely genuine | Long history (>2yr), diverse protocol usage, no flag from any detector | ~0.80 | Self-derived |

**Files to create:**
- `apps/ml/sybilshield/data/labeled/manifest.yaml` — declares each source, tier, license, retrieval method
- `apps/ml/sybilshield/data/curate.py` — fetches, deduplicates, conflict-resolves, outputs `labeled_addresses.parquet` with columns `[address, chain, label, tier, sources, confidence_weight]`
- `apps/ml/sybilshield/data/holdout.py` — defines a held-out **evaluation set** using ONLY T1+T2+G1 (the only ground truth strong enough to measure precision/recall against)

**Conflict resolution rules:**
- If T1/T2 says genuine and T4 says sybil → genuine wins (Linea/Arbitrum had documented false positives)
- If two T4 sources disagree → drop from training, do not guess
- Same address appearing in T1 and G1 → drop (data error)

**Acceptance criteria:**
- ≥30K T1+T2 labeled addresses (both classes)
- ≥100K T3+T4+T5 addresses for training augmentation
- Held-out evaluation set: 5K sybil (T1+T2) + 5K genuine (G1), never used for training
- Manifest documents license and retrieval reproducibly
- `curate.py` is idempotent — re-running produces byte-identical output

**Tests (4):**
- Curated dataset has no duplicate (address, chain) keys
- Tier confidence weights match manifest
- Held-out set has zero overlap with training set
- Conflict resolution rules applied correctly (synthetic conflict test)

**Why this exists:** The product's whole pitch is "evidence + lower false positives than Trusta/LayerZero." If we train on their outputs, we inherit their FPR. T1/T2 labels are scarce but they are the only honest yardstick.

---

### PHASE 1: FOUNDATION (Steps 1-4)

#### Step 1: Initialize monorepo and infrastructure

**Task:** Set up Turborepo with Fastify API, Python ML package, and Next.js frontend.

**Commands:**
```bash
# Root
npx create-turbo@latest sybilshield
cd sybilshield

# API (Fastify)
cd apps/api
npm init -y
npm install fastify @fastify/cors @fastify/rate-limit
npm install drizzle-orm postgres bullmq ioredis zod stripe
npm install -D typescript @types/node drizzle-kit vitest

# ML (Python)
cd ../ml
python -m venv .venv
pip install pandas numpy scikit-learn lightgbm networkx python-louvain requests psycopg2-binary

# Web (Next.js)
cd ../web
npx create-next-app@latest . --typescript --tailwind --app --src-dir
npx shadcn-ui@latest init
```

**Files to create:**
- `docker-compose.yml` — PostgreSQL + Redis + Neo4j (optional)
- `apps/api/src/index.ts` — Fastify server with health check
- `apps/ml/sybilshield/__init__.py`
- `.env.example`

**Acceptance criteria:**
- `turbo build` succeeds
- `docker compose up` starts PostgreSQL + Redis
- Fastify responds to GET /health
- Python `import sybilshield` works

---

#### Step 2: Database schema and API auth

**Task:** Implement database schema with Drizzle ORM. Set up API key authentication.

**Files to create:**
- `apps/api/src/db/schema.ts` — All tables from schema above
- `apps/api/src/db/index.ts` — Connection
- `apps/api/src/middleware/auth.ts` — API key validation middleware
- `apps/api/src/routes/auth.ts` — Create account, generate API key

**API key flow:**
```
1. Customer registers (email + password or OAuth)
2. System generates API key: sk_live_{random_32_chars}
3. Key shown once, hash stored in DB
4. All API requests require header: Authorization: Bearer sk_live_...
5. Middleware validates hash against DB
```

**Acceptance criteria:**
- Schema migrations run successfully
- API key generation returns valid key
- Authenticated requests pass, unauthenticated return 401
- Rate limiting works (100 req/min for free tier)

**Tests (5):**
- API key generation and validation
- Invalid API key returns 401
- Rate limit enforced (429 after limit)
- Schema creates all tables correctly
- Customer creation with unique email constraint

---

#### Step 3: Data ingestion service

**Task:** Build the service that fetches on-chain transaction data for a list of addresses.

**Files to create:**
- `apps/api/src/services/ingest.ts`
- `apps/api/src/workers/ingest.worker.ts`

**Logic:**
```typescript
async function ingestAddressData(address: string, chain: string): Promise<RawAddressData> {
  // 1. Fetch all transactions (Alchemy getAssetTransfers)
  const outgoing = await alchemy.core.getAssetTransfers({
    fromAddress: address,
    category: ['external', 'erc20'],
    maxCount: 1000,
    withMetadata: true
  });
  const incoming = await alchemy.core.getAssetTransfers({
    toAddress: address,
    category: ['external', 'erc20'],
    maxCount: 1000,
    withMetadata: true
  });

  // 2. Fetch current balances (Dune Sim)
  const balances = await fetch(
    `https://api.sim.dune.com/v1/evm/balances/${address}`,
    { headers: { 'X-Sim-Api-Key': DUNE_API_KEY } }
  );

  // 3. Get first funding transaction (where did initial ETH come from?)
  const firstIncoming = incoming.transfers
    .filter(t => t.category === 'external' && parseFloat(t.value) > 0)
    .sort((a, b) => new Date(a.metadata.blockTimestamp).getTime() - 
                     new Date(b.metadata.blockTimestamp).getTime())[0];

  return {
    address,
    chain,
    fundingSource: firstIncoming?.from || null,
    fundingTimestamp: firstIncoming?.metadata.blockTimestamp || null,
    fundingAmount: firstIncoming?.value || '0',
    transactions: [...outgoing.transfers, ...incoming.transfers],
    balances: balances.data,
    firstTxTimestamp: /* earliest tx timestamp */,
    lastTxTimestamp: /* latest tx timestamp */,
    totalTxCount: outgoing.transfers.length + incoming.transfers.length,
  };
}
```

**Batch processing with BullMQ:**
```typescript
// Process 50 addresses concurrently, with rate limiting
const ingestQueue = new Queue('ingest', { connection: redis });

async function startIngestion(analysisId: string, addresses: string[], chain: string) {
  // Split into chunks of 50
  for (const chunk of chunks(addresses, 50)) {
    await ingestQueue.addBulk(
      chunk.map(addr => ({
        name: 'ingest-address',
        data: { analysisId, address: addr, chain },
        opts: { attempts: 3, backoff: { type: 'exponential', delay: 2000 } }
      }))
    );
  }
}
```

**Cost & throughput reality check (do this math before coding):**

Each address requires ≥2 `getAssetTransfers` calls (in + out), each ≈150 Alchemy CU. For 100K addresses = 200K calls = **30M CU**. Alchemy Growth tier ($49/mo) covers 25M CU/mo — so a single 100K analysis exhausts a paid plan. Real plan:
- For analyses up to 50K addresses: Alchemy Scale ($199/mo, 50M CU + 1500 CU/sec).
- For ≥100K addresses: provision a self-hosted Erigon/Reth archive node (one-time ~$300/mo on dedicated hardware) and use Alchemy only as fallback. This is a Phase 3 (month 4+) infra task, not optional.
- Throughput at Alchemy Scale (1500 CU/sec ≈ 10 req/sec sustained): 200K calls / 10 = **~5.5 hours for 100K addresses**, not 30 minutes. With self-hosted node: 30–50 req/sec realistic → ~1–2 hours.
- Update unit economics: variable cost for 500K address analysis is **$800–2,000**, not $200–500. Margin still healthy at $7,500 Standard tier, but the Project Description needs alignment.

**Acceptance criteria:**
- Given an address, returns complete transaction history
- Funding source correctly identified (first incoming ETH transfer)
- Rate limiting respects provider quota (configurable, default 10 req/sec for Alchemy Scale)
- Failed ingestion retries 3x with exponential backoff
- Results stored in feature_store table
- 100K addresses ingested in < 2 hours on self-hosted node OR < 6 hours on Alchemy Scale
- CU consumption tracked per analysis (stored on `analyses.cu_consumed`) for cost attribution

**Tests (5):**
- Known address returns transactions
- Funding source detected correctly
- Empty wallet (no transactions) handled gracefully
- Rate limiting prevents 429 errors
- Batch processing completes for 1000 addresses

---

#### Step 4: Feature extraction (Python)

**Task:** Extract ML features from raw transaction data for each address.

**Files to create:**
- `apps/ml/sybilshield/features/funding.py`
- `apps/ml/sybilshield/features/temporal.py`
- `apps/ml/sybilshield/features/behavioral.py`
- `apps/ml/sybilshield/features/graph.py`

**Feature set (per address):**

```python
# funding.py — Funding Source Features
{
    "funding_source": "0xABC...",           # address of first funder
    "funding_source_is_exchange": bool,      # funded from known exchange
    "funding_source_is_contract": bool,      # funded from contract
    "funding_amount_eth": float,             # amount of first funding
    "funding_timestamp": int,                # unix timestamp
    "same_funder_count": int,                # how many other addresses share this funder
    "funding_chain_depth": int,              # hops from original source
}

# temporal.py — Timing Pattern Features
{
    "first_tx_timestamp": int,
    "last_tx_timestamp": int,
    "account_age_days": int,
    "active_days": int,                     # distinct days with transactions
    "active_day_ratio": float,              # active_days / account_age_days
    "avg_time_between_txs": float,          # seconds
    "std_time_between_txs": float,          # higher = more human-like
    "hour_entropy": float,                  # entropy of tx hour distribution
    "day_of_week_entropy": float,           # entropy of tx day distribution
    "burst_score": float,                   # % of txs in top 10% of time windows
    "max_txs_per_hour": int,
    "activity_regularity": float,           # autocorrelation of daily activity
}

# behavioral.py — Transaction Behavior Features
{
    "total_tx_count": int,
    "unique_contracts_interacted": int,
    "unique_tokens_transferred": int,
    "total_value_transferred_usd": float,
    "avg_tx_value_usd": float,
    "max_tx_value_usd": float,
    "has_nft_activity": bool,
    "has_defi_activity": bool,
    "has_bridge_activity": bool,
    "has_governance_activity": bool,
    "protocol_diversity": int,              # unique protocols used
    "tx_type_entropy": float,               # entropy of tx types
    "sequence_hash": str,                   # hash of ordered contract calls (for similarity)
    "top3_contracts": list,                 # most interacted contracts
}

# graph.py — Network Structure Features
{
    "in_degree": int,                       # unique addresses that sent to this address
    "out_degree": int,                      # unique addresses this address sent to
    "in_out_ratio": float,
    "clustering_coefficient": float,        # local graph clustering
    "pagerank": float,                      # importance in tx graph
    "is_in_dense_subgraph": bool,           # part of tightly connected cluster
    "subgraph_density": float,              # density of local neighborhood
    "shared_counterparties": int,           # addresses that interact with same set of contracts
}
```

**Implementation:**
```python
# features/temporal.py
import numpy as np
from scipy.stats import entropy

def extract_temporal_features(transactions: list[dict]) -> dict:
    timestamps = sorted([tx['timestamp'] for tx in transactions])
    
    if len(timestamps) < 2:
        return default_temporal_features()
    
    # Time between transactions
    deltas = np.diff(timestamps)
    
    # Hour distribution entropy (more uniform = more human-like)
    hours = [datetime.fromtimestamp(ts).hour for ts in timestamps]
    hour_counts = np.bincount(hours, minlength=24)
    hour_ent = entropy(hour_counts + 1)  # add 1 to avoid log(0)
    
    # Day of week distribution
    days = [datetime.fromtimestamp(ts).weekday() for ts in timestamps]
    day_counts = np.bincount(days, minlength=7)
    day_ent = entropy(day_counts + 1)
    
    # Burst detection
    # If >50% of txs happen within 10% of the total time range, it's bursty
    time_range = timestamps[-1] - timestamps[0]
    if time_range > 0:
        window = time_range * 0.1
        max_in_window = max(
            sum(1 for ts in timestamps if t <= ts < t + window)
            for t in timestamps
        )
        burst_score = max_in_window / len(timestamps)
    else:
        burst_score = 1.0
    
    return {
        'first_tx_timestamp': timestamps[0],
        'last_tx_timestamp': timestamps[-1],
        'account_age_days': (timestamps[-1] - timestamps[0]) / 86400,
        'active_days': len(set(datetime.fromtimestamp(ts).date() for ts in timestamps)),
        'avg_time_between_txs': float(np.mean(deltas)),
        'std_time_between_txs': float(np.std(deltas)),
        'hour_entropy': float(hour_ent),
        'day_of_week_entropy': float(day_ent),
        'burst_score': burst_score,
        'max_txs_per_hour': max(hour_counts),
    }
```

**Acceptance criteria:**
- All 4 feature modules produce correct output for known addresses
- Features are deterministic (same input → same output)
- Missing data handled gracefully (defaults for empty wallets)
- Feature extraction for 100K addresses completes in < 10 minutes
- Features stored in feature_store as JSONB

**Tests (8):**
- Funding source detected correctly for funded wallet
- Exchange-funded wallet flagged as funded_from_exchange=true
- Temporal features: scripted wallet has low entropy, low std_time_between_txs
- Temporal features: real wallet has high entropy, high std
- Behavioral features: DeFi user has has_defi_activity=true
- Graph features: isolated wallet has low in_degree, low pagerank
- Empty wallet returns default features (all zeros/nulls)
- Feature extraction is idempotent

---

### PHASE 2: DETECTION ENGINE (Steps 5-8)

#### Step 5: Funding source clustering

**Task:** Cluster wallets that share the same funding source.

**File:** `apps/ml/sybilshield/clustering/funding_cluster.py`

**Algorithm:**
```python
def cluster_by_funding_source(addresses_with_features: list[dict]) -> list[Cluster]:
    """
    Group addresses by their funding source.
    If address A and B were both funded by address X within 24 hours,
    they likely belong to the same entity.
    """
    # Step 1: Group by funding source
    funder_groups = defaultdict(list)
    for addr in addresses_with_features:
        if addr['funding_source'] and not addr['funding_source_is_exchange']:
            funder_groups[addr['funding_source']].append(addr)
    
    # Step 2: Filter — only groups with 3+ addresses are suspicious
    clusters = []
    for funder, group in funder_groups.items():
        if len(group) >= 3:
            # Step 3: Check temporal proximity
            timestamps = [a['funding_timestamp'] for a in group]
            max_time_spread = max(timestamps) - min(timestamps)
            
            # If all funded within 24 hours → high confidence cluster
            if max_time_spread < 86400:
                confidence = 0.95
            elif max_time_spread < 86400 * 7:
                confidence = 0.80
            else:
                confidence = 0.60
            
            clusters.append(Cluster(
                id=f"F-{hash(funder)[:8]}",
                method='funding',
                addresses=[a['address'] for a in group],
                size=len(group),
                confidence=confidence,
                evidence=f"All {len(group)} addresses funded by {funder} within {max_time_spread/3600:.0f} hours"
            ))
    
    return clusters
```

**Acceptance criteria:**
- Correctly groups addresses funded from the same source
- Excludes exchange-funded addresses (CEX funding is legitimate)
- Temporal proximity affects confidence score
- Minimum cluster size = 3
- Handles millions of addresses efficiently

**Tests (4):**
- 10 addresses funded by same wallet → cluster detected
- Exchange-funded addresses not clustered
- Single-address "clusters" filtered out
- Time spread affects confidence correctly

---

#### Step 6: Behavioral clustering (OPTICS)

**Task:** Cluster addresses with similar transaction patterns.

**File:** `apps/ml/sybilshield/clustering/behavior_cluster.py`

**Algorithm:**
```python
from sklearn.cluster import OPTICS
import numpy as np

def cluster_by_behavior(features_matrix: np.ndarray, addresses: list[str]) -> list[Cluster]:
    """
    Use OPTICS to find clusters of addresses with similar behavior patterns.
    
    Features used for clustering:
    - avg_time_between_txs (normalized)
    - hour_entropy (normalized)
    - protocol_diversity (normalized)
    - tx_type_entropy (normalized)
    - burst_score
    - total_tx_count (log-normalized)
    - unique_contracts_interacted (normalized)
    """
    
    # Normalize features
    from sklearn.preprocessing import StandardScaler
    scaler = StandardScaler()
    X = scaler.fit_transform(features_matrix)
    
    # OPTICS clustering — doesn't require specifying number of clusters
    clustering = OPTICS(
        min_samples=5,           # minimum cluster size
        max_eps=2.0,             # maximum distance
        metric='euclidean',
        cluster_method='xi',
        xi=0.05
    )
    labels = clustering.fit_predict(X)
    
    # Extract clusters (label -1 = noise/unclustered)
    clusters = []
    for label in set(labels):
        if label == -1:
            continue
        
        mask = labels == label
        cluster_addresses = [addresses[i] for i in range(len(addresses)) if mask[i]]
        cluster_features = features_matrix[mask]
        
        if len(cluster_addresses) >= 5:
            # Calculate similarity within cluster
            from sklearn.metrics import pairwise_distances
            distances = pairwise_distances(cluster_features)
            avg_distance = distances.mean()
            
            clusters.append(Cluster(
                id=f"B-{label}",
                method='behavior',
                addresses=cluster_addresses,
                size=len(cluster_addresses),
                confidence=max(0.5, 1.0 - avg_distance / 5.0),
                evidence=f"Behavioral similarity cluster: {len(cluster_addresses)} addresses with avg distance {avg_distance:.2f}"
            ))
    
    return clusters
```

**Scaling note:** OPTICS is ~O(n² log n) in worst case; at 100K points naive sklearn implementation is several hours, not minutes. Use one of:
1. **Two-stage:** MiniBatchKMeans (k=200) → OPTICS within each macro-cluster. Reduces problem to ~500 points per OPTICS call.
2. **HDBSCAN with `algorithm='boruvka_kdtree'`** as drop-in replacement — scales to 1M points in ~10 min on 16-core box.
3. **Always subsample if n > 50K**, and assign non-sampled points to nearest cluster centroid post-hoc.

Default the implementation to HDBSCAN-boruvka; keep OPTICS only as a quality reference for n<10K test sets.

**Acceptance criteria:**
- Detects clusters of addresses with similar behavior
- Does not cluster genuinely diverse addresses
- Cluster size minimum = 5
- Handles 1M+ addresses via two-stage or HDBSCAN approach
- Confidence score reflects intra-cluster similarity

**Tests (4):**
- Synthetic scripted addresses (identical patterns) → clustered
- Diverse real addresses → not clustered
- Mixed dataset: clusters detected within noise
- Performance: 100K addresses processed in < 15 minutes on 16-core box (HDBSCAN path)

---

#### Step 7: Graph-based community detection

**Task:** Build transaction graph and detect communities using Louvain algorithm.

**File:** `apps/ml/sybilshield/clustering/graph_community.py`

**Algorithm:**
```python
import networkx as nx
from community import community_louvain

def detect_communities(transactions: list[dict], addresses_in_scope: set[str]) -> list[Cluster]:
    """
    Build a directed graph from transactions between addresses in scope.
    Run Louvain community detection to find tightly connected groups.
    """
    
    # Step 1: Build graph
    G = nx.DiGraph()
    for tx in transactions:
        sender = tx['from']
        receiver = tx['to']
        
        # Only add edges between addresses in our analysis set
        if sender in addresses_in_scope and receiver in addresses_in_scope:
            if G.has_edge(sender, receiver):
                G[sender][receiver]['weight'] += 1
            else:
                G.add_edge(sender, receiver, weight=1)
    
    # Step 2: Convert to undirected for Louvain
    G_undirected = G.to_undirected()
    
    # Step 3: Run Louvain community detection
    partition = community_louvain.best_partition(G_undirected, resolution=1.0)
    
    # Step 4: Extract communities
    communities = defaultdict(list)
    for node, community_id in partition.items():
        communities[community_id].append(node)
    
    # Step 5: Filter suspicious communities
    clusters = []
    for comm_id, members in communities.items():
        if len(members) >= 5:
            # Calculate density
            subgraph = G_undirected.subgraph(members)
            density = nx.density(subgraph)
            
            # High density + medium size = suspicious
            if density > 0.3 and len(members) < 500:
                clusters.append(Cluster(
                    id=f"G-{comm_id}",
                    method='graph',
                    addresses=members,
                    size=len(members),
                    confidence=min(0.95, density),
                    evidence=f"Dense transaction community: {len(members)} addresses with density {density:.2f}"
                ))
    
    return clusters
```

**Library choice:** `python-louvain` is pure Python and chokes above ~50K nodes. Use **`igraph`** (`igraph.Graph.community_multilevel`, C backend) or **`graph-tool`** for production. Benchmarks: igraph processes 500K nodes / 5M edges in ~3–5 minutes on a 16-core box; python-louvain takes hours. Sample code above is illustrative — actual implementation must use igraph.

**Leiden over Louvain:** consider `leidenalg` (igraph-compatible) — it fixes Louvain's badly-connected-communities pathology, which directly affects Sybil ring detection quality. Same API, strictly better partitions.

**Acceptance criteria:**
- Graph built correctly from transaction data (use igraph, not networkx, for graphs >100K nodes)
- Leiden/Louvain detects known Sybil communities
- Density threshold filters out legitimate trading groups
- Handles 500K+ nodes efficiently
- Communities with <5 members filtered out

**Tests (4):**
- Synthetic Sybil ring (10 wallets sending to each other) → detected
- Star topology (one hub, many spokes) → detected
- Random graph (no community structure) → no clusters
- Performance: 500K nodes / 5M edges processed in < 8 minutes on 16-core box (igraph + leidenalg)

---

#### Step 7.5: Cross-chain identity linking

**Task:** Link wallet addresses across chains that are likely controlled by the same entity, via bridge-transaction correlation. The Project Description lists this as a core method; without it the marketing claim is unbacked.

**File:** `apps/ml/sybilshield/clustering/cross_chain.py`

**Approach (deterministic, then probabilistic):**

```python
# Deterministic links (high confidence)
# Bridge contracts emit events with (src_address, dst_address, amount, src_tx_hash).
# If we see address A on Ethereum bridging to address B on Arbitrum via Stargate/LayerZero/Hop,
# A and B are the same entity by construction.
BRIDGE_CONTRACTS = {
    'ethereum': {'0x...stargate', '0x...hop', '0x...across', '0x...synapse', '0x...wormhole'},
    'arbitrum': {...},
    'optimism': {...},
    'base': {...},
}

def deterministic_links(bridge_events: list[BridgeEvent]) -> list[Link]:
    links = []
    for ev in bridge_events:
        if ev.src_address != ev.dst_address:
            # Deposit-to-different-address — still same entity if signed by src_address
            pass
        links.append(Link(
            (ev.src_chain, ev.src_address),
            (ev.dst_chain, ev.dst_address),
            confidence=0.99,
            evidence=f"Bridge {ev.bridge_name} tx {ev.src_tx_hash} -> {ev.dst_tx_hash}"
        ))
    return links

# Probabilistic links (medium confidence)
# Same funding-source-on-chain-A → received-on-chain-B within tight time window
# AND identical first-action pattern (same dApp, same approval, same swap size within 5%)
def probabilistic_links(addresses_by_chain) -> list[Link]:
    # Match on (funding_amount ± 2%, funding_timestamp ± 600s, first_dApp_contract)
    ...
```

**Build cross-chain identity graph:**
- Nodes: `(chain, address)` tuples
- Edges: deterministic (weight 1.0) + probabilistic (weight 0.5–0.85)
- Run connected-components → each component is one **entity**
- An entity controlling >3 addresses across >2 chains in <24h funding window = high Sybil prior

**Acceptance criteria:**
- Deterministic links found for known bridge users (test with 100 manually-verified addresses)
- Probabilistic linker FP rate <10% on held-out genuine users
- Entity graph correctly merges addresses sharing bridge tx
- Cross-chain features added to per-address feature vector: `entity_size`, `entity_chain_count`, `entity_avg_score`
- Handles top 8 chains: ethereum, arbitrum, optimism, base, polygon, bsc, avalanche, linea

**Tests (5):**
- Stargate bridge tx links src and dst addresses (deterministic)
- LayerZero OFT transfer creates link
- Same-amount-same-time-different-bridge correlation creates probabilistic link
- Genuine user using multiple chains independently → NOT linked (high time gap)
- Entity graph computed in <5 min for 100K addresses across 4 chains

---

#### Step 8: ML scoring model

**Task:** Train LightGBM model on labeled data to produce per-address Sybil score.

**Files:**
- `apps/ml/sybilshield/scoring/train.py`
- `apps/ml/sybilshield/scoring/predict.py`
- `apps/ml/sybilshield/scoring/model.py`

**Training data:** Use the tiered dataset from Step 0. Critical rules:
- **Train** on T1–T5 with `sample_weight = confidence_weight` (LightGBM accepts this directly).
- **Evaluate** ONLY on T1+T2+G1 held-out set. Reporting precision/recall against T4 labels is reporting agreement with another detector, not ground truth.
- **Never** drop T4/T5 entirely — they add coverage. But never let them set the precision/recall bar.

**Model:**
```python
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import precision_score, recall_score, f1_score

def train_model(features_df, labels):
    """
    Train LightGBM binary classifier: sybil (1) vs genuine (0).
    
    Features: all extracted features from funding, temporal, behavioral, graph modules.
    Labels: 1 = known sybil, 0 = known genuine
    """
    # Split: holdout = T1+T2+G1 only (set aside in Step 0). Train+val from remaining.
    X_train, X_val, y_train, y_val, w_train, w_val = train_test_split(
        features_df, labels, sample_weights, test_size=0.2,
        stratify=labels, random_state=42
    )

    model = lgb.LGBMClassifier(
        n_estimators=500,
        max_depth=8,
        learning_rate=0.05,
        num_leaves=63,
        min_child_samples=20,
        subsample=0.8,
        colsample_bytree=0.8,
        class_weight='balanced',
        random_state=42
    )

    model.fit(
        X_train, y_train,
        sample_weight=w_train,
        eval_set=[(X_val, y_val)],
        eval_sample_weight=[w_val],
        callbacks=[lgb.early_stopping(50)],
    )
    
    # Evaluate
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    
    print(f"Precision: {precision_score(y_test, y_pred):.4f}")
    print(f"Recall:    {recall_score(y_test, y_pred):.4f}")
    print(f"F1:        {f1_score(y_test, y_pred):.4f}")
    
    return model

def predict_scores(model, features_df) -> list[int]:
    """
    Return Sybil scores 0-100 for each address.
    """
    probabilities = model.predict_proba(features_df)[:, 1]
    scores = (probabilities * 100).astype(int).clip(0, 100)
    return scores.tolist()
```

**Acceptance criteria (against T1+T2+G1 honest holdout, NOT against other detectors' outputs):**
- Model trained on ≥100K weighted-labeled addresses
- Precision ≥ 0.85 at score threshold 70 (MVP bar; tighten over time as data grows)
- Recall ≥ 0.75 at threshold 70
- ROC-AUC ≥ 0.92
- FPR ≤ 0.05 at threshold 70 on G1 verified-genuine subset (this is the customer-visible metric)
- Calibration: predicted probabilities within ±5% of empirical rate per decile (Brier/reliability plot)
- Model inference: 100K addresses scored in < 60 seconds on 16-core CPU
- Model artifact includes: trained weights, feature schema hash, training data manifest hash, eval metrics, training timestamp

**Note:** The 92%/85% numbers from the original spec are aspirational and assume clean labels. With honest T1+T2 evaluation they are not achievable at MVP. Reset expectations now to avoid post-launch overclaim.

**Tests (5):**
- Model loads and predicts correctly
- Known Sybil address scores > 70
- Known genuine address scores < 30
- Scores are integers 0-100
- Model retraining produces improved metrics on new data

---

#### Step 8.5: Adversarial robustness, drift, and retraining loop

**Task:** The product's moat is "model improves over time as farmers adapt." Without an explicit feedback loop, the moat does not exist. This step builds it.

**Files:**
- `apps/ml/sybilshield/eval/adversarial.py` — adversarial test generator
- `apps/ml/sybilshield/eval/drift.py` — feature drift detection
- `apps/ml/sybilshield/scoring/retrain.py` — scheduled retraining orchestrator
- `apps/api/src/routes/feedback.ts` — customer feedback endpoint (mark FP/FN)

**Adversarial test set:**
Hand-craft 500 addresses simulating known evasion techniques:
- Randomized inter-tx timing (Poisson sampling)
- Funding via CEX (Binance hot wallet) instead of single funder
- Interspersed "noise" transactions on random dApps
- Long dormancy + slow burst (mimicking real-user return)
- Multi-hop funding chain (3+ hops from common source)

Run this set after every retrain. Recall on adversarial set is a separate tracked metric — if it drops, farmers have found a hole.

**Drift detection (weekly cron):**
- Compute population PSI (Population Stability Index) per feature between training-time distribution and last-7-days production input distribution.
- PSI > 0.25 on any top-10 feature → alert, schedule retrain.
- Track score distribution drift: KS statistic on output scores week-over-week.

**Customer feedback loop:**
```
POST /v1/analyses/:id/feedback
{
  "address": "0x...",
  "verdict": "false_positive" | "false_negative" | "confirmed",
  "evidence": "User passed manual review with KYC + 2yr GitHub commits"
}
```
- Stored in `feedback` table with customer_id, analysis_id, address, verdict, evidence.
- Feedback with `verdict=confirmed` + customer in good standing → promoted to T3 label.
- Feedback with `verdict=false_positive` → if 2+ customers agree on same address → demote that address and similar-cluster members; flag for human review.

**Retraining cadence:**
- **Monthly**: scheduled retrain on accumulated feedback + new public datasets.
- **Triggered**: drift alert OR adversarial recall drop >5% OR customer-reported FP/FN spike.
- Every retrain produces a new model version. Old versions kept queryable for 90 days (reproducibility for past analyses).

**Acceptance criteria:**
- Adversarial test set committed; recall measured per retrain
- PSI computation runs weekly via cron, alerts to Slack/email
- Feedback endpoint accepts FP/FN reports, stores with audit trail
- Retraining is fully scripted, no manual steps
- Model versioning: each `address_scores` row has `model_version` FK
- Rolling back to prior model version is single CLI command

**Tests (5):**
- Adversarial generator produces addresses that evade naive thresholds
- PSI correctly flags shifted distribution
- Feedback endpoint validates and persists
- Retrain script produces new model + diff metrics report
- Old model still queryable after new one deployed

---

### PHASE 3: API & EVIDENCE (Steps 9-11)

#### Step 9: Analysis pipeline orchestrator

**Task:** Build the end-to-end pipeline that takes an address list and produces scored results.

**File:** `apps/ml/sybilshield/pipeline.py`

**Pipeline:**
```python
class SybilShieldPipeline:
    def run(self, analysis_id: str, addresses: list[str], chains: list[str]):
        # 1. Ingest on-chain data (parallel, batched)
        raw_data = self.ingest(addresses, chains)          # ~20 min for 100K
        
        # 2. Extract features
        features = self.extract_features(raw_data)          # ~5 min
        
        # 3. Run clustering (parallel)
        funding_clusters = self.cluster_funding(features)   # ~2 min
        behavior_clusters = self.cluster_behavior(features) # ~5 min
        graph_clusters = self.cluster_graph(raw_data)       # ~3 min
        
        # 4. Merge clusters (deduplicate, combine evidence)
        all_clusters = self.merge_clusters(
            funding_clusters, behavior_clusters, graph_clusters
        )
        
        # 5. Add cluster membership as features
        features_with_clusters = self.add_cluster_features(features, all_clusters)
        
        # 6. ML scoring
        scores = self.score(features_with_clusters)         # ~30 sec
        
        # 7. Generate evidence reports
        evidence = self.generate_evidence(scores, all_clusters, features)
        
        # 8. Store results
        self.store_results(analysis_id, scores, all_clusters, evidence)
        
        return {
            'total': len(addresses),
            'sybil': sum(1 for s in scores if s >= 70),
            'suspicious': sum(1 for s in scores if 40 <= s < 70),
            'genuine': sum(1 for s in scores if s < 40),
            'clusters': len(all_clusters)
        }
```

**Acceptance criteria:**
- Full pipeline runs end-to-end for 1K addresses in < 5 minutes
- Full pipeline runs for 100K addresses in < 45 minutes
- Results stored correctly in all tables
- Pipeline is idempotent (re-running produces same results)
- Partial failures are handled (skip failed addresses, continue)

---

#### Step 10: REST API endpoints

**Endpoints:**

```
# ===== ANALYSIS JOBS =====
POST   /v1/analyses                    # Create new analysis
GET    /v1/analyses                    # List analyses
GET    /v1/analyses/:id                # Get analysis status + summary
GET    /v1/analyses/:id/results        # Get all scored addresses (paginated)
GET    /v1/analyses/:id/results/export # Download CSV
GET    /v1/analyses/:id/clusters       # Get detected clusters
GET    /v1/analyses/:id/report         # Get summary report

# ===== SINGLE ADDRESS SCORING =====
GET    /v1/score/:address              # Score single address (cached)
POST   /v1/score/batch                 # Score batch of addresses (up to 100)

# ===== KNOWN ENTITIES =====
GET    /v1/entities/:address           # Check if address is known Sybil

# ===== ACCOUNT =====
GET    /v1/account                     # Account info + usage
POST   /v1/account/api-keys           # Generate new API key
```

**Request/Response example:**
```json
// POST /v1/analyses
{
  "name": "Mainnet Airdrop Filtering",
  "chains": ["ethereum", "arbitrum"],
  "addresses": ["0x123...", "0x456...", ...],  // or "addresses_file_url"
  "sensitivity": "balanced"
}

// Response
{
  "id": "an_abc123",
  "status": "pending",
  "address_count": 150000,
  "estimated_time_minutes": 35,
  "webhook_url": "https://api.sybilshield.com/v1/analyses/an_abc123"
}

// GET /v1/analyses/an_abc123 (when complete)
{
  "id": "an_abc123",
  "status": "complete",
  "summary": {
    "total_scored": 150000,
    "sybil_count": 42300,
    "suspicious_count": 18700,
    "genuine_count": 89000,
    "cluster_count": 1247,
    "largest_cluster_size": 312
  },
  "results_csv_url": "https://...",
  "processing_time_seconds": 1847
}

// GET /v1/score/0x123...
{
  "address": "0x123...",
  "chain": "ethereum",
  "sybil_score": 87,
  "confidence": 0.93,
  "label": "sybil",
  "cluster_id": "F-a8b2c1d4",
  "cluster_size": 47,
  "evidence": [
    {
      "type": "shared_funding",
      "description": "Funded by 0xABC...123 which also funded 46 other addresses",
      "confidence": 0.95
    },
    {
      "type": "behavioral_similarity",
      "description": "Transaction pattern matches cluster of 47 addresses (94% similarity)",
      "confidence": 0.89
    }
  ]
}
```

**Acceptance criteria:**
- All endpoints respond correctly
- Authentication required on all endpoints
- Pagination works for large result sets
- CSV export contains all fields
- Webhook notification sent when analysis completes
- Rate limiting enforced per plan

**Tests (8):**
- Create analysis returns job ID
- Get analysis returns correct status progression
- Results paginated correctly (page_size, cursor)
- CSV export matches database results
- Single address scoring returns cached result
- Batch scoring handles up to 100 addresses
- Unauthorized request returns 401
- Rate limit exceeded returns 429

---

#### Step 11: Evidence report generator

**Task:** Generate human-readable evidence for each flagged address and cluster.

**File:** `apps/ml/sybilshield/evidence/generator.py`

**Evidence types:**
```python
EVIDENCE_TEMPLATES = {
    'shared_funding': "Funded by {funder} which also funded {count} other addresses in this analysis within {time_window}",
    'behavioral_clone': "Transaction pattern {similarity}% similar to {cluster_size} other addresses (sequence: {pattern})",
    'temporal_scripting': "Activity concentrated in {window} with {regularity} regularity across {days} days — consistent with automated scripting",
    'graph_cluster': "Part of dense transaction community ({size} addresses, density {density}) isolated from broader network",
    'cross_chain_link': "Same entity detected across {chains} via bridge correlation at {timestamps}",
    'low_entropy': "Activity patterns show unusually low randomness (hour entropy: {hour_ent}, expected >2.5 for genuine users)",
    'dormant_burst': "Account dormant for {dormant_days} days, then {burst_txs} transactions in {burst_hours} hours",
}
```

**Acceptance criteria:**
- Every address with score > 40 has at least one evidence item
- Evidence is human-readable and specific (not generic)
- Evidence includes confidence score
- No evidence fabricated — every claim traceable to data
- Evidence exportable as JSON per address

**Tests (4):**
- Funded-from-same-source generates correct evidence
- Behavioral similarity generates pattern description
- Temporal anomaly generates time window description
- No evidence for genuine (score < 30) addresses

---

### PHASE 4: FRONTEND & BILLING (Steps 12-14)

#### Step 12: Dashboard frontend

**Pages:**
- `/dashboard` — Overview: total analyses, API usage, quick score lookup
- `/dashboard/analyses` — List all analyses with status
- `/dashboard/analyses/[id]` — Analysis results: summary cards, cluster visualization, address table with search/filter
- `/dashboard/api-keys` — Manage API keys
- `/docs` — Interactive API documentation (Swagger/Redoc style)

**Analysis results page design:**
```
┌──────────────────────────────────────────────────────────────┐
│  Analysis: Mainnet Airdrop Filtering                         │
│  Status: ✅ Complete │ 150,000 addresses │ 35 min            │
├──────────────────────────────────────────────────────────────┤
│  ┌──────┐  ┌───────────┐  ┌──────────┐  ┌─────────┐        │
│  │89,000│  │  18,700   │  │  42,300  │  │  1,247  │        │
│  │Genuine│  │Suspicious │  │  Sybil   │  │Clusters │        │
│  │ 59.3% │  │  12.5%   │  │  28.2%   │  │         │        │
│  └──────┘  └───────────┘  └──────────┘  └─────────┘        │
│                                                              │
│  [Distribution Chart: histogram of scores 0-100]             │
│                                                              │
│  [Cluster Map: network visualization of top 20 clusters]     │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ Address Search & Filter Table                         │    │
│  │ [Search: 0x...]  [Filter: Sybil ▾]  [Export CSV]     │    │
│  │ ┌────────────┬───────┬──────────┬────────┬─────────┐ │    │
│  │ │ Address    │ Score │ Label    │Cluster │Evidence │ │    │
│  │ │ 0xA12...   │ 94    │ Sybil   │ F-a8b2 │ View →  │ │    │
│  │ │ 0xB34...   │ 87    │ Sybil   │ F-a8b2 │ View →  │ │    │
│  │ │ 0xC56...   │ 52    │ Suspect │ B-17   │ View →  │ │    │
│  │ │ 0xD78...   │ 12    │ Genuine │ —      │ —       │ │    │
│  │ └────────────┴───────┴──────────┴────────┴─────────┘ │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Acceptance criteria:**
- Dashboard loads in < 3 seconds
- Analysis results display all summary metrics
- Score distribution histogram renders correctly
- Address table supports search, filter, sort, pagination
- Evidence modal shows per-address evidence detail
- CSV export works from table view
- Mobile responsive

---

#### Step 13: Billing with Stripe

**Plans:**

| Plan | Price | API Calls/mo | Per-Analysis Limit | Features |
|---|---|---|---|---|
| Free | $0 | 100 | — | Single-address scoring only |
| Developer | $499/mo | 50K | 100K addresses | Batch scoring, basic clustering |
| Growth | $1,499/mo | 250K | 500K addresses | Full analysis, evidence, CSV |
| Enterprise | $4,999/mo | Unlimited | Unlimited | Custom models, SLA, support |

**Per-analysis pricing (one-time, no subscription):**
- $0.02 per address for analysis jobs (minimum $500)

---

#### Step 14: E2E tests and deployment

**E2E tests (Playwright):**

| # | Test | Flow |
|---|---|---|
| E1 | Signup + API key generation | Register → dashboard → create API key |
| E2 | Create analysis via dashboard | Upload CSV → start analysis → see results |
| E3 | API: create and poll analysis | POST /analyses → poll status → GET results |
| E4 | Single address scoring | GET /score/:address → verify score response |
| E5 | Export CSV | Create analysis → download CSV → verify contents |

**Deployment:**
- API: Railway (auto-scaling workers)
- ML: Railway (GPU instance for training, CPU for inference)
- Frontend: Vercel
- Database: Supabase or Neon
- Redis: Upstash

---

## TEST SUMMARY

| Category | Count |
|---|---|
| Dataset curation (Step 0) | 4 |
| API auth & routing | 8 |
| Data ingestion | 5 |
| Feature extraction | 8 |
| Funding clustering | 4 |
| Behavior clustering | 4 |
| Graph community detection | 4 |
| Cross-chain linking | 5 |
| ML model | 5 |
| Adversarial / drift / feedback | 5 |
| Evidence generation | 4 |
| API endpoints | 8 |
| Frontend E2E | 5 |
| **Total** | **69** |

---

## IMPLEMENTATION TIMELINE

Realistic estimate for a 2-person team (1 ML, 1 full-stack). Original 8-week plan ignored data curation, performance reality, and adversarial loop. Phased delivery below lets revenue start at Week 12 even though full feature parity arrives later.

| Weeks | Phase | Steps | Deliverable |
|---|---|---|---|
| 1–3 | Phase 0 | Step 0 | Curated tiered dataset, held-out eval set, manifest |
| 4–5 | Phase 1 | Steps 1–2 | Monorepo, DB schema (incl. model_versions, audit log), auth, API skeleton |
| 6–8 | Phase 1 | Steps 3–4 | Ingestion pipeline (Alchemy Scale + cost tracking), feature extraction |
| 9–11 | Phase 2 | Steps 5–7 | Three clustering methods (funding, behavior/HDBSCAN, graph/igraph-leiden) |
| 12 | Phase 2 | Step 7.5 | Cross-chain identity linking |
| 13–15 | Phase 2 | Step 8 | ML model trained with tier-weighted labels, honest metrics |
| 16 | Phase 2 | Step 8.5 | Adversarial test set, drift cron, feedback endpoint, retrain script |
| 17–18 | Phase 3 | Steps 9–10 | Pipeline orchestrator + REST API |
| 19 | Phase 3 | Step 11 | Evidence reports, appeal-ready audit log |
| 20–21 | Phase 4 | Step 12 | Dashboard |
| 22 | Phase 4 | Step 13 | Stripe billing + plan enforcement |
| 23–24 | Phase 4 | Step 14 | E2E tests, infra hardening, self-hosted node deployment, production launch |

**Total: 24 weeks (~6 months) to production MVP.**

**Revenue-bearing milestones earlier:**
- Week 12 (after Step 7): can run **manual** per-analysis service for design partners — no dashboard, no billing. Ingest CSV, run pipeline, deliver results by email. Charge $2,500–7,500 per analysis.
- Week 16 (after Step 8.5): can offer batch API to closed beta.
- Week 24: full self-serve.

**Risk: if Step 0 dataset turns out to be smaller/weaker than expected (likely), add 2–4 weeks for data sourcing partnerships (e.g., paid access to Trusta's labels, partnership with a security firm).**

---

## FINAL ACCEPTANCE CRITERIA

| # | Criterion | Verification |
|---|---|---|
| 1 | API key auth works end-to-end | POST with key → 200, without → 401 |
| 2 | Analysis created and queued from CSV upload | Status = pending → ingesting → analyzing → complete |
| 3 | 10K address analysis completes in < 30 minutes | Timed test |
| 4 | 100K address analysis completes in < 4 hours (Alchemy Scale) or < 90 min (self-hosted node) | Timed test |
| 5 | Funding source clustering detects known patterns | Synthetic test with known clusters |
| 6 | Behavioral clustering groups scripted wallets | Test with labeled Arbitrum data |
| 7 | Graph community detection finds dense subgroups | Test with synthetic ring topology |
| 8 | ML model precision ≥ 0.85 at threshold 70 on T1+T2 holdout | Evaluated on honest held-out test data |
| 9 | ML model recall ≥ 0.75 at threshold 70 on T1+T2 holdout | Evaluated on honest held-out test data |
| 9a | FPR ≤ 0.05 on G1 verified-genuine holdout | Customer-visible FP rate |
| 9b | Adversarial test recall measured and tracked | Step 8.5 deliverable |
| 10 | Evidence reports are generated for all flagged addresses | Query: all score>40 addresses have evidence JSONB |
| 11 | CSV export matches database content | Download + verify row count and scores |
| 12 | Single address scoring returns in < 2 seconds | API latency test |
| 13 | Dashboard renders analysis results correctly | E2E test |
| 14 | Stripe billing activates plan correctly | Test checkout flow |
| 15 | Rate limiting enforced per plan | 429 after limit exceeded |
| 16 | 69+ tests pass in CI | GitHub Actions green |
| 17 | Production API responds at https://api.sybilshield.com | HTTP 200 |
