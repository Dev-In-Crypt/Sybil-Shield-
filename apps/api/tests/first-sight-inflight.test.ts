import { beforeEach, describe, expect, it, vi } from "vitest";
import { _resetInFlightForTests, dedupeInFlight } from "../src/lib/first-sight-inflight.js";

describe("dedupeInFlight — concurrent-same-key de-duplication (TODO-327)", () => {
  beforeEach(() => {
    _resetInFlightForTests();
  });

  it("runs the work function only once for two truly concurrent calls with the same key", async () => {
    const work = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("result"), 20)),
    );

    const [a, b] = await Promise.all([dedupeInFlight("addr-1:ethereum", work), dedupeInFlight("addr-1:ethereum", work)]);

    expect(work).toHaveBeenCalledTimes(1);
    expect(a).toBe("result");
    expect(b).toBe("result");
  });

  it("runs the work function independently for different keys", async () => {
    const work = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve("result"), 10)),
    );

    await Promise.all([dedupeInFlight("addr-1:ethereum", work), dedupeInFlight("addr-2:ethereum", work)]);

    expect(work).toHaveBeenCalledTimes(2);
  });

  it("runs the work function again for a later, non-overlapping call with the same key", async () => {
    const work = vi.fn().mockResolvedValue("result");

    await dedupeInFlight("addr-1:ethereum", work);
    await dedupeInFlight("addr-1:ethereum", work);

    expect(work).toHaveBeenCalledTimes(2);
  });

  it("propagates a rejection to every concurrent waiter, then frees the key for a retry", async () => {
    const failing = vi.fn().mockRejectedValueOnce(new Error("boom"));

    const results = await Promise.allSettled([
      dedupeInFlight("addr-1:ethereum", failing),
      dedupeInFlight("addr-1:ethereum", failing),
    ]);
    expect(results[0]!.status).toBe("rejected");
    expect(results[1]!.status).toBe("rejected");
    expect(failing).toHaveBeenCalledTimes(1); // both waiters shared the one failed attempt

    const retry = vi.fn().mockResolvedValue("recovered");
    const result = await dedupeInFlight("addr-1:ethereum", retry);
    expect(result).toBe("recovered");
    expect(retry).toHaveBeenCalledTimes(1); // key was freed after the failure, not stuck
  });
});
