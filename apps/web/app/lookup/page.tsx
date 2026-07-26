"use client";

import { useState } from "react";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface EvidenceItem {
  type?: string;
  description?: string;
  confidence?: number;
}

interface ScoreResult {
  address?: string;
  chain?: string;
  sybil_score?: number;
  confidence?: number;
  label?: string;
  decision?: "DROP" | "REVIEW" | "KEEP" | null;
  decision_confidence?: "high" | "medium" | "low" | null;
  rationale_codes?: string[] | null;
  evidence?: EvidenceItem[];
  notScored?: boolean;
}

/**
 * Plain-language mirror of the rationale codes apps/api/src/lib/presets.ts
 * actually generates (evidenceToCodes + computeDecision) — display-only,
 * not a second source of truth. score_ge_N / cluster_size_ge_N are dynamic
 * per-preset thresholds, matched by pattern rather than hand-listed.
 */
function explainCode(code: string): string {
  const scoreMatch = code.match(/^score_ge_(\d+)$/);
  if (scoreMatch) {
    return `Its model risk score reached ${scoreMatch[1]} or higher — this preset's automatic threshold.`;
  }
  const clusterMatch = code.match(/^cluster_size_ge_(\d+)$/);
  if (clusterMatch) {
    return `It belongs to a detected group of ${clusterMatch[1]}+ wallets that look coordinated.`;
  }
  const fixed: Record<string, string> = {
    scripted_timing: "Its transaction timing looks scripted or automated rather than human.",
    low_hour_entropy: "It transacts at unusually regular hours — more consistent with a bot than a person.",
    high_autocorrelation: "The spacing between its transactions is mechanically regular.",
    shared_funder_cluster: "It was funded by the same source as many other wallets within a short time window.",
    shared_funder_weak: "It shares a funding source with other wallets, though over a longer, weaker time window.",
    behavioral_cluster: "Its on-chain behavior closely matches a cluster of other wallets.",
    graph_cluster: "It's part of a dense group of wallets that transact mostly with each other.",
    cross_chain_link: "It's linked to other wallets across chains via bridge activity.",
    thin_account: "It has very little on-chain history to evaluate confidently.",
    model_classification: "The model flagged its overall behavior pattern, without one single dominant reason.",
    custom_thresholds: "The analysis that produced this result used custom thresholds set by whoever submitted it, not preset defaults.",
  };
  return fixed[code] ?? `Rationale code: ${code} (no plain-language mapping yet — see /methodology).`;
}

const DECISION_STYLE: Record<string, { badge: string; text: string }> = {
  DROP: { badge: "border-rose-500 bg-rose-950/40 text-rose-300", text: "Flagged — DROP" },
  REVIEW: { badge: "border-amber-500 bg-amber-950/40 text-amber-300", text: "Under review — REVIEW" },
  KEEP: { badge: "border-emerald-500 bg-emerald-950/40 text-emerald-300", text: "Looks clean — KEEP" },
};

export default function LookupPage() {
  const [addr, setAddr] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [result, setResult] = useState<ScoreResult | null>(null);
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
  // Fallback for rows scored before `decision` existed, or cluster_only mode
  // (no per-address decision) — same heuristic apps/web/public/widget.js uses.
  const effectiveDecision = result?.decision ?? (typeof score === "number" ? (score >= 70 ? "DROP" : "KEEP") : null);
  const codes = result?.rationale_codes ?? [];

  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-8 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">// public good · free · no auth</p>
        <h1 className="mt-3 font-mono text-5xl font-bold tracking-tight">// LOOKUP</h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-400">
          Score any wallet address right now — and if it was flagged, see exactly why, in plain
          language, with a direct path to appeal. Rate-limited to 30 req/hour per IP.
        </p>

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
              <p className="font-mono text-zinc-500">
                // this address has not been part of any analysis yet — not a clean bill of
                health, just genuinely unknown
              </p>
            ) : (
              <>
                <div className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">// score</div>
                <div className={`mt-2 font-mono text-7xl font-bold leading-none ${scoreColor}`}>{score}</div>

                {effectiveDecision && (
                  <div className={`mt-4 inline-flex items-center gap-2 rounded border px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.15em] ${DECISION_STYLE[effectiveDecision].badge}`}>
                    {DECISION_STYLE[effectiveDecision].text}
                  </div>
                )}
                {!result.decision && (
                  <p className="mt-2 font-mono text-[11px] text-zinc-600">
                    // derived from score only — no preset decision on record for this address
                  </p>
                )}

                {codes.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-mono text-sm uppercase tracking-widest text-zinc-400">// why</h2>
                    <ul className="mt-3 space-y-2">
                      {codes.map((c) => (
                        <li key={c} className="border-l-2 border-amber-400/50 pl-3 text-sm text-zinc-300">
                          {explainCode(c)}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {Array.isArray(result.evidence) && result.evidence.length > 0 && (
                  <div className="mt-8">
                    <h2 className="font-mono text-sm uppercase tracking-widest text-zinc-400">// supporting evidence</h2>
                    <ul className="mt-3 space-y-2 font-mono text-xs">
                      {result.evidence.map((e, i) => (
                        <li key={i} className="border-l-2 border-lime-300/50 pl-3 text-zinc-300">
                          [{e.type}] {e.description}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {(effectiveDecision === "DROP" || effectiveDecision === "REVIEW") ? (
                  <div className="mt-10 rounded border border-emerald-700 bg-emerald-900/10 p-5">
                    <p className="text-sm text-zinc-200">
                      Think this is wrong? Anyone can dispute a flag — no account required.
                    </p>
                    <a
                      href="/appeal"
                      className="mt-3 inline-block rounded bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
                    >
                      Submit an appeal →
                    </a>
                  </div>
                ) : (
                  <p className="mt-8 font-mono text-xs text-zinc-500">
                    // disagree with any part of this? <a className="text-lime-300 underline" href="/appeal">submit appeal →</a>
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
