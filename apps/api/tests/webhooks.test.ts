import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { generateWebhookSecret, sign } from "../src/services/webhooks.js";

describe("webhooks", () => {
  it("generates a secret with whsec_ prefix", () => {
    const s = generateWebhookSecret();
    expect(s.startsWith("whsec_")).toBe(true);
    expect(s.length).toBeGreaterThan(20);
  });

  it("sign produces SHA-256 HMAC hex", () => {
    const sig = sign(`{"hello":"world"}`, "secret123");
    const expected = createHmac("sha256", "secret123").update(`{"hello":"world"}`).digest("hex");
    expect(sig).toBe(expected);
  });

  it("same body+secret yields same signature (deterministic)", () => {
    expect(sign("a", "k")).toBe(sign("a", "k"));
    expect(sign("a", "k")).not.toBe(sign("a", "k2"));
    expect(sign("a", "k")).not.toBe(sign("b", "k"));
  });
});
