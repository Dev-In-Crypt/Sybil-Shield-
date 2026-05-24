/**
 * Atlos crypto checkout integration (non-custodial, 0% fees).
 *
 * Flow:
 *   1. Customer POSTs /v1/billing/checkout {plan}
 *   2. We POST to https://atlos.io/Invoice/Create with MerchantId + amount
 *   3. Atlos returns {Id, PaymentLink} → we return PaymentLink as checkout_url
 *   4. Customer pays USDT/USDC/ETH/BTC directly from their wallet
 *   5. Atlos POSTs postback to our /v1/billing/atlos-ipn with Signature header
 *   6. We verify HMAC-SHA256(rawBody, ATLOS_API_SECRET) → base64 → constant-time
 *      compare with Signature header → upgrade customer's plan
 *
 * Env vars:
 *   ATLOS_MERCHANT_ID  — from https://merchants.atlos.io/ Settings page
 *   ATLOS_API_SECRET   — from same page; treat like a password
 *
 * Docs: https://atlos.io/docs/api/invoice/create + /docs/postback/signature
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const ATLOS_BASE = "https://atlos.io";

export interface AtlosPriceConfig {
  amount_usd: number;
  description: string;
  plan_key: "developer" | "growth" | "enterprise";
}

export const PLAN_PRICES: Record<string, AtlosPriceConfig> = {
  developer: { amount_usd: 499, description: "SybilShield Developer plan (monthly)", plan_key: "developer" },
  growth: { amount_usd: 1499, description: "SybilShield Growth plan (monthly)", plan_key: "growth" },
  enterprise: { amount_usd: 4999, description: "SybilShield Enterprise plan (monthly)", plan_key: "enterprise" },
};

export function isConfigured(): boolean {
  return Boolean(process.env.ATLOS_MERCHANT_ID && process.env.ATLOS_API_SECRET);
}

export interface CreateInvoiceArgs {
  customerId: string;
  plan: keyof typeof PLAN_PRICES;
  successUrl: string;
  cancelUrl: string;
  userEmail?: string;
}

export interface AtlosInvoice {
  invoice_url: string;
  invoice_id: string;
  amount_usd: number;
}

export async function createInvoice(args: CreateInvoiceArgs): Promise<AtlosInvoice> {
  if (!isConfigured()) throw new Error("atlos_not_configured");
  const cfg = PLAN_PRICES[args.plan];
  if (!cfg) throw new Error(`unknown_plan:${args.plan}`);

  const orderId = `${args.customerId}:${args.plan}:${Date.now()}`;
  const body: Record<string, unknown> = {
    MerchantId: process.env.ATLOS_MERCHANT_ID,
    OrderId: orderId,
    OrderAmount: cfg.amount_usd,
    OrderCurrency: "USD",
    Memo: cfg.description,
    PostbackUrl: `${process.env.API_PUBLIC_URL ?? "http://localhost:3001"}/v1/billing/atlos-ipn`,
  };
  if (args.userEmail) body.UserEmail = args.userEmail;

  const r = await fetch(`${ATLOS_BASE}/Invoice/Create`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(`atlos_invoice_failed: ${r.status} ${text}`);
  }
  const data = (await r.json()) as { Id: string; PaymentLink: string };
  return {
    invoice_url: data.PaymentLink,
    invoice_id: String(data.Id),
    amount_usd: cfg.amount_usd,
  };
}

/**
 * Verify HMAC-SHA256(rawBody, API_SECRET) → base64 → matches `Signature` header.
 *
 * Pass the RAW request body (not parsed JSON) — Fastify's rawBody plugin
 * captures it before JSON-parsing.
 */
export function verifyPostbackSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
  const secret = process.env.ATLOS_API_SECRET;
  if (!secret) return false;
  if (!signatureHeader) return false;
  try {
    const expected = createHmac("sha256", secret).update(rawBody).digest("base64");
    const a = Buffer.from(expected);
    const b = Buffer.from(signatureHeader);
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface AtlosPostback {
  TransactionId: string;
  MerchantId: string;
  OrderId: string;
  Amount: number;
  Fee: string;
  Asset: string;
  Blockchain: string;
  BlockchainHash: string;
  UserWallet?: string;
  UserName?: string;
  UserEmail?: string;
  OrderAmount: number;
  OrderCurrency: string;
  PaidAmount: number;
  TimeSent: string;
  Status: number;
  SubscriptionId?: string;
}

/** Atlos sends postbacks only on confirmed payments — Status is always 100. */
export function isTerminalSuccess(status: number): boolean {
  return status === 100;
}

export function parseOrderId(orderId: string): { customerId: string; plan: string; ts: number } | null {
  const parts = orderId.split(":");
  if (parts.length !== 3) return null;
  const [customerId, plan, tsStr] = parts;
  const ts = Number(tsStr);
  if (!customerId || !plan || Number.isNaN(ts)) return null;
  return { customerId, plan, ts };
}
