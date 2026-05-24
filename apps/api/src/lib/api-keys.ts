import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const API_KEY_BYTES = 24; // 24 bytes -> 32 base64url chars

export interface GeneratedApiKey {
  key: string; // full key shown to user once
  hash: string; // stored in DB
  prefix: string; // shown in UI ("sk_live_abc...")
}

export function generateApiKey(env: "live" | "test" = "live"): GeneratedApiKey {
  const raw = randomBytes(API_KEY_BYTES).toString("base64url");
  const key = `sk_${env}_${raw}`;
  return {
    key,
    hash: hashApiKey(key),
    prefix: `${key.slice(0, 12)}...`,
  };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function verifyApiKey(presented: string, storedHash: string): boolean {
  const presentedHash = hashApiKey(presented);
  const a = Buffer.from(presentedHash, "hex");
  const b = Buffer.from(storedHash, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
