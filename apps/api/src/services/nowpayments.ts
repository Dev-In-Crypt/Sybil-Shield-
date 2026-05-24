/**
 * NowPayments crypto checkout integration.
 *
 * Flow:
 * 1. Customer hits POST /v1/billing/checkout with { plan: "growth" }
 * 2. We create a NowPayments invoice via their API
 * 3. We return their checkout URL
 * 4. Customer pays in USDT/USDC/ETH/BTC on NowPayments hosted page
 * 5. NowPayments POSTs to our IPN endpoint when payment confirms
 * 6. We verify HMAC signature and upgrade the customer's plan
 *
 * Env vars (set when activating):
 *   NOWPAYMENTS_API_KEY     — get from https://account.nowpayments.io/
 *   NOWPAYMENTS_IPN_SECRET  — set in NowPayments dashboard, must match here
 *   NOWPAYMENTS_BASE_URL    — default: https://api.nowpayments.io/v1
 *
 * Until those are set, the service is in "disabled" mode and all endpoints
 * return 503 with a "billing_disabled" error.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const BASE = process.env.NOWPAYMENTS_BASE_URL ?? "https://api.nowpayments.io/v1";

export interface NPPriceConfig {
  amount_usd: number;
  description: string;
  plan_key: "developer" | "growth" | "enterprise";
}

export const PLAN_PRICES: Record<string, NPPriceConfig> = {
  developer: { amount_usd: 499, description: "SybilShield Developer plan (monthly)", plan_key: "developer" },
  growth: { amount_usd: 1499, description: "SybilShield Growth plan (monthly)", plan_key: "growth" },
  enterprise: { amount_usd: 4999, description: "SybilShield Enterprise plan (monthly)", plan_key: "enterprise" },
};

export function isConfigured(): boolean {
  return Boolean(process.env.NOWPAYMENTS_API_KEY && process.env.NOWPAYMENTS_IPN_SECRET);
}

export interface CreateInvoiceArgs {
  customerId: string;
  plan: keyof typeof PLAN_PRICES;
  successUrl: string;
  cancelUrl: string;
}

export interface NPInvoice {
  invoice_url: string;
  invoice_id: string;
  amount_usd: number;
}

export async function createInvoice(args: CreateInvoiceArgs): Promise<NPInvoice> {
  if (!isConfigured()) throw new Error("nowpayments_not_configured");
  const cfg = PLAN_PRICES[args.plan];
  if (!cfg) throw new Error(`unknown_plan:${args.plan}`);

  const body = {
    price_amount: cfg.amount_usd,
    price_currency: "usd",
    pay_currency: "usdtbsc",
    order_id: `${args.customerId}:${args.plan}:${Date.now()}`,
    order_description: cfg.description,
    ipn_callback_url: `${process.env.API_PUBLIC_URL ?? "http://localhost:3001"}/v1/billing/ipn`,
    success_url: args.successUrl,
    cancel_url: args.cancelUrl,
    is_fee_paid_by_user: false,
  };

  const r = await fetch(`${BASE}/invoice`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.NOWPAYMENTS_API_KEY!,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`nowpayments_invoice_failed: ${r.status} ${text}`);
  }
  const data = (await r.json()) as { invoice_url: string; id: string };
  return {
    invoice_url: data.invoice_url,
    invoice_id: String(data.id),
    amount_usd: cfg.amount_usd,
  };
}

/**
 * Verify HMAC-SHA512 signature of an incoming IPN payload.
 * NowPayments concatenates the JSON body sorted by key, then HMAC-SHA512.
 */
export function verifyIpnSignature(rawBody: string, signatureHeader: string): boolean {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret) return false;
  try {
    const parsed = JSON.parse(rawBody);
    const sortedKeys = Object.keys(parsed).sort();
    const ordered: Record<string, unknown> = {};
    for (const k of sortedKeys) ordered[k] = parsed[k];
    const message = JSON.stringify(ordered);
    const expected = createHmac("sha512", secret).update(message).digest("hex");
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signatureHeader, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface IpnPayload {
  payment_id: string;
  payment_status: "waiting" | "confirming" | "confirmed" | "sending" | "partially_paid" | "finished" | "failed" | "refunded" | "expired";
  order_id: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  actually_paid: number;
}

export function isTerminalSuccess(status: IpnPayload["payment_status"]): boolean {
  return status === "finished";
}

export function parseOrderId(orderId: string): { customerId: string; plan: string; ts: number } | null {
  const parts = orderId.split(":");
  if (parts.length !== 3) return null;
  const [customerId, plan, tsStr] = parts;
  const ts = Number(tsStr);
  if (!customerId || !plan || Number.isNaN(ts)) return null;
  return { customerId, plan, ts };
}
