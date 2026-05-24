import { describe, expect, it } from "vitest";
import { generateApiKey, hashApiKey, verifyApiKey } from "../src/lib/api-keys.js";

describe("api-keys", () => {
  it("generates a key with sk_live_ prefix", () => {
    const k = generateApiKey("live");
    expect(k.key.startsWith("sk_live_")).toBe(true);
    expect(k.key.length).toBeGreaterThan(20);
    expect(k.prefix.endsWith("...")).toBe(true);
  });

  it("hashes deterministically", () => {
    const k = generateApiKey();
    expect(hashApiKey(k.key)).toBe(k.hash);
    expect(hashApiKey(k.key)).toBe(hashApiKey(k.key));
  });

  it("verifies the matching key", () => {
    const k = generateApiKey();
    expect(verifyApiKey(k.key, k.hash)).toBe(true);
  });

  it("rejects a tampered key", () => {
    const k = generateApiKey();
    expect(verifyApiKey(k.key + "x", k.hash)).toBe(false);
    expect(verifyApiKey("sk_live_bogus", k.hash)).toBe(false);
  });

  it("two generated keys differ", () => {
    const a = generateApiKey();
    const b = generateApiKey();
    expect(a.key).not.toBe(b.key);
    expect(a.hash).not.toBe(b.hash);
  });
});
