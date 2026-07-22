# Design note: real-time first-sight scoring — capacity/cost model

TODO-311. Design only — no code in this note. Implementation is TODO-312.

Scope: the MVP widget (TODO-308, shipped) only serves addresses that already
have a cached row in `address_scores` — a pure DB read, effectively free.
This note is about the stretch goal: scoring an address **that has never
been submitted to SybilShield before**, synchronously, fast enough for a
claim-page UX. That means running real ingestion on the request path, which
has a real cost this note has to bound before any code gets written.

## 1. The current free-tier CU/Alchemy budget ceiling

Two different things share the name "CU" in this codebase — worth
separating before doing any capacity math with them:

- **`PLAN_LIMITS.free.maxCuPerAnalysis = 5,000`** (`apps/api/src/middleware/
  auth.ts`) is an internal, SybilShield-defined proxy unit —
  `estimatedCu = addressCount × (5 or 3)` (`apps/api/src/routes/
  analyses.ts`) — a batch-size gate, not a real Alchemy accounting figure.
  It caps *how many addresses* one free-tier analysis can request, nothing
  about real RPC cost.
- **Real Alchemy Compute Units** are what actually costs money/throughput.
  Read directly from `apps/ml/sybilshield/providers/alchemy.py`, not
  assumed: `get_transactions()` issues **2 sequential
  `alchemy_getAssetTransfers` calls per address per chain** (one `from`
  direction, one `to`), each costed at **150 CU** in the code's own
  accounting (`self.quota.cu_consumed += 150 if "getAssetTransfers" in
  method else 50`) — **300 real Alchemy CU per address, per chain**.
  `get_balance_usd()` is currently a stub returning `0.0` — it makes no RPC
  call despite the file's own header comment listing
  `alchemy_getTokenBalances: 26 CU`. Worth flagging: if that stub ever gets
  a real implementation, the per-address cost goes up ~9%; not a blocker
  for this design, just don't let the estimate silently go stale.
- **The account-level ceiling is a throughput limit, not a monthly total**:
  the code's own comment states Scale tier ($199/mo — confirmed in
  `README.md`, `DEPLOY.md`, `.env.example`) sustains **1500 CU/sec ≈ 10
  req/sec**, and `AlchemyProvider`'s `RateLimiter` is configured at exactly
  `rps=10.0` by default (`ALCHEMY_RATE_LIMIT_RPS` env var) — the code's own
  throttle **is** the CU-derived cap, already correctly tuned (10 req/sec ×
  150 CU/req = 1500 CU/sec, exact match). At 2 requests per address-chain
  ingest, that's a **hard ceiling of ~5 address-chain-ingests/second for
  the entire Alchemy account** — shared by the existing batch worker AND
  any new synchronous path, not a separate budget.

## 2. Realistic worst-case embed-widget traffic estimate

The MVP widget's worst case is bounded (a DB read per pageview, no external
cost). First-sight scoring's worst case is structurally different and worse,
for one reason: **a viral or high-traffic claim page is disproportionately
likely to be full of addresses SybilShield has never seen** — new claim
events draw first-time/new wallets by definition, which is exactly the
population the MVP widget already reports "not yet scored" for today.
Every one of those would become a real ingest under the stretch goal.

Illustrative worst case: a claim page embedding the widget goes viral during
a launch window — thousands of unique visitors in the first hour is not an
unusual number for a hyped token claim (see the `$753K zkSync farmer`
reference already cited in this repo's own blog content as an example of
real claim-event scale). At even a modest 1,000 unique-unscored-address
loads in the first 10 minutes, that's **~1.7 first-sight ingests/second
sustained**, well within a third of the account's entire 5/sec ceiling —
consumed by ONE embed, with zero authentication and zero of today's
per-customer `rpm`/`monthlyCalls` gates applying to it (the widget calls a
public, unauthed endpoint by design — same posture as `GET /v1/score/:
address` today). A launch-day spike (the first 60 seconds after a claim
page goes live, when traffic is least evenly distributed) could plausibly
multiply that burst rate 5-10× for a short window.

**The one structural mitigation that changes this math**: first-sight cost
is a **one-time cost per unique address**, not per pageview or per widget
render. A successful first-sight score gets written to `address_scores` —
the exact table `GET /v1/score/:address` already reads — so the *second*
visitor with the same address (a page reload, a second badge on another
page, the same wallet returning) costs nothing. Worst case is bounded by
**unique never-before-seen addresses**, which is smaller than raw pageviews
but still attacker-shaped: nothing stops a hostile page from generating
fresh random addresses on every load specifically to force a real ingest
every time (a realistic abuse case the rate-limiting scheme below has to
assume, not just the honest-traffic case).

## 3. Rate-limiting scheme

**Per-origin, not per-IP or per-API-key** — the same conclusion TODO-104's
`/v1/resolve` design already reached for a different reason (RPC-backed
route, real abuse cost, no API key on a public route), but for this
endpoint per-IP is additionally the *wrong* dimension: the traffic driver is
a third-party claim page's visitors, not the embedding site itself — capping
by visitor IP does nothing to cap what any *one* embed can cost in
aggregate, and a claim page can trivially have thousands of distinct visitor
IPs. What needs bounding is "how much Alchemy throughput can any one
embedding site claim." CORS is already wide open (`cors, { origin: true }`
in `apps/api/src/index.ts`) so every cross-origin `fetch` from a widget
already carries a same-shape `Origin` header available to key off — building
an `Origin`-keyed `keyGenerator` is the same pattern index.ts already uses
for the per-customer authed limiter (`keyGenerator: (req) => req.customer?.
id ?? req.ip`), just swapped to `req.headers.origin ?? req.ip` (falling back
to IP for non-browser callers, same defensive default).

Concretely:
- A per-origin cap on the new endpoint, in the same shape as `/v1/resolve`'s
  `{ max: 20, timeWindow: "1 minute" }` — needs its own number, not 20 (this
  is a shared, expensive resource with other endpoints, not `/v1/resolve`'s
  standalone budget), but the same mechanism.
- A **global reservation split** of the account's ~5 ingests/sec ceiling
  between the existing batch worker and first-sight traffic, so a
  first-sight burst can't starve customers who paid nothing extra to run a
  batch analysis mid-burst. A simple starting point: cap first-sight's own
  throughput at a fixed fraction (e.g. half) of the shared limiter's budget,
  not the whole thing — needs its own tuning pass once real usage exists,
  but the split itself must exist before launch, not be discovered after an
  incident.
- **Single-chain only** on the synchronous path, at least for v1 — the
  route accepts `chains: string[]` (up to 8) for batch analyses today;
  letting a first-sight call request multiple chains multiplies its own
  cost 1:1 per chain for zero added rate-limit protection. Force `chain`
  to a single required parameter (the widget already knows which chain its
  page cares about via the existing `data-sybilshield-api`-style attribute
  convention) instead of reusing the batch `chains[]` shape.
- The write-through cache (§2) is itself a rate-limit multiplier for free —
  make sure the new endpoint checks `address_scores` for an existing row
  BEFORE spending any Alchemy budget, same as the batch worker should
  arguably also do (out of scope here, but worth a follow-up note) — a
  repeatedly-hammered single address costs Alchemy budget exactly once.

## 4. Can the synchronous path reuse a trimmed worker pipeline, or does it need new architecture?

**Split answer — part of the pipeline reuses cleanly, part structurally
cannot, and there's one infrastructure constraint that isn't about the
pipeline at all.**

**Reuses cleanly**: ingestion (`ingest_address`) and the ML classifier
(`extract_all_features` + `SybilModel.predict_batch`, per
`pipeline.py::run`) operate on **one address's own feature vector** — the
model does not need a batch to score an address, it needs that address's
own tx history. A single-address call can run these two steps almost
verbatim, skip everything else, and get a real model-based `sybil_score`.
This maps onto the *existing* decision engine with **zero changes** to
`computeDecision()`: its own docstring already defines `confidence: "low" =
only the model classifier nudged us across the threshold with no
supporting structural signal` (`apps/api/src/lib/presets.ts`) — which is
*exactly* what a first-sight, no-clustering score is. The decision engine
already has the right vocabulary for this; it just never had a caller that
produces that shape before.

**Cannot reuse — needs new architecture**: all four clustering methods
(`cluster_by_funding_source`, `cluster_by_behavior`, `detect_communities`,
`link_cross_chain`) are inherently **relative** — they detect sybils by
comparing addresses *against each other* within the submitted batch. A
batch of one address has no peers to compare against; `cluster_by_funding_
source` and `cluster_by_behavior` both require `min_cluster_size ≥ 2`
(post-TODO-307; today ≥3) members and will always return empty for `n=1`.
This is not a trimming problem, it's a structural mismatch — SybilShield's
strongest signals (the ones that produce `confidence: "high"` today) are
fundamentally batch-relative, and first-sight-by-definition has no batch.
Getting a *meaningful* cluster signal synchronously would require comparing
the incoming address against a **live rolling window** of recently-seen
first-sight addresses (e.g., everyone else who hit the same origin/claim
page in some recent window) — a genuinely new, stateful component (short-TTL
storage + its own merge/decay logic) with no analogue anywhere in the
current codebase. **This should not be attempted inside TODO-312** — it's
its own design problem (what window, what TTL, per-origin or global, does
it leak information across customers — the last question runs straight into
`SECURITY_NOTES.md`'s "do not aggregate uploaded lists across customers"
rule if not scoped very carefully). Flagging it here as explicitly
out-of-scope so TODO-312 doesn't silently grow into designing it un-reviewed.

**A constraint that isn't about the pipeline at all**: `apps/ml/sybilshield/
service.py` holds `AlchemyProvider` — and therefore its `RateLimiter` — as a
**single lazily-built process-level singleton** (`_pipeline` /
`get_pipeline()`). The 10 req/sec throttle that keeps the account within
its real Scale-tier ceiling only works because there is exactly **one**
process ever calling Alchemy today. If the synchronous fast path is stood
up as a separate service/process/replica (a reasonable instinct for
latency — a small dedicated endpoint rather than the same FastAPI process
running the batch worker's pipeline), it gets its **own** independent
`RateLimiter`, with no knowledge of the other process's concurrent usage —
both could run at 10 req/sec simultaneously, silently pushing the account
to 20 req/sec and into real Alchemy 429s that would break the batch worker
and the new endpoint at the same time (shared-fate degradation, discovered
in production, not in review). **Hard requirement for TODO-312**: either
implement the synchronous endpoint as a new route on the *same* long-running
`service.py` process (reusing `get_pipeline()`'s existing singleton and
limiter directly — the simplest correct option), or, if it must be a
separate process/service for latency/scaling reasons, replace the in-memory
`RateLimiter` with a distributed one (e.g. Redis-backed token bucket — the
stack already runs Redis for BullMQ, so the dependency isn't new) *before*
launch, not after the first concurrent-load incident.

## 5. Recommended scope for TODO-312 (phased, not all-at-once)

- **Phase 1 (buildable now, matches this note's findings)**: single chain,
  ingest + ML classifier only (no clustering), write-through cache to
  `address_scores`, `confidence: "low"` always (matches the existing engine
  exactly, no new decision code), per-origin + global-split rate limiting
  per §3, same-process reuse of the existing Alchemy provider singleton per
  §4's hard requirement. This alone answers "score an address nobody has
  submitted before" — honestly weaker than a full batch analysis (no
  structural corroboration), which the docs page should say as plainly as
  the MVP's docs page already states its own scope limit.
- **Phase 2 (separate design pass, not TODO-312)**: a live rolling-window
  comparison set to recover cluster-based signal for first-sight addresses.
  Needs its own privacy/scoping review before design even starts.

## Sources / grounding

All figures above are read directly from the repo, not assumed:
- `apps/ml/sybilshield/providers/alchemy.py` — real CU costs, `rps=10`
  limiter, process-singleton pattern.
- `apps/ml/sybilshield/service.py` — `_pipeline`/`get_pipeline()` singleton.
- `apps/api/src/middleware/auth.ts`, `apps/api/src/routes/analyses.ts` — the
  internal `maxCuPerAnalysis` proxy unit (distinct from real Alchemy CU).
- `apps/api/src/routes/resolve.ts` — the existing per-route RPC-backed
  rate-limit pattern (TODO-104) this design mirrors.
- `apps/web/public/widget.js`, `apps/api/src/routes/scoring.ts` — the MVP's
  existing cache-read path this design's write-through cache converges to.
- `apps/ml/sybilshield/pipeline.py`, `clustering/*.py` — confirms the
  batch-relative nature of the four clustering methods.
- `README.md`, `DEPLOY.md`, `.env.example` — Alchemy Scale tier, $199/mo.
