"use client";

import { useEffect, useState } from "react";
import { StatusBadge } from "../../../components/StatusBadge";

interface Account {
  plan: string;
  usage: { calls_this_month: number; limit: number };
}

export default function UsagePage() {
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
        <h1 className="text-3xl font-semibold">Usage</h1>
        <StatusBadge status="available" />
      </div>
      <p className="mt-3 text-zinc-400">
        SybilShield is a free public good — no billing, no plans. These are the fair-use
        limits that keep the shared sandbox healthy. Writes count toward the monthly limit;
        dashboard polling and reads are free.
      </p>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
          <div className="text-xs uppercase tracking-wider text-zinc-500">Access</div>
          <div className="mt-1 text-xl font-semibold">Free public sandbox</div>
          <p className="mt-2 text-sm text-zinc-500">No card, email only.</p>
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
        <h2 className="text-xl font-semibold">Fair-use limits</h2>
        <ul className="mt-3 space-y-1 text-sm text-zinc-400">
          <li>· 100 calls / month (writes; reads and polling are free)</li>
          <li>· Up to 1,000 addresses per analysis</li>
          <li>· 1 analysis at a time · 1 MB CSV upload</li>
        </ul>
        <div className="mt-6 rounded border border-zinc-800 bg-zinc-950 p-4 text-sm">
          <p className="text-zinc-300">
            Running heavier research and need more headroom? Email{" "}
            <a className="text-emerald-400 underline" href="mailto:support@sybilshield.org">
              support@sybilshield.org
            </a>{" "}
            — we&apos;re happy to help public-goods and research work.
          </p>
        </div>
      </section>
    </main>
  );
}
