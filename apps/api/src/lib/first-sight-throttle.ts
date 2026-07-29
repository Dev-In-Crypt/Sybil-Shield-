/**
 * Global throughput reservation for the first-sight synchronous scoring
 * endpoint (TODO-312 Phase 1) — separate from the per-origin rate limit on
 * the route itself.
 *
 * Why this exists: the whole Alchemy account has a real ceiling of ~5
 * address-chain-ingests/sec (docs/design/realtime-first-sight-scoring.md
 * §1 — derived from Scale tier's 1500 CU/sec ÷ 300 CU/address-chain),
 * shared with the existing batch worker. A per-origin cap alone doesn't
 * protect that shared ceiling — many DIFFERENT origins hammering this
 * endpoint simultaneously could still starve batch-analysis customers who
 * never touched this endpoint. This reserves a fixed fraction of the
 * account's throughput for first-sight specifically, independent of how
 * many distinct origins are calling it.
 *
 * Deliberately a simple in-memory sliding window, not Redis-backed — this
 * endpoint is scoped to run in the same API process (no horizontal
 * scale-out assumed yet); if that changes, this needs to move to Redis,
 * the same way the design note flags for the Alchemy-side limiter.
 */

const WINDOW_MS = 1000;
// Half of the ~5/sec account ceiling, leaving the other half for the
// existing batch worker — a starting point per the design note's own
// "needs its own tuning pass once real usage exists" caveat, not a
// number derived from real traffic (none exists yet).
const MAX_PER_WINDOW = 2;

const timestamps: number[] = [];

/**
 * Returns true if a first-sight ingest may proceed right now, and records
 * it as consumed. Returns false (caller should 429) if the global budget
 * for this window is already spent.
 */
export function checkGlobalFirstSightBudget(now: number = Date.now()): boolean {
  while (timestamps.length > 0 && now - timestamps[0]! > WINDOW_MS) {
    timestamps.shift();
  }
  if (timestamps.length >= MAX_PER_WINDOW) {
    return false;
  }
  timestamps.push(now);
  return true;
}

/** Test-only: reset state between test cases. */
export function _resetFirstSightBudgetForTests(): void {
  timestamps.length = 0;
}
