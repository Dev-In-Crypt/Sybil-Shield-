"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";

interface Account {
  plan: string;
  usage: { calls_this_month: number; limit: number };
}

export default function BillingPage() {
  const [apiKey, setApiKey] = useState("");
  const [acc, setAcc] = useState<Account | null>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem("sybilshield_api_key") ?? "");
  }, []);
  useEffect(() => {
    if (!apiKey) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/account`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => r.json())
      .then(setAcc)
      .catch(() => {});
  }, [apiKey]);

  return (
    <main>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold">Billing</h1>
        <StatusBadge status="beta" />
      </div>
      <p className="mt-3 text-zinc-400">
        Usage tracking is live. Checkout flow ships with crypto payments next.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Current plan</div>
          <div className="mt-1 text-xl font-semibold">{acc?.plan ?? "—"}</div>
          <Link href="/pricing" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
            Upgrade →
          </Link>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Calls this month</div>
          <div className="mt-1 text-xl font-semibold">
            {acc?.usage.calls_this_month.toLocaleString() ?? "—"} /{" "}
            <span className="text-sm text-zinc-500">{acc?.usage.limit.toLocaleString()}</span>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Upgrade options</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Tier name="Developer" price="$499/mo" features={["50K calls", "Webhooks", "Batch scoring"]} />
          <Tier name="Growth" price="$1,499/mo" features={["250K calls", "Cluster export", "SLA 99.5%"]} highlight />
          <Tier name="Enterprise" price="from $4,999/mo" features={["Unlimited", "Custom models", "On-call"]} />
        </div>
        <div className="mt-6 rounded border border-violet-700/40 bg-violet-900/10 p-4 text-sm">
          <p className="text-violet-200">
            <strong>Crypto checkout (NowPayments)</strong> ships next. Pay in USDT/USDC/ETH/BTC.
            Card payments (Stripe) follow incorporation.
          </p>
          <p className="mt-2 text-xs text-zinc-400">
            Want to pre-commit at today's pricing? Email{" "}
            <a className="underline" href="mailto:hello@sybilshield.com">
              hello@sybilshield.com
            </a>{" "}
            with your expected volume.
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <p className="mt-2 text-sm text-zinc-500">
          No invoices yet. Will appear here after first paid analysis or subscription.
        </p>
      </section>
    </main>
  );
}

function Tier({
  name,
  price,
  features,
  highlight,
}: {
  name: string;
  price: string;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        highlight ? "border-emerald-700/40 bg-emerald-900/10" : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        <StatusBadge status="coming-soon" />
      </div>
      <div className="mt-2 text-lg font-medium">{price}</div>
      <ul className="mt-3 space-y-1 text-sm text-zinc-400">
        {features.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
      <button
        disabled
        className="mt-4 w-full cursor-not-allowed rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-500"
      >
        Subscribe
      </button>
    </div>
  );
}
