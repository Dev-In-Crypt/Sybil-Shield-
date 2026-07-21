# Design note: QF pairwise-coordinated-funding defense for the `grant` preset

TODO-307. Design only — no code in this note. Implementation is TODO-310.

## 1. What "pairwise-coordinated funding" means, precisely

Grounded in the actual reference mechanism, not assumed from the name:

- **Reference algorithm**: Buterin's "Pairwise Coordination Subsidies" design
  (the one Gitcoin's own engineering blog cites as the origin of its
  "Pairwise Funding" mechanism) —
  <https://ethresear.ch/t/pairwise-coordination-subsidies-a-new-quadratic-funding-design/5553>.
  Verified live, not from memory (fetched 2026-07-21; Gitcoin's blog post
  "How to Attack and Defend Quadratic Funding" itself just summarizes and
  links out to this as "the details").
- **The formula**: for a project `p`, the quadratic-funding matching subsidy
  is `Subsidy(p) = Σ_{i<j} k_{i,j} · 2·√(c_{i→p})·√(c_{j→p})` — a discount
  `k_{i,j} ∈ [0,1]` applied to every *pair* of contributors' cross-term in
  the QF sum, not a single global adjustment.
- **`k_{i,j} = M / (M + T_{i,j})`**, where `T_{i,j} = Σ_p √(c_{i→p})·√(c_{j→p})`
  — i.e. the more two contributors' donation patterns overlap **across the
  whole round** (same grants, similar amounts), the lower their `k_{i,j}`
  and the smaller the matching boost their pair generates. `M` is a tunable
  sensitivity constant.
- **The refinement that matters most here**: the proposal itself suggests
  `M_{i,j} = M_i · M_j`, where `M_i` is "based on a measurement of how
  certain we are that some given agent actually is a unique individual."
  This is the exact slot an external Sybil-detection signal is meant to fill
  — and it's the one SybilShield can actually contribute to.

**So "pairwise-coordinated funding" in SybilShield's terms = a specific pair
of addresses in a submitted `grant`-preset analysis batch that SybilShield's
existing clustering evidence indicates are very likely beneficially
controlled by the same entity** (shared non-exchange funding origin and/or
behavioral/graph link with sufficient confidence) — **not** an on-platform
donation-pattern-overlap signal, because SybilShield doesn't have that data.

## 2. Why this is not a blind port (the scope boundary)

Gitcoin's own `T_{i,j}` is computed from **contribution amounts to specific
projects within a QF round** — data SybilShield never sees. SybilShield
ingests wallet-level on-chain history (funding source, tx behavior, cluster
membership) via `apps/ml/sybilshield/ingest.py`, not a QF platform's
donation ledger. Reimplementing `T_{i,j}` verbatim is not possible with the
data this product has, and pretending otherwise would be exactly the "blind
port" the TODO calls out.

What SybilShield *can* do, and what's genuinely complementary rather than
redundant: contribute the `M_i` half of the refined formula — a per-address
"confidence this is a unique, independently-controlled wallet" — derived
from **wallet provenance**, which is orthogonal to **on-platform donation
behavior**. A pair of wallets that split their support across *different*
grants specifically to avoid triggering Gitcoin's own donation-overlap-based
`T_{i,j}` would still share a funding origin or behavioral fingerprint that
SybilShield's existing clusterers can see. This is a real gap in the
donation-pattern-only approach — Gitcoin's and BlockScience's own writeups
note colluders already adapt to evade detection, and cite Passport/COCM as
still only mitigating, not eliminating, the risk
(<https://www.gitcoin.co/blog/how-to-attack-and-defend-quadratic-funding>,
<https://www.gitcoin.co/blog/wtf-is-cluster-matching-qf>).

**Explicit non-goal**: SybilShield will not compute `Subsidy(p)` itself. That
needs contribution amounts + project/round IDs — a new ingestion surface
this product doesn't have and that a QF round's own matching software
(Gitcoin Grants Stack, clr.fund, Octant, etc.) already owns. SybilShield's
job stays a pre-round screening signal (which is what the `grant` preset
already is), exported in a shape a QF operator's own pairwise math can
consume as `M_i` / a direct `k_{i,j}` override — not a QF engine itself.

## 3. The concrete gap in the current pipeline

Checked the actual clustering code, not assumed:

- `apps/ml/sybilshield/clustering/funding_cluster.py` and
  `behavior_cluster.py` both default `min_cluster_size: int = 3`. **A pair
  of exactly 2 addresses never forms a cluster today** — `cluster_size` for
  two colluding wallets is invisible to the pipeline entirely, they don't
  even reach `cluster_size_gte` evaluation.
- The minimum wallet count for a QF pairwise attack to be profitable is
  **2** (splitting one $100 contribution into two $50s already beats
  `√100` with `√50+√50`, before any matching formula is even applied — the
  attack Gitcoin's own "how to attack" post opens with). The `grant`
  preset's thresholds (`review.cluster_size_gte: 5`, `drop.cluster_size_gte:
  20` — `apps/api/src/lib/presets.ts`) were deliberately raised 5-10× during
  the pre-pilot calibration specifically to kill CEX-funding false positives
  (documented in `presets.ts`'s own calibration-history comment) — a correct
  call for the general cluster-size signal, but it means the *minimum
  viable* QF collusion size sits entirely below today's noise floor for this
  preset.

This is the real, specific target: not "make clusters trigger more," but
add a **separate, smaller-granularity signal** that doesn't touch the
existing 5/20 calibration.

## 4. The signal to compute

A new pairwise pass, **scoped to the `grant` preset only** (the other
presets' calibration stays untouched — this is not a global
`min_cluster_size` change):

- Reuse the existing `cluster_by_funding_source` / `cluster_by_behavior` /
  graph-community / cross-chain clusterers, called with `min_cluster_size=2`
  for `grant`-preset analyses specifically (all four already exclude known
  exchanges via `KNOWN_EXCHANGES` before clustering — the CEX false-positive
  class that drove the 5/10/20/30/50 calibration doesn't reappear at
  pair-level either, since that filter runs upstream of cluster formation).
- Confidence proxy for `k_{i,j}`: reuse `funding_cluster.py`'s existing
  temporal-spread tiers (`<24h → 0.95`, `<7d → 0.80`, `else → 0.60`) as the
  per-pair coordination-strength estimate. Add one **corroboration bump**:
  if the same pair co-occurs in `merge_clusters()`'s `address_to_clusters`
  map across ≥2 distinct methods (e.g. shared funder *and* a behavioral or
  graph link), that's a materially stronger signal than either alone — mirror
  the existing "multiple rationale codes ⇒ higher decision confidence"
  pattern already in `computeDecision()` rather than inventing a new
  confidence model.
- Only pairs at confidence **≥ 0.80** (i.e. `<7d` temporal spread or
  better, matching the existing tier boundary already calibrated in
  `funding_cluster.py`) count as a signal — same conservative bias the
  existing preset calibration already uses, applied at the new size-2/3/4
  granularity instead of loosened globally.

## 5. How it plugs into the existing evidence/rationale-code model

No new model, no new architecture — extends the existing pattern exactly:

- **New evidence type** `pairwise_funding_link` (parallel to the existing
  `shared_funding` / `shared_funding_weak` types the ML side already emits).
- **New rationale code** `qf_pairwise_coordinated_pair`, added to
  `evidenceToCodes()` in `apps/api/src/lib/presets.ts` (and its Python
  mirror) exactly like the existing `shared_funding → shared_funder_cluster`
  mapping — one new `case`, not a new function.
- **New REVIEW-tier OR-condition, `grant` preset only**: `has_code(
  "qf_pairwise_coordinated_pair")` at confidence ≥ 0.80 → `REVIEW`,
  `confidence: "medium"` (same confidence tier `computeDecision()` already
  assigns when exactly one rule fires). This is an **additive** OR-branch
  next to the existing `score_gte` / `cluster_size_gte` checks in
  `resolveConfig("grant")` — the existing 5/20 thresholds and their
  calibration history are untouched.
- **Response shape**: for `grant`-preset analyses, add a `pairwise_links:
  [{ address, shared_signal, confidence }]` array alongside the existing
  per-address evidence in the results response — the shape a downstream QF
  operator would actually consume as an `M_i` input, or just use
  SybilShield's own REVIEW verdict directly as a pre-round screening gate
  (the `grant` preset's existing, already-shipped use case).

## 6. What's explicitly out of scope (for TODO-310 and beyond)

- Computing the discounted `Subsidy(p)` itself — needs contribution
  amounts + project/round IDs SybilShield doesn't ingest.
- Any cross-customer / cross-round pairwise history — would mean
  aggregating uploaded address lists across customers, directly against
  `SECURITY_NOTES.md`'s tenant-isolation rule. Each analysis's pairwise
  signal stays scoped to that one submitted batch, same as every other
  cluster type today.
- Loosening `min_cluster_size` for any preset other than `grant`.

## Sources

- [Pairwise-coordination subsidies: a new quadratic funding design](https://ethresear.ch/t/pairwise-coordination-subsidies-a-new-quadratic-funding-design/5553) — the actual formula (§1).
- [How to Attack and Defend Quadratic Funding — Gitcoin Blog](https://www.gitcoin.co/blog/how-to-attack-and-defend-quadratic-funding) — Gitcoin's own framing of the pairwise mechanism + its cited limitation.
- [WTF is Cluster-Matching QF? — Gitcoin Blog](https://www.gitcoin.co/blog/wtf-is-cluster-matching-qf) — COCM/cluster-matching, confirms it's donation-pattern-based, not wallet-provenance-based (why SybilShield's signal is complementary, not redundant).
