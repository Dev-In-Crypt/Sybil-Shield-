"use client";

import { useState } from "react";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export default function LookupPage() {
  const [addr, setAddr] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function lookup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await fetch(`${API}/v1/score/${addr}?chain=${chain}`);
      if (r.status === 404) {
        setResult({ notScored: true });
      } else if (!r.ok) {
        const d = await r.json();
        setError(d.error ?? r.statusText);
      } else {
        setResult(await r.json());
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  const score = result?.sybil_score ?? null;
  const scoreColor = score === null ? "text-zinc-500" : score >= 70 ? "text-rose-300" : score >= 40 ? "text-amber-300" : "text-lime-300";

  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-8 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">// public good · free · no auth</p>
        <h1 className="mt-3 font-mono text-5xl font-bold tracking-tight">// LOOKUP</h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-400">Score any wallet address right now. Rate-limited to 30 req/hour per IP.</p>

        <form onSubmit={lookup} className="mt-8 flex flex-wrap gap-2">
          <input
            required
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="0x... (40 hex chars)"
            pattern="^0x[0-9a-fA-F]{40}$"
            className="min-w-[280px] flex-1 border border-white/10 bg-zinc-950 px-4 py-3 font-mono text-sm"
          />
          <select value={chain} onChange={(e) => setChain(e.target.value)} className="border border-white/10 bg-zinc-950 px-3 py-3 font-mono text-sm">
            {["ethereum", "arbitrum", "optimism", "base", "polygon"].map((c) => <option key={c}>{c}</option>)}
          </select>
          <button type="submit" disabled={loading} className="border-2 border-lime-300 bg-lime-300 px-7 py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-black hover:bg-transparent hover:text-lime-300">
            {loading ? "scoring..." : "score"}
          </button>
        </form>

        {error && <p className="mt-4 text-rose-400">{error}</p>}

        {result && (
          <div className="mt-12 border border-white/10 bg-zinc-900 p-8">
            {result.notScored ? (
              <p className="font-mono text-zinc-500">// this address has not been part of any analysis yet</p>
            ) : (
              <>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">// score</div>
                <div className={`mt-2 font-mono text-7xl font-bold leading-none ${scoreColor}`}>{score}</div>
                <div className="mt-2 inline-flex items-center gap-2 border border-white/10 bg-black px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em]">
                  {(result.label || "").toUpperCase()} · confidence {Number(result.confidence || 0).toFixed(2)}
                </div>
                {Array.isArray(result.evidence) && result.evidence.length > 0 && (
                  <ul className="mt-6 space-y-2 font-mono text-xs">
                    {result.evidence.map((e: any, i: number) => (
                      <li key={i} className="border-l-2 border-lime-300/50 pl-3 text-zinc-300">
                        [{e.type}] {e.description}
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-8 font-mono text-xs text-zinc-500">
                  // disagree? <a className="text-lime-300 underline" href="/appeal">submit appeal →</a>
                </p>
              </>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
