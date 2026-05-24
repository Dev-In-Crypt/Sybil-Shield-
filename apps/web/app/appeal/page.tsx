"use client";

import { useState } from "react";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

interface PolicyResp {
  policy: string;
  response_time_hours: number;
  contact: string;
  what_we_review: string[];
  decision_outcomes: string[];
}

export default function AppealPage() {
  const [address, setAddress] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/appeals`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ address, chain, reason, contact_email: email || undefined }),
      });
      const data = await r.json();
      if (r.ok) {
        setResult({ ok: true, message: data.message ?? "Appeal recorded." });
      } else {
        setResult({ ok: false, message: data.error ?? "Submission failed." });
      }
    } catch (err) {
      setResult({ ok: false, message: String(err) });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">Appeal a Sybil score</h1>
        <p className="mt-3 text-zinc-400">
          Anyone can dispute a score on a wallet. No authentication required. 48-hour response policy.
        </p>

        <form onSubmit={submit} className="mt-10 space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6">
          <Field label="Wallet address" hint="0x followed by 40 hex chars">
            <input
              required
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="0x..."
              pattern="^0x[0-9a-fA-F]{40}$"
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono"
            />
          </Field>
          <Field label="Chain">
            <select
              value={chain}
              onChange={(e) => setChain(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            >
              <option>ethereum</option>
              <option>arbitrum</option>
              <option>optimism</option>
              <option>base</option>
              <option>polygon</option>
              <option>bsc</option>
              <option>avalanche</option>
              <option>linea</option>
            </select>
          </Field>
          <Field label="Why is this address legitimate?" hint="Minimum 20 characters. Be specific. Mention ENS, on-chain history, Gitcoin Passport, etc.">
            <textarea
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              minLength={20}
              maxLength={2000}
              rows={6}
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="Owned this wallet since 2019. ENS: vitalik.eth (just kidding). I've voted on 30+ Snapshot proposals, donated to Gitcoin Grants 5 rounds, hold blue-chip NFTs from 2021. Happy to provide additional KYC."
            />
            <div className="mt-1 text-right text-xs text-zinc-500">{reason.length}/2000</div>
          </Field>
          <Field label="Contact email (optional)" hint="So a reviewer can follow up. Never published.">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
              placeholder="you@example.com"
            />
          </Field>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded bg-emerald-600 px-4 py-3 font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit appeal"}
          </button>

          {result && (
            <div
              className={`rounded border p-3 text-sm ${
                result.ok
                  ? "border-emerald-700 bg-emerald-900/20 text-emerald-200"
                  : "border-rose-700 bg-rose-900/20 text-rose-200"
              }`}
            >
              {result.message}
            </div>
          )}
        </form>

        <section className="mt-12">
          <h2 className="text-xl font-semibold">Our policy</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-400">
            <li>· <strong className="text-zinc-200">48 hours</strong> — we acknowledge every appeal within this window.</li>
            <li>· <strong className="text-zinc-200">Public methodology</strong> — see <a className="underline" href="/methodology">/methodology</a> for how each flag is generated.</li>
            <li>· <strong className="text-zinc-200">Decision outcomes</strong> — <code className="font-mono">reversed</code>, <code className="font-mono">confirmed</code>, or <code className="font-mono">no_change</code>.</li>
            <li>· <strong className="text-zinc-200">Immutable audit log</strong> — every step recorded with timestamps for legal defensibility.</li>
            <li>· <strong className="text-zinc-200">No retaliation</strong> — submitting an appeal doesn't lower your score automatically, but it also can't increase it.</li>
          </ul>
          <p className="mt-6 text-xs text-zinc-500">
            Spammed appeals get rate-limited (10/hour per IP). For complex cases, email{" "}
            <a className="underline" href="mailto:appeals@sybilshield.com">appeals@sybilshield.com</a> with evidence attached.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-200">{label}</label>
      {hint && <p className="mt-0.5 text-xs text-zinc-500">{hint}</p>}
      <div className="mt-2">{children}</div>
    </div>
  );
}
