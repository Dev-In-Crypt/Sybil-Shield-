# Design note: a third "agent wallet" category (proof-of-personhood for AI agents)

TODO-323. Design only — no code in this note. No implementation task
exists yet (deliberately — see §5).

## 0. Why this note exists, and why it's shaped differently from TODO-307/311

TODO-307 (QF pairwise defense) and TODO-311 (real-time scoring) each had a
concrete, citable reference algorithm to ground the design in — Buterin's
pairwise-coordination formula, Alchemy's own CU pricing. This one doesn't.
Checked the one source the competitive-analysis review pointed to
(Human/Passport's own proof-of-personhood post) directly rather than
assuming it had a protocol to adapt: it names the problem —

> "As AI agents increasingly act on behalf of humans (browsing,
> transacting, voting), proof of personhood becomes the mechanism to
> verify that an AI agent has a real human principal."

— and asserts multi-signal verification helps, but supplies **no
delegation protocol, no agent-credential framework, no attestation
architecture, no concrete technical mechanism**. It explicitly frames this
as forward-looking, not established practice. That's a real, useful
finding on its own: **there is no existing reference algorithm to port**.
This note has to reason from first principles and from what SybilShield's
own pipeline already computes, not adapt someone else's published design.

## 1. The actual conflict, stated precisely

Checked the real feature code, not assumed: `apps/ml/sybilshield/
features/temporal.py` computes `hour_entropy`, `day_of_week_entropy`,
`burst_score`, `min_inter_tx_seconds`, and `activity_regularity` (lag-1
autocorrelation of inter-tx gaps — "high = mechanical regularity", per the
function's own docstring). These feed the exact evidence types
`apps/api/src/lib/presets.ts`'s `evidenceToCodes()` maps to
`scripted_timing`, `low_hour_entropy`, and `high_autocorrelation` — three
of the six detection methods on `/methodology`.

**A legitimate, human-authorized agent — a DCA bot, an automated
governance-voting agent, a scheduled yield-rebalancer — produces exactly
this signal profile.** Mechanical timing, low hour/day entropy, high
autocorrelation is not a farm-specific tell; it's what *any* scheduled
program looks like on-chain, benign or not. Today's pipeline has **no
feature that distinguishes "scripted because it's a sybil farm" from
"scripted because it's an authorized agent."** This is the real gap the
acceptance criteria asked about, confirmed against the actual code rather
than assumed from the framing.

## 2. What could actually distinguish them

Reasoned from what's structurally available, since no reference algorithm
exists to cite:

**a. Account type (contract vs. EOA) — the cleanest signal, and currently
not computed anywhere.** AI-agent wallets are typically deployed as smart
contracts (ERC-4337 account-abstraction wallets, session-key delegates,
agent-framework deployments), not plain EOAs. Checked for an existing
signal before proposing a new one: there isn't one.
`apps/ml/sybilshield/types.py`'s `RawAddressData` has no account-type
field at all, and `apps/ml/sybilshield/features/funding.py` already has a
**dead stub** for the adjacent case — `"funding_source_is_contract":
False,  # would require code-at-address check` — the funder's contract
status is hardcoded `False` and never actually computed. Same missing
capability (an `eth_getCode` call) would be needed for the *target*
address's own account type. Real, quantifiable new ingestion cost — one
more Alchemy call per address, same class of tradeoff TODO-311's design
note already had to reason about for a different endpoint.

**b. Delegation/authorization signal.** ERC-4337 UserOperation
sender/paymaster patterns, or a Safe module/session-key grant event, can
show a human-owned wallet explicitly authorizing a scoped agent contract
on-chain. Checkable in principle, but protocol-specific (Safe vs. ZeroDev
vs. Biconomy vs. whatever a given agent framework uses) — no single
universal event shape, meaningfully higher engineering cost than (a), and
would need its own survey of what's actually out there before committing
to specific event signatures.

**c. Funding provenance — reuses existing machinery, doesn't need new
ingestion.** This is the strongest near-term option. `funding_cluster.py`
already measures whether an address's funder is shared with many other
addresses in the batch, at what confidence, over what time window. A
single legitimate agent funded by one identifiable human wallet looks
structurally different from a farm of "agent" wallets fanned out from one
funder — **even when both show identical mechanical-timing features**.
Funding-cluster membership and temporal-mechanical-timing are already two
independent signals the pipeline computes for every address today; this
is a matter of correlating them for a new purpose, not building a new
extractor. Concretely: `scripted_timing`/`low_hour_entropy` evidence
**without** a corresponding `shared_funder_cluster`/`cluster_size_ge_N`
signal is a materially different case than the same timing evidence
**with** one — the first looks like a single automated agent, the second
looks like a farm of them, automated or not.

## 3. Where labeled ground truth would come from

No existing label tier fits. `apps/ml/sybilshield/data/curate.py`'s
`TIER_CONFIDENCE`/`TIER_WEIGHT` cover T1-T5 (sybil) and G1-G2 (genuine) —
nothing for "legitimate agent." Candidate sources, none currently wired
up, ranked by how much confidence each actually carries:

- **Known agent-framework deployer/factory addresses** (Safe, ZeroDev,
  Biconomy, and similar account-abstraction factories, or a specific
  agent framework's known deployer) — wallets created from a public
  factory address are structurally agent-shaped by construction. Weak
  positive signal (a factory doesn't prove *legitimate*, just *agent*),
  roughly T4/T5-equivalent confidence.
- **Self-declared agent registries** — don't appear to exist at any real
  scale yet; the source article itself frames this space as
  forward-looking. Not usable today, worth re-checking periodically.
- **Small hand-curated sample** — a handful of publicly disclosed,
  identifiable agent bots (known MEV bots, disclosed automated
  market-making or DCA contracts), the same bootstrapping method T1/T2
  originally used. Small N, same "n= published alongside every metric"
  honesty discipline `/benchmark` (TODO-321) already applies to the
  existing tiers.

## 4. Does this need a 3rd decision branch, or a separate preset?

**Neither, on the evidence available.** DROP/REVIEW/KEEP answers "is this
wallet part of a coordinated sybil operation" — a question that's
**orthogonal** to "is this wallet an agent." An agent wallet can *also* be
a farm (500 identical bot-agent deployments from one operator is exactly
the sybil pattern this product already exists to catch); a single
legitimate agent is not automatically safe just because it's
authorized. "Agent" isn't a 4th outcome sitting next to DROP/REVIEW/KEEP —
it fits the existing model better as:

- **A new evidence type** (e.g. `agent_pattern_detected`, contract-deployed
  + mechanical timing + no shared-funder cluster) feeding the existing
  rationale-code pipeline, the same way `thin_account` or
  `shared_funding_weak` are additional evidence rather than new decision
  states, **or**
- **A per-preset modifier**: when mechanical-timing evidence co-occurs
  with agent-shaped account type AND no funding-cluster membership,
  treat that evidence as weaker / non-disqualifying for DROP specifically
  — closer to how known-exchange funders are already excluded from the
  funding clusterer as baseline noise, not sybil signal.

Either way, this needs a real product decision once ground truth exists,
not a speculative implementation now — flagged here rather than decided,
matching the discipline TODO-307/311 already used.

## 5. Explicit non-goals for now

- Building any of the above. No implementation task is created from this
  note yet — unlike TODO-307→310 and TODO-311→312, there's no design
  decision solid enough to hand to an implementation task. §3's ground
  truth problem is the actual blocker: there is nothing to train or
  threshold-tune against yet.
- Adding the `eth_getCode` ingestion call. Real, quantifiable new cost
  (same class as TODO-311's CU analysis) — worth doing only once (a) is
  chosen as the path forward, not speculatively.
- Any claim that SybilShield can currently tell agents from farms. It
  can't — that's the entire finding of this note.

## Sources

- [Proof of Personhood, Explained — Human/Passport blog](https://passport.human.tech/blog/proof-of-personhood-explained-how-it-works-who-s-building-it-and-why-it-matters-now) — fetched directly (2026-07-22); confirms the problem is real and named, and that no concrete technical mechanism is published anywhere yet.
- `apps/ml/sybilshield/features/temporal.py` — the mechanical-timing features that create the actual conflict (§1).
- `apps/ml/sybilshield/features/funding.py` — the existing `funding_source_is_contract` stub, evidence the contract-detection gap was already identified once, for a different field (§2a).
- `apps/ml/sybilshield/data/curate.py` — the real label-tier system, confirming no existing tier fits "legitimate agent" (§3).
