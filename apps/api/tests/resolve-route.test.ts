import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Mock the ENS service so the route is tested in isolation from viem/Alchemy —
// no real network call ever happens in this suite.
vi.mock("../src/services/ens.js", () => ({
  isConfigured: vi.fn(),
  resolveEnsName: vi.fn(),
}));

const ens = await import("../src/services/ens.js");
const { buildServer } = await import("../src/index.js");

describe("GET /v1/resolve/:name", () => {
  let app: Awaited<ReturnType<typeof buildServer>>;

  beforeAll(async () => {
    app = await buildServer();
    await app.ready();
  });

  afterEach(() => {
    vi.mocked(ens.isConfigured).mockReset();
    vi.mocked(ens.resolveEnsName).mockReset();
  });

  it("400s on a param that isn't a *.eth name", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/resolve/not-a-name" });
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_name");
  });

  it("503s when Alchemy isn't configured (dormant, same pattern as Atlos)", async () => {
    vi.mocked(ens.isConfigured).mockReturnValue(false);
    const res = await app.inject({ method: "GET", url: "/v1/resolve/vitalik.eth" });
    expect(res.statusCode).toBe(503);
    expect(res.json().error).toBe("ens_not_configured");
  });

  it("200s with the lowercased name + resolved address", async () => {
    vi.mocked(ens.isConfigured).mockReturnValue(true);
    vi.mocked(ens.resolveEnsName).mockResolvedValue("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
    const res = await app.inject({ method: "GET", url: "/v1/resolve/Vitalik.eth" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({
      name: "vitalik.eth",
      address: "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
    });
  });

  it("404s when the name resolves to no address", async () => {
    vi.mocked(ens.isConfigured).mockReturnValue(true);
    vi.mocked(ens.resolveEnsName).mockResolvedValue(null);
    const res = await app.inject({ method: "GET", url: "/v1/resolve/unregistered-xyz.eth" });
    expect(res.statusCode).toBe(404);
    expect(res.json().error).toBe("not_registered");
  });

  it("504s on ens_resolve_timeout", async () => {
    vi.mocked(ens.isConfigured).mockReturnValue(true);
    vi.mocked(ens.resolveEnsName).mockRejectedValue(new Error("ens_resolve_timeout"));
    const res = await app.inject({ method: "GET", url: "/v1/resolve/slow.eth" });
    expect(res.statusCode).toBe(504);
    expect(res.json().error).toBe("ens_resolve_timeout");
  });

  it("502s on any other resolution failure, never 500s", async () => {
    vi.mocked(ens.isConfigured).mockReturnValue(true);
    vi.mocked(ens.resolveEnsName).mockRejectedValue(new Error("boom"));
    const res = await app.inject({ method: "GET", url: "/v1/resolve/broken.eth" });
    expect(res.statusCode).toBe(502);
    expect(res.json().error).toBe("ens_resolve_failed");
  });

  it("rate-limits after 20 requests/min (abuse guard on the RPC-backed route)", async () => {
    vi.mocked(ens.isConfigured).mockReturnValue(true);
    vi.mocked(ens.resolveEnsName).mockResolvedValue("0xd8da6bf26964af9d7eed9e03e53415d37aa96045");
    let lastStatus = 200;
    for (let i = 0; i < 21; i++) {
      const res = await app.inject({ method: "GET", url: "/v1/resolve/rl-test.eth" });
      lastStatus = res.statusCode;
    }
    expect(lastStatus).toBe(429);
  });
});
