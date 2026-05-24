"use client";

import { useEffect, useState } from "react";

interface Summary {
  total_scored: number;
  sybil_count: number;
  suspicious_count: number;
  genuine_count: number;
  cluster_count: number;
  largest_cluster_size: number;
}

interface ScoreRow {
  address: string;
  chain: string;
  sybil_score: number;
  label: string;
  confidence: number | string;
  cluster_id: string | null;
  cluster_size: number | null;
  evidence: Array<{ type: string; description: string; confidence: number }> | null;
}

interface Analysis {
  id: string;
  status: string;
  name: string;
  address_count: number;
  summary?: Summary;
  created_at: string;
  completed_at: string | null;
}

export default function AnalysisDetail({ params }: { params: { id: string } }) {
  const [apiKey] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("sybilshield_api_key") ?? "" : "",
  );
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [results, setResults] = useState<ScoreRow[]>([]);
  const [labelFilter, setLabelFilter] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [drawer, setDrawer] = useState<ScoreRow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey) return;
    const base = process.env.NEXT_PUBLIC_API_URL;
    const headers = { Authorization: `Bearer ${apiKey}` };
    (async () => {
      try {
        const a = await fetch(`${base}/v1/analyses/${params.id}`, { headers }).then((r) => r.json());
        setAnalysis(a);
        const q = labelFilter ? `?label=${labelFilter}` : "";
        const r = await fetch(`${base}/v1/analyses/${params.id}/results${q}`, { headers }).then((x) => x.json());
        setResults(r.data ?? []);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [apiKey, params.id, labelFilter]);

  const filtered = results.filter((r) => !search || r.address.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {error && <p className="text-red-400">{error}</p>}
      {!analysis ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">{analysis.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {analysis.status} · {analysis.address_count.toLocaleString()} addresses · created {new Date(analysis.created_at).toLocaleString()}
          </p>

          {analysis.summary && (
            <section className="mt-8 grid gap-4 sm:grid-cols-4">
              <Stat label="Genuine" value={analysis.summary.genuine_count} pct={analysis.summary.total_scored} tone="emerald" />
              <Stat label="Suspicious" value={analysis.summary.suspicious_count} pct={analysis.summary.total_scored} tone="amber" />
              <Stat label="Sybil" value={analysis.summary.sybil_count} pct={analysis.summary.total_scored} tone="rose" />
              <Stat label="Clusters" value={analysis.summary.cluster_count} subtitle={`largest: ${analysis.summary.largest_cluster_size}`} tone="zinc" />
            </section>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <input
              className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono flex-1 min-w-[280px]"
              placeholder="Search 0x..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className="rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
              value={labelFilter}
              onChange={(e) => setLabelFilter(e.target.value)}
            >
              <option value="">All labels</option>
              <option value="sybil">Sybil</option>
              <option value="suspicious">Suspicious</option>
              <option value="genuine">Genuine</option>
            </select>
            <a
              className="rounded bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700"
              href={`${process.env.NEXT_PUBLIC_API_URL}/v1/analyses/${params.id}/results/export`}
              download
            >
              Export CSV
            </a>
          </div>

          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-2 px-2">Address</th>
                <th>Score</th>
                <th>Label</th>
                <th>Cluster</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.address} className="border-t border-zinc-800 font-mono">
                  <td className="py-2 px-2">{r.address.slice(0, 10)}…{r.address.slice(-6)}</td>
                  <td>{r.sybil_score}</td>
                  <td><LabelChip label={r.label} /></td>
                  <td className="text-zinc-500">{r.cluster_id ?? "—"}</td>
                  <td>
                    {(r.evidence?.length ?? 0) > 0 ? (
                      <button
                        className="text-emerald-400 hover:underline"
                        onClick={() => setDrawer(r)}
                      >
                        View ({r.evidence!.length})
                      </button>
                    ) : (
                      <span className="text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {drawer && (
        <div
          className="fixed inset-0 z-10 flex justify-end bg-black/60"
          onClick={() => setDrawer(null)}
        >
          <div
            className="w-full max-w-md overflow-y-auto bg-zinc-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm">{drawer.address}</h2>
              <button onClick={() => setDrawer(null)} className="text-zinc-400">×</button>
            </div>
            <p className="mt-2 text-2xl font-semibold">{drawer.sybil_score} <span className="text-sm text-zinc-500"><LabelChip label={drawer.label} /></span></p>
            <ul className="mt-6 space-y-4">
              {drawer.evidence?.map((e, i) => (
                <li key={i} className="rounded border border-zinc-800 p-3">
                  <div className="text-xs uppercase tracking-wider text-emerald-400">{e.type}</div>
                  <div className="mt-1 text-sm">{e.description}</div>
                  <div className="mt-2 text-xs text-zinc-500">confidence {(e.confidence * 100).toFixed(0)}%</div>
                </li>
              ))}
            </ul>
            <p className="mt-8 text-xs text-zinc-500">
              Disagree? Submit an appeal at <span className="font-mono">/appeal</span> or email appeals@sybilshield.com.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

function Stat({ label, value, pct, subtitle, tone }: { label: string; value: number; pct?: number; subtitle?: string; tone: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    rose: "text-rose-300",
    zinc: "text-zinc-300",
  };
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{label}</div>
      <div className={`mt-2 text-2xl font-semibold ${colorMap[tone]}`}>{value.toLocaleString()}</div>
      {pct !== undefined && pct > 0 && <div className="text-xs text-zinc-500">{((value / pct) * 100).toFixed(1)}%</div>}
      {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
    </div>
  );
}

function LabelChip({ label }: { label: string }) {
  const styles: Record<string, string> = {
    sybil: "bg-rose-900/40 text-rose-300",
    suspicious: "bg-amber-900/40 text-amber-300",
    genuine: "bg-emerald-900/40 text-emerald-300",
  };
  return <span className={`rounded px-2 py-0.5 text-xs ${styles[label] ?? "bg-zinc-800"}`}>{label}</span>;
}
