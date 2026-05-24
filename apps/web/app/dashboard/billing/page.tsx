"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CryptoPayButton } from "../../../components/CryptoPayButton";
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

  const pct =
    acc && acc.usage.limit > 0
      ? Math.min(100, Math.round((acc.usage.calls_this_month / acc.usage.limit) * 100))
      : 0;

  return (
    <main>
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold">Billing</h1>
        <StatusBadge status="available" />
      </div>
      <p className="mt-3 text-zinc-400">
        Usage is metered per authed API call. Pay any plan in crypto (USDT / USDC / ETH / BTC) —
        upgrade applies immediately on payment confirmation.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Current plan</div>
          <div className="mt-1 text-xl font-semibold capitalize">{acc?.plan ?? "—"}</div>
          <Link href="/pricing" className="mt-3 inline-block text-sm text-emerald-400 hover:underline">
            See all plans →
          </Link>
        </div>
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Calls this month</div>
          <div className="mt-1 text-xl font-semibold">
            {acc?.usage.calls_this_month.toLocaleString() ?? "—"} /{" "}
            <span className="text-sm text-zinc-500">{acc?.usage.limit.toLocaleString()}</span>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full ${pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-amber-500" : "bg-emerald-500"}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Upgrade options</h2>
        <p className="mt-1 text-sm text-zinc-500">
          Pay in crypto via Atlos (non-custodial, 0% fees). Plan upgrade is automatic on payment confirmation.
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <Tier
            name="Developer"
            plan="developer"
            priceUsd={499}
            features={["50K calls / month", "Webhooks", "Batch scoring"]}
          />
          <Tier
            name="Growth"
            plan="growth"
            priceUsd={1499}
            features={["250K calls / month", "Cluster export", "SLA 99.5%"]}
            highlight
          />
          <Tier
            name="Enterprise"
            plan="enterprise"
            priceUsd={4999}
            features={["Unlimited calls", "Custom models", "On-call"]}
          />
        </div>
        <div className="mt-6 rounded border border-zinc-800 bg-zinc-950 p-4 text-sm">
          <p className="text-zinc-300">
            Need <strong>wire transfer</strong> or <strong>card</strong>? Email{" "}
            <a className="text-emerald-400 underline" href="mailto:support@sybilshield.org">
              support@sybilshield.org
            </a>{" "}
            — invoice issued manually until incorporation (card via Stripe lands Q4 2026).
          </p>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Invoices</h2>
        <p className="mt-2 text-sm text-zinc-500">
          No invoices yet. Will appear here after your first paid subscription.
        </p>
      </section>
    </main>
  );
}

function Tier({
  name,
  plan,
  priceUsd,
  features,
  highlight,
}: {
  name: string;
  plan: "developer" | "growth" | "enterprise";
  priceUsd: number;
  features: string[];
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border p-4 ${
        highlight ? "border-emerald-700/40 bg-emerald-900/10" : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">{name}</h3>
        <StatusBadge status="available" />
      </div>
      <div className="mt-2 text-lg font-medium">${priceUsd.toLocaleString()}/mo</div>
      <ul className="mt-3 flex-1 space-y-1 text-sm text-zinc-400">
        {features.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
      <CryptoPayButton plan={plan} priceUsd={priceUsd} />
    </div>
  );
}
