/**
 * ENS name resolution — server-side only, via Alchemy's mainnet RPC. Mirrors
 * the `isConfigured()` "dormant until env is set" pattern used in
 * services/atlos.ts: without ALCHEMY_API_KEY the feature is off (503), not
 * broken. ENS is Ethereum-mainnet only (TODO-104 note) — a name registered
 * only on an L2 name service is out of scope.
 *
 * The Alchemy key is never sent to the browser: the web app calls our
 * GET /v1/resolve/:name, which calls Alchemy from here (SECURITY_NOTES.md —
 * "Alchemy key is server-side only").
 */
import { createPublicClient, http, type PublicClient } from "viem";
import { mainnet } from "viem/chains";
import { normalize } from "viem/ens";

const RESOLVE_TIMEOUT_MS = 5_000;

export function isConfigured(): boolean {
  return Boolean(process.env.ALCHEMY_API_KEY);
}

let _client: PublicClient | null = null;

/** Lazily build the mainnet client so tests can run with no env configured. */
function getClient(): PublicClient {
  if (_client) return _client;
  const key = process.env.ALCHEMY_API_KEY;
  if (!key) throw new Error("ens_not_configured");
  _client = createPublicClient({
    chain: mainnet,
    transport: http(`https://eth-mainnet.g.alchemy.com/v2/${key}`),
  });
  return _client;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error("ens_resolve_timeout")), ms)),
  ]);
}

/**
 * Resolve a single ENS name to a lowercased address, or null if the name has
 * no address record. Throws `ens_not_configured` if ALCHEMY_API_KEY is unset,
 * or `ens_resolve_timeout` / the underlying RPC error on failure — the route
 * layer maps these to HTTP status codes so a bad name never 500s the caller.
 */
export async function resolveEnsName(name: string): Promise<string | null> {
  const client = getClient();
  const normalized = normalize(name);
  const address = await withTimeout(
    client.getEnsAddress({ name: normalized }),
    RESOLVE_TIMEOUT_MS,
  );
  return address ? address.toLowerCase() : null;
}

/** Test-only hook to inject a fake client instead of a real Alchemy call. */
export function __setClientForTest(client: PublicClient | null): void {
  _client = client;
}
