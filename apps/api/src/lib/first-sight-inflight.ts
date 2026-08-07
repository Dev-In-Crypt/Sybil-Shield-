/**
 * De-duplicates concurrent first-sight requests for the same address+chain
 * within this process (TODO-327). TODO-325's load test found that
 * `routes/first-sight.ts`'s write-through cache check (a SELECT) and its
 * eventual persist (an INSERT) aren't atomic with each other — two truly
 * concurrent requests for the same never-before-scored address could both
 * pass the cache-miss check before either finished writing back, so both
 * proceeded through a real ML/Alchemy ingestion call instead of one.
 *
 * Same in-memory, single-process tradeoff as first-sight-throttle.ts (not
 * Redis-backed) — doesn't protect against the race across multiple API
 * processes/instances, only within one. Accepted for the same reason the
 * throttle itself accepts it: this is a prototype-tier endpoint, not
 * horizontally scaled yet.
 */

const inFlight = new Map<string, Promise<unknown>>();

/**
 * Runs `work` for `key`, but a concurrent call for the SAME key reuses the
 * already-in-flight call's result instead of starting a second one. Once
 * `work` settles (resolves or rejects), the key is freed so the next call
 * for that key starts a fresh run.
 */
export async function dedupeInFlight<T>(key: string, work: () => Promise<T>): Promise<T> {
  const existing = inFlight.get(key);
  if (existing) {
    return existing as Promise<T>;
  }
  const promise = work().finally(() => {
    inFlight.delete(key);
  });
  inFlight.set(key, promise);
  return promise;
}

/** Test-only: reset state between test cases. */
export function _resetInFlightForTests(): void {
  inFlight.clear();
}
