import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import SybilShieldValidation from "../strategy/index.js";

const AUTHOR = "0xd8da6bf26964af9d7eed9e03e53415d37aa96045";

function mockFetchOnce(status: number, body: unknown): void {
  global.fetch = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    statusText: "mocked",
    json: async () => body,
  }) as unknown as typeof fetch;
}

function makeValidation(params: Record<string, unknown> = {}) {
  return new SybilShieldValidation(AUTHOR, "test.eth", "1", "latest", params);
}

describe("SybilShield Snapshot validation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("DROP decision -> invalid", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 90, decision: "DROP" });
    await expect(makeValidation().validate()).resolves.toBe(false);
  });

  it("KEEP decision -> valid", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 5, decision: "KEEP" });
    await expect(makeValidation().validate()).resolves.toBe(true);
  });

  it("REVIEW decision -> valid by default (blockReview: false)", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 60, decision: "REVIEW" });
    await expect(makeValidation().validate()).resolves.toBe(true);
  });

  it("REVIEW decision -> invalid when blockReview is true", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 60, decision: "REVIEW" });
    await expect(makeValidation({ blockReview: true }).validate()).resolves.toBe(false);
  });

  it("no decision on record -> falls back to sybil_score < scoreThreshold", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 30, decision: null });
    await expect(makeValidation({ scoreThreshold: 70 }).validate()).resolves.toBe(true);

    mockFetchOnce(200, { address: AUTHOR, sybil_score: 85, decision: null });
    await expect(makeValidation({ scoreThreshold: 70 }).validate()).resolves.toBe(false);
  });

  it("no decision on record uses the default scoreThreshold (70) when unset", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 69, decision: null });
    await expect(makeValidation().validate()).resolves.toBe(true);

    mockFetchOnce(200, { address: AUTHOR, sybil_score: 71, decision: null });
    await expect(makeValidation().validate()).resolves.toBe(false);
  });

  it("404 (never analyzed) -> valid by default (unscoredIsValid: true)", async () => {
    mockFetchOnce(404, { error: "not_scored" });
    await expect(makeValidation().validate()).resolves.toBe(true);
  });

  it("404 (never analyzed) -> invalid when unscoredIsValid is false", async () => {
    mockFetchOnce(404, { error: "not_scored" });
    await expect(makeValidation({ unscoredIsValid: false }).validate()).resolves.toBe(false);
  });

  it("throws on an unexpected API error rather than defaulting either way", async () => {
    mockFetchOnce(500, { error: "internal" });
    await expect(makeValidation().validate()).rejects.toThrow(/SybilShield lookup failed/);
  });

  it("rejects a malformed author address before ever calling the API", async () => {
    global.fetch = vi.fn();
    const v = new SybilShieldValidation("not-an-address", "test.eth", "1", "latest", {});
    await expect(v.validate()).resolves.toBe(false);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("respects a custom apiUrl override (self-host support)", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 0, decision: "KEEP" });
    await makeValidation({ apiUrl: "http://localhost:3001" }).validate();
    expect(global.fetch).toHaveBeenCalledWith(`http://localhost:3001/v1/score/${AUTHOR}`);
  });

  it("strips a trailing slash from a custom apiUrl", async () => {
    mockFetchOnce(200, { address: AUTHOR, sybil_score: 0, decision: "KEEP" });
    await makeValidation({ apiUrl: "http://localhost:3001/" }).validate();
    expect(global.fetch).toHaveBeenCalledWith(`http://localhost:3001/v1/score/${AUTHOR}`);
  });
});
