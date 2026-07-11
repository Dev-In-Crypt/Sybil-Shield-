import type { PublicClient } from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { __setClientForTest, isConfigured, resolveEnsName } from "../src/services/ens.js";

const ORIGINAL_KEY = process.env.ALCHEMY_API_KEY;

afterEach(() => {
  __setClientForTest(null);
  if (ORIGINAL_KEY === undefined) delete process.env.ALCHEMY_API_KEY;
  else process.env.ALCHEMY_API_KEY = ORIGINAL_KEY;
  vi.useRealTimers();
});

function fakeClient(getEnsAddress: (args: { name: string }) => Promise<string | null>): PublicClient {
  return { getEnsAddress } as unknown as PublicClient;
}

describe("ens.isConfigured", () => {
  it("reflects whether ALCHEMY_API_KEY is set", () => {
    delete process.env.ALCHEMY_API_KEY;
    expect(isConfigured()).toBe(false);
    process.env.ALCHEMY_API_KEY = "test-key";
    expect(isConfigured()).toBe(true);
  });
});

describe("ens.resolveEnsName", () => {
  it("lowercases a resolved address", async () => {
    __setClientForTest(fakeClient(async () => "0xAbCdEf0000000000000000000000000000000123"));
    const address = await resolveEnsName("vitalik.eth");
    expect(address).toBe("0xabcdef0000000000000000000000000000000123");
  });

  it("returns null when the name has no address record", async () => {
    __setClientForTest(fakeClient(async () => null));
    const address = await resolveEnsName("unregistered-name-xyz.eth");
    expect(address).toBeNull();
  });

  it("throws ens_not_configured when no client is injected and the env key is unset", async () => {
    delete process.env.ALCHEMY_API_KEY;
    __setClientForTest(null);
    await expect(resolveEnsName("anything.eth")).rejects.toThrow("ens_not_configured");
  });

  it("rejects with ens_resolve_timeout when the RPC call hangs", async () => {
    vi.useFakeTimers();
    __setClientForTest(fakeClient(() => new Promise(() => {})));
    const promise = resolveEnsName("stuck.eth");
    const assertion = expect(promise).rejects.toThrow("ens_resolve_timeout");
    await vi.advanceTimersByTimeAsync(5_000);
    await assertion;
  });
});
