import { beforeEach, describe, expect, it } from "vitest";
import { _resetFirstSightBudgetForTests, checkGlobalFirstSightBudget } from "../src/lib/first-sight-throttle.js";

describe("checkGlobalFirstSightBudget — global reservation split (TODO-312)", () => {
  beforeEach(() => {
    _resetFirstSightBudgetForTests();
  });

  it("allows up to the per-window budget", () => {
    const now = 1_000_000;
    expect(checkGlobalFirstSightBudget(now)).toBe(true);
    expect(checkGlobalFirstSightBudget(now)).toBe(true);
  });

  it("rejects once the window's budget is spent", () => {
    const now = 2_000_000;
    checkGlobalFirstSightBudget(now);
    checkGlobalFirstSightBudget(now);
    expect(checkGlobalFirstSightBudget(now)).toBe(false);
  });

  it("frees up again once the window slides past 1000ms", () => {
    const t0 = 3_000_000;
    checkGlobalFirstSightBudget(t0);
    checkGlobalFirstSightBudget(t0);
    expect(checkGlobalFirstSightBudget(t0)).toBe(false);
    // A full second later, the earlier two calls have aged out.
    expect(checkGlobalFirstSightBudget(t0 + 1001)).toBe(true);
  });

  it("does not let a burst just under the window boundary double-spend", () => {
    const t0 = 4_000_000;
    checkGlobalFirstSightBudget(t0);
    checkGlobalFirstSightBudget(t0 + 500);
    // Still within the same 1000ms sliding window as the first call.
    expect(checkGlobalFirstSightBudget(t0 + 900)).toBe(false);
  });
});
