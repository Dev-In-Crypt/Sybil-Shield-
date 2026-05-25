"use client";

import { useState } from "react";

interface Props {
  plan: "developer" | "growth" | "enterprise";
  priceUsd: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.sybilshield.org";

export function CryptoPayButton({ plan, priceUsd }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pay() {
    setErr(null);
    if (typeof window === "undefined") return;
    const key = window.localStorage.getItem("sybilshield_api_key");
    if (!key) {
      setErr("Sign up at /dashboard first (free, no card).");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${API_BASE}/v1/billing/checkout`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({ plan }),
      });
      const data = (await r.json()) as { checkout_url?: string; error?: string };
      if (!r.ok || !data.checkout_url) {
        setErr(data.error ?? `HTTP ${r.status}`);
        setBusy(false);
        return;
      }
      // Atlos hosted checkout — opens in same tab
      window.location.href = data.checkout_url;
    } catch (e) {
      setErr(String(e));
      setBusy(false);
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={pay}
        disabled={busy}
        className="w-full rounded bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
      >
        {busy ? "Opening checkout…" : `Pay $${priceUsd} in crypto`}
      </button>
      {err && <p className="mt-1 text-xs text-red-400">{err}</p>}
      <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-zinc-600">
        // USDT · USDC · ETH · BTC · Atlos
      </p>
    </div>
  );
}
