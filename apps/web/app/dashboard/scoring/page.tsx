"use client";

import { useState } from "react";

export default function ScoringPage() {
  const [addr, setAddr] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchMsg, setWatchMsg] = useState<string | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL;

  async function score(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    const key = localStorage.getItem("sybilshield_api_key");
    try {
      const r = await fetch(`${base}/v1/score/${addr.toLowerCase()}?chain=${chain}`, {
        headers: key ? { Authorization: `Bearer ${key}` } : {},
      });
      if (!r.ok) {
        setError(`${r.status} — address may not have been scored yet. Create an analysis that includes it.`);
        return;
      }
      setResult(await r.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }

  async function watch() {
    const key = localStorage.getItem("sybilshield_api_key");
    const r = await fetch(`${base}/v1/watchlist`, {
      method: "POST",
      headers: { "content-type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({ address: addr.toLowerCase(), chain }),
    });
    if (r.ok) {
      setWatchMsg("✓ Added to watchlist");
      setTimeout(() => setWatchMsg(null), 3000);
    } else {
      setWatchMsg(`Failed: ${r.status}`);
    }
  }

  const s = result?.sybil_score ?? result?.score ?? null;
  const sColor = s == null ? "text-zinc-500" : s >= 70 ? "text-red-400" : s >= 40 ? "text-amber-400" : "text-emerald-400";

  return (
    <main>
      <h1 className="text-3xl font-semibold">Score address</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Look up a single address against cached scores. Results draw from the most recent analysis that included it.
      </p>

      <form onSubmit={score} className="mt-8 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[260px]">
          <label className="text-xs uppercase tracking-wider text-zinc-500">Address</label>
          <input
            required
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="0x..."
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500">Chain</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="mt-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option>ethereum</option>
            <option>arbitrum</option>
            <option>optimism</option>
            <option>base</option>
            <option>polygon</option>
          </select>
        </div>
        <button
          disabled={busy}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {busy ? "Scoring..." : "Score"}
        </button>
      </form>

      {error && <p className="mt-6 text-sm text-red-400">{error}</p>}

      {result && (
        <section className="mt-8 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Sybil score</div>
              <div className={`mt-1 font-mono text-3xl font-bold ${sColor}`}>{s ?? "—"}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Label</div>
              <div className="mt-1 font-mono text-xl font-bold">{result.label ?? "—"}</div>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">Confidence</div>
              <div className="mt-1 font-mono text-3xl font-bold">
                {result.confidence ? `${(Number(result.confidence) * 100).toFixed(0)}%` : "—"}
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">Evidence</h2>
            <pre className="mt-2 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
              {JSON.stringify(result.evidence ?? result, null, 2)}
            </pre>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={watch}
              className="rounded border border-emerald-700 px-4 py-2 text-sm text-emerald-400 hover:bg-emerald-900/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              + Add to watchlist
            </button>
            {watchMsg && (
              <span className={watchMsg.startsWith("✓") ? "text-emerald-400 text-sm" : "text-red-400 text-sm"}>
                {watchMsg}
              </span>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
