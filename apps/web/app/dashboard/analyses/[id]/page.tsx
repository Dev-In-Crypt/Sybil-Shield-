"use client";

import { useEffect, useState } from "react";

interface Summary {
  total_scored: number;
  // Legacy label-based counts (kept for backwards compatibility)
  sybil_count: number;
  suspicious_count: number;
  genuine_count: number;
  // Decision counts (preset-aware) — preferred when present.
  drop_count?: number | null;
  review_count?: number | null;
  keep_count?: number | null;
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
  decision?: "DROP" | "REVIEW" | "KEEP" | null;
  decision_confidence?: "high" | "medium" | "low" | null;
  rationale_codes?: string[] | null;
  evidence: Array<{ type: string; description: string; confidence: number }> | null;
}

interface Analysis {
  id: string;
  status: string;
  name: string;
  address_count: number;
  preset?: string | null;
  mode?: string | null;
  summary?: Summary;
  created_at: string;
  completed_at: string | null;
}

// Mirror of apps/api/src/lib/presets.ts — kept duplicated for now so the
// dashboard can render rule descriptions without an extra round-trip.
const PRESET_RULES: Record<string, { drop: string; review: string }> = {
  airdrop: {
    drop: "score ≥ 85 OR cluster_size ≥ 50",
    review: "score ≥ 60 OR cluster_size ≥ 20",
  },
  dao: {
    drop: "score ≥ 90 OR cluster_size ≥ 30",
    review: "score ≥ 50 OR cluster_size ≥ 10",
  },
  grant: {
    drop: "cluster_size ≥ 20",
    review: "cluster_size ≥ 5 OR score ≥ 70",
  },
  balanced: {
    drop: "score ≥ 80",
    review: "score ≥ 50",
  },
};

export default function AnalysisDetail({ params }: { params: { id: string } }) {
  const [apiKey] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("sybilshield_api_key") ?? "" : "",
  );
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [results, setResults] = useState<ScoreRow[]>([]);
  const [decisionFilter, setDecisionFilter] = useState<string>("");
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
        const q = decisionFilter ? `?decision=${decisionFilter}` : "";
        const r = await fetch(`${base}/v1/analyses/${params.id}/results${q}`, { headers }).then((x) => x.json());
        setResults(r.data ?? []);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [apiKey, params.id, decisionFilter]);

  const filtered = results.filter((r) => !search || r.address.toLowerCase().includes(search.toLowerCase()));

  // Decision counts come from the summary; fall back to tallying the loaded
  // page if the analysis was created before the decision columns existed.
  const hasDecisionSummary =
    analysis?.summary?.drop_count != null ||
    analysis?.summary?.review_count != null ||
    analysis?.summary?.keep_count != null;

  return (
    <main className="mx-auto max-w-6xl px-6 py-12">
      {error && <p className="text-red-400">{error}</p>}
      {!analysis ? (
        <p className="text-zinc-500">Loading…</p>
      ) : (
        <>
          <h1 className="text-2xl font-semibold">{analysis.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {analysis.status} · {analysis.address_count.toLocaleString()} addresses · created{" "}
            {new Date(analysis.created_at).toLocaleString()}
            {analysis.preset && (
              <>
                {" "}
                · <span className="font-mono text-zinc-400">preset={analysis.preset}</span>
              </>
            )}
            {analysis.mode === "cluster_only" && (
              <>
                {" "}
                · <span className="font-mono text-amber-300">cluster-only mode</span>
              </>
            )}
          </p>

          {analysis.summary && hasDecisionSummary && (
            <section className="mt-8 grid gap-4 sm:grid-cols-4">
              <Stat label="Drop" value={analysis.summary.drop_count ?? 0} pct={analysis.summary.total_scored} tone="rose" />
              <Stat label="Review" value={analysis.summary.review_count ?? 0} pct={analysis.summary.total_scored} tone="amber" />
              <Stat label="Keep" value={analysis.summary.keep_count ?? 0} pct={analysis.summary.total_scored} tone="emerald" />
              <Stat
                label="Clusters"
                value={analysis.summary.cluster_count}
                subtitle={`largest: ${analysis.summary.largest_cluster_size}`}
                tone="zinc"
              />
            </section>
          )}
          {analysis.summary && !hasDecisionSummary && (
            <section className="mt-8 grid gap-4 sm:grid-cols-4">
              <Stat label="Genuine" value={analysis.summary.genuine_count} pct={analysis.summary.total_scored} tone="emerald" />
              <Stat label="Suspicious" value={analysis.summary.suspicious_count} pct={analysis.summary.total_scored} tone="amber" />
              <Stat label="Sybil" value={analysis.summary.sybil_count} pct={analysis.summary.total_scored} tone="rose" />
              <Stat
                label="Clusters"
                value={analysis.summary.cluster_count}
                subtitle={`largest: ${analysis.summary.largest_cluster_size}`}
                tone="zinc"
              />
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
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
              aria-label="Filter by decision"
            >
              <option value="">All decisions</option>
              <option value="DROP">Drop only</option>
              <option value="REVIEW">Review only</option>
              <option value="KEEP">Keep only</option>
            </select>
            <ExportCsvButton analysisId={params.id} />
          </div>
          <div className="mt-2 min-h-[18px] text-xs"></div>

          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-2 px-2">Address</th>
                <th>Decision</th>
                <th>Score</th>
                <th>Cluster</th>
                <th>Evidence</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.address} className="border-t border-zinc-800 font-mono">
                  <td className="py-2 px-2">
                    {r.address.slice(0, 10)}…{r.address.slice(-6)}
                  </td>
                  <td>
                    <DecisionChip decision={r.decision} confidence={r.decision_confidence} fallbackLabel={r.label} />
                  </td>
                  <td className="text-zinc-400">{r.sybil_score}</td>
                  <td className="text-zinc-500">
                    {r.cluster_id ? (
                      <span title={r.cluster_id}>
                        {r.cluster_id.slice(0, 8)}… <span className="text-zinc-600">(n={r.cluster_size})</span>
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>
                    {(r.rationale_codes?.length ?? 0) > 0 || (r.evidence?.length ?? 0) > 0 ? (
                      <button className="text-emerald-400 hover:underline" onClick={() => setDrawer(r)}>
                        View ({r.rationale_codes?.length ?? r.evidence?.length ?? 0})
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
        <div className="fixed inset-0 z-10 flex justify-end bg-black/60" onClick={() => setDrawer(null)}>
          <div
            className="w-full max-w-md overflow-y-auto bg-zinc-900 p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-mono text-sm break-all">{drawer.address}</h2>
              <button onClick={() => setDrawer(null)} className="ml-2 shrink-0 text-zinc-400" aria-label="Close">
                ×
              </button>
            </div>
            <div className="mt-2 flex items-center gap-3">
              <DecisionChip
                decision={drawer.decision}
                confidence={drawer.decision_confidence}
                fallbackLabel={drawer.label}
                size="lg"
              />
              <span className="font-mono text-sm text-zinc-500">score {drawer.sybil_score}</span>
            </div>

            {analysis?.preset && drawer.decision && (
              <p className="mt-3 rounded border border-zinc-800 bg-zinc-950 p-3 text-xs text-zinc-400">
                <span className="text-zinc-500">preset</span>{" "}
                <span className="font-mono text-emerald-300">{analysis.preset}</span>
                {PRESET_RULES[analysis.preset] && (
                  <>
                    {" · "}
                    <span className="text-zinc-500">
                      {drawer.decision === "DROP" ? "drop_if" : drawer.decision === "REVIEW" ? "review_if" : "thresholds"}:
                    </span>{" "}
                    <span className="font-mono text-zinc-300">
                      {drawer.decision === "DROP"
                        ? PRESET_RULES[analysis.preset]!.drop
                        : drawer.decision === "REVIEW"
                          ? PRESET_RULES[analysis.preset]!.review
                          : "below review threshold"}
                    </span>
                  </>
                )}
              </p>
            )}

            {(drawer.rationale_codes?.length ?? 0) > 0 && (
              <div className="mt-4">
                <div className="text-xs uppercase tracking-wider text-zinc-500">Rationale</div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {drawer.rationale_codes!.map((c) => (
                    <span key={c} className="rounded bg-zinc-800 px-2 py-0.5 font-mono text-xs text-emerald-300">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <ul className="mt-6 space-y-3">
              {drawer.evidence?.map((e, i) => (
                <li key={i} className="rounded border border-zinc-800 p-3">
                  <div className="text-xs uppercase tracking-wider text-emerald-400">{e.type}</div>
                  <div className="mt-1 text-sm">{e.description}</div>
                  <div className="mt-2 text-xs text-zinc-500">confidence {(e.confidence * 100).toFixed(0)}%</div>
                </li>
              ))}
            </ul>
            <FeedbackButtons analysisId={params.id} address={drawer.address} chain={drawer.chain} />

            <p className="mt-6 text-xs text-zinc-500">
              Disagree publicly? Submit an appeal at <span className="font-mono">/appeal</span> — appeals are recorded
              in the public audit log with a 48h SLA.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}

/**
 * Thumbs up/down on a score. Hits POST /v1/feedback which writes to the
 * `feedback` table (already in schema) and an `evidence_audit_log` event
 * tagged `customer:<id>`. This is the calibration loop that turns customer
 * disagreements into retraining signal.
 */
function FeedbackButtons({
  analysisId,
  address,
  chain,
}: {
  analysisId: string;
  address: string;
  chain: string;
}) {
  const [sent, setSent] = useState<null | "confirmed" | "false_positive" | "false_negative">(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(verdict: "confirmed" | "false_positive" | "false_negative") {
    setErr(null);
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) {
      setErr("API key missing.");
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/feedback`, {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({ analysis_id: analysisId, address, chain, verdict }),
      });
      if (!r.ok) {
        setErr(`Failed: ${r.status}`);
        return;
      }
      setSent(verdict);
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="mt-6 rounded border border-emerald-700/40 bg-emerald-900/10 p-3 text-xs text-emerald-300">
        ✓ Feedback recorded ({sent.replace("_", " ")}). Logged in the audit trail and used for model calibration.
      </div>
    );
  }

  return (
    <div className="mt-6 rounded border border-zinc-800 bg-zinc-950 p-3">
      <div className="text-xs uppercase tracking-wider text-zinc-500">Was this verdict correct?</div>
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("confirmed")}
          className="rounded border border-emerald-700/40 bg-emerald-900/20 px-3 py-1 text-xs text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50"
        >
          ✓ Correct
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("false_positive")}
          className="rounded border border-rose-700/40 bg-rose-900/20 px-3 py-1 text-xs text-rose-300 hover:bg-rose-900/40 disabled:opacity-50"
        >
          ✗ False positive (genuine flagged)
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => submit("false_negative")}
          className="rounded border border-amber-700/40 bg-amber-900/20 px-3 py-1 text-xs text-amber-300 hover:bg-amber-900/40 disabled:opacity-50"
        >
          ⚠ False negative (sybil missed)
        </button>
      </div>
      {err && <p className="mt-2 text-xs text-rose-400">{err}</p>}
      <p className="mt-2 text-[10px] text-zinc-600">
        Recorded in the public audit log + feedback table. Used to recalibrate preset thresholds.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  pct,
  subtitle,
  tone,
}: {
  label: string;
  value: number;
  pct?: number;
  subtitle?: string;
  tone: string;
}) {
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
      {pct !== undefined && pct > 0 && (
        <div className="text-xs text-zinc-500">{((value / pct) * 100).toFixed(1)}%</div>
      )}
      {subtitle && <div className="text-xs text-zinc-500">{subtitle}</div>}
    </div>
  );
}

function DecisionChip({
  decision,
  confidence,
  fallbackLabel,
  size = "sm",
}: {
  decision: ScoreRow["decision"];
  confidence: ScoreRow["decision_confidence"];
  fallbackLabel: string;
  size?: "sm" | "lg";
}) {
  if (!decision) {
    // Legacy or cluster-only row — fall back to the old label chip.
    const legacy: Record<string, string> = {
      sybil: "bg-rose-900/40 text-rose-300",
      suspicious: "bg-amber-900/40 text-amber-300",
      genuine: "bg-emerald-900/40 text-emerald-300",
      unscored: "bg-zinc-800 text-zinc-400",
    };
    return (
      <span className={`rounded px-2 py-0.5 text-xs ${legacy[fallbackLabel] ?? "bg-zinc-800"}`}>
        {fallbackLabel}
      </span>
    );
  }
  const styles: Record<string, string> = {
    DROP: "bg-rose-900/50 text-rose-200 border border-rose-700/40",
    REVIEW: "bg-amber-900/50 text-amber-200 border border-amber-700/40",
    KEEP: "bg-emerald-900/50 text-emerald-200 border border-emerald-700/40",
  };
  const padding = size === "lg" ? "px-3 py-1 text-sm" : "px-2 py-0.5 text-xs";
  return (
    <span className={`inline-flex items-center gap-1 rounded font-semibold ${padding} ${styles[decision]}`}>
      {decision}
      {confidence && <span className="text-[10px] font-normal opacity-70">· {confidence}</span>}
    </span>
  );
}

function ExportCsvButton({ analysisId }: { analysisId: string }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  async function go() {
    setMsg(null);
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) {
      setMsg({ kind: "err", text: "API key missing — log in again on /dashboard." });
      return;
    }
    setBusy(true);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/analyses/${analysisId}/results/export`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      if (!r.ok) {
        setMsg({ kind: "err", text: `Export failed: ${r.status} ${await r.text()}` });
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sybilshield-${analysisId}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setMsg({ kind: "ok", text: "✓ Downloaded" });
      setTimeout(() => setMsg(null), 2500);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={go}
        disabled={busy}
        className="rounded bg-zinc-800 px-3 py-2 text-sm hover:bg-zinc-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        {busy ? "Exporting…" : "Export CSV"}
      </button>
      {msg && (
        <span className={`text-xs ${msg.kind === "ok" ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</span>
      )}
    </>
  );
}
