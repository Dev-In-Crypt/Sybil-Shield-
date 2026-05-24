/**
 * Outbound webhook delivery with HMAC-SHA256 signature.
 *
 * Customers configure `customer.webhook_url` and `customer.webhook_secret`.
 * On analysis completion we POST a JSON body and sign it - customers verify
 * with the shared secret (same pattern as Stripe).
 */
import { createHmac, randomBytes } from "node:crypto";

export interface WebhookEvent {
  type: string;
  analysisId: string;
  data: unknown;
}

export interface WebhookDeliveryResult {
  ok: boolean;
  status?: number;
  error?: string;
}

export function sign(body: string, secret: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

export async function deliverWebhook(
  url: string,
  secret: string,
  event: WebhookEvent,
  timeoutMs = 5_000,
): Promise<WebhookDeliveryResult> {
  const body = JSON.stringify(event);
  const signature = sign(body, secret);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-sybilshield-event": event.type,
        "x-sybilshield-signature": `sha256=${signature}`,
      },
      body,
      signal: controller.signal,
    });
    return { ok: r.ok, status: r.status };
  } catch (e) {
    return { ok: false, error: String(e) };
  } finally {
    clearTimeout(timer);
  }
}
