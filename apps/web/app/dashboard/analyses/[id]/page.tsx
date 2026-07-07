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
  processing_time_seconds?: number | null;
}

interface ClusterNode {
  cluster_id: string;
  size: number;
  detection_method: string;
  evidence?: string | null;
  avg_sybil_score: number | string | null;
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
  const [clusters, setClusters] = useState<ClusterNode[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Poll while the job is still in flight so the page updates itself
  // instead of leaving the user staring at "Loading…" and reaching for F5.
  // Stops as soon as status is terminal (`complete` / `failed`).
  useEffect(() => {
    if (!apiKey) return;
    const base = process.env.NEXT_PUBLIC_API_URL;
    const headers = { Authorization: `Bearer ${apiKey}` };
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function tick() {
      try {
        const a = await fetch(`${base}/v1/analyses/${params.id}`, { headers }).then((r) => r.json());
        if (cancelled) return;
        setAnalysis(a);
        // Terminal statuses: complete, complete_over_budget (Block 5 — CU
        // cap was hit but results were still written), and failed.
        if (a.status === "complete" || a.status === "complete_over_budget") {
          const q = decisionFilter ? `?decision=${decisionFilter}` : "";
          const r = await fetch(`${base}/v1/analyses/${params.id}/results${q}`, { headers }).then((x) => x.json());
          if (cancelled) return;
          setResults(r.data ?? []);
          return;
        }
        if (a.status === "failed") return;
        // Still in flight — re-poll. 2s is comfortable: tight enough to feel
        // live, loose enough not to hammer the API.
        timer = setTimeout(tick, 2000);
      } catch (e) {
        if (!cancelled) setError(String(e));
      }
    }

    tick();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [apiKey, params.id, decisionFilter]);

  // Fetch detected clusters once the analysis is terminal. Separate from the
  // results poll so the graph degrades independently: if the clusters endpoint
  // errors or returns none, the rest of the page is unaffected.
  useEffect(() => {
    if (!apiKey) return;
    const status = analysis?.status;
    if (status !== "complete" && status !== "complete_over_budget") return;
    let cancelled = false;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/analyses/${params.id}/clusters`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => {
        if (!cancelled) setClusters(Array.isArray(j?.data) ? j.data : []);
      })
      .catch(() => {
        /* graph is best-effort — swallow */
      });
    return () => {
      cancelled = true;
    };
  }, [apiKey, analysis?.status, params.id]);

  // Live elapsed-seconds counter while pending/ingesting so users see motion.
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!analysis || analysis.status === "complete" || analysis.status === "failed") return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [analysis]);

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
      ) : analysis.status !== "complete" &&
        analysis.status !== "complete_over_budget" &&
        analysis.status !== "failed" ? (
        <ProgressCard analysis={analysis} tick={tick} />
      ) : analysis.status === "failed" ? (
        <div className="rounded-lg border border-rose-700/40 bg-rose-900/10 p-6 text-rose-200">
          <h2 className="text-lg font-semibold">Analysis failed</h2>
          <p className="mt-2 text-sm text-rose-300">
            The worker errored out on this job. Check{" "}
            <a href="/dashboard/notifications" className="underline">
              notifications
            </a>{" "}
            for the stack trace, or email support@sybilshield.org with id {analysis.id}.
          </p>
        </div>
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

          {/* Completion banner — confirms freshness + tells users that the
              table preview is capped and CSV has the full set. amber variant
              when the analysis hit the CU budget cap (Block 5). */}
          {analysis.status === "complete_over_budget" && (
            <div className="mt-6 rounded-lg border border-amber-700/40 bg-amber-900/10 px-4 py-3 text-sm text-amber-200">
              <strong>⚠ Analysis hit the sandbox compute limit.</strong> Partial results saved below. Trim the
              address list and re-run for a complete pass.
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-700/30 bg-emerald-900/[0.07] px-4 py-3">
            <p className="text-sm text-emerald-200">
              ✓ Analysis complete
              {typeof analysis.processing_time_seconds === "number" && (
                <span className="ml-2 text-emerald-400/70">in {analysis.processing_time_seconds}s</span>
              )}
              {analysis.summary && analysis.summary.total_scored > results.length && (
                <span className="ml-3 text-zinc-400">
                  · showing first <strong className="text-zinc-200">{results.length.toLocaleString()}</strong> of{" "}
                  <strong className="text-zinc-200">{analysis.summary.total_scored.toLocaleString()}</strong> — export
                  CSV for the full set
                </span>
              )}
            </p>
          </div>

          <ClusterGraph clusters={clusters} />

          <div className="mt-6 flex flex-wrap items-center gap-2">
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
            <ExportCsvButton
              analysisId={params.id}
              rowCount={analysis.summary?.total_scored ?? null}
            />
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

/** Colour a cluster node by its average sybil score (signal, not verdict). */
function clusterScoreColor(score: number): string {
  if (score >= 70) return "#fb7185"; // rose — high avg score
  if (score >= 40) return "#fbbf24"; // amber — mixed
  return "#34d399"; // emerald — low avg score
}

/**
 * Node-link graph of detected clusters, rendered from
 * GET /v1/analyses/:id/clusters. The endpoint returns cluster-level
 * aggregates (size / method / avg score), not address-level edges, so this is
 * a star topology: a central "analysis" hub linked to one node per cluster.
 * Node radius encodes cluster size; fill encodes the average sybil score.
 * Degrades gracefully: no clusters → a plain note, never a broken canvas.
 */
function ClusterGraph({ clusters }: { clusters: ClusterNode[] }) {
  if (clusters.length === 0) {
    return (
      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Cluster network</h2>
        <p className="mt-2 rounded border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-500">
          No clusters detected — every scored address looks independent under the current method set.
        </p>
      </section>
    );
  }

  // Cap the drawn nodes so a pathological analysis can't render 500 circles.
  // The API already orders by size desc, so we keep the biggest clusters.
  const MAX_NODES = 40;
  const shown = clusters.slice(0, MAX_NODES);
  const hidden = clusters.length - shown.length;

  const W = 760;
  const H = 480;
  const cx = W / 2;
  const cy = H / 2;
  const ringR = 170;

  const nodes = shown.map((c, i) => {
    const score = Math.max(0, Math.min(100, Math.round(Number(c.avg_sybil_score ?? 0))));
    const r = Math.max(10, Math.min(30, 9 + Math.sqrt(Math.max(1, c.size)) * 2.5));
    // Evenly space clusters on a ring; start at the top (−90°). A single
    // cluster sits dead-centre-top rather than off to the right.
    const angle = (i / shown.length) * Math.PI * 2 - Math.PI / 2;
    const x = cx + ringR * Math.cos(angle);
    const y = cy + ringR * Math.sin(angle);
    return { c, score, r, x, y };
  });

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">Cluster network</h2>
        <p className="text-xs text-zinc-600">
          {clusters.length} cluster{clusters.length === 1 ? "" : "s"}
          {hidden > 0 && <> · showing the {MAX_NODES} largest</>} · node size ∝ members · colour ∝ avg score
        </p>
      </div>
      <div className="mt-3 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[520px]" role="img" aria-label="Cluster network graph">
          {/* Links: hub → each cluster. */}
          {nodes.map((n) => (
            <line
              key={`l-${n.c.cluster_id}`}
              x1={cx}
              y1={cy}
              x2={n.x}
              y2={n.y}
              stroke="#3f3f46"
              strokeWidth={1}
            />
          ))}
          {/* Cluster nodes. */}
          {nodes.map((n) => (
            <g key={`n-${n.c.cluster_id}`}>
              <title>
                {`${n.c.detection_method} · ${n.c.size} address${n.c.size === 1 ? "" : "es"} · avg score ${n.score}`}
              </title>
              <circle cx={n.x} cy={n.y} r={n.r} fill={clusterScoreColor(n.score)} fillOpacity={0.25} stroke={clusterScoreColor(n.score)} strokeWidth={1.5} />
              <text x={n.x} y={n.y} textAnchor="middle" dominantBaseline="central" className="fill-zinc-200 font-mono" fontSize={11}>
                {n.c.size}
              </text>
              <text x={n.x} y={n.y + n.r + 12} textAnchor="middle" className="fill-zinc-500 font-mono" fontSize={9}>
                {n.c.detection_method}
              </text>
            </g>
          ))}
          {/* Central analysis hub, drawn last so it sits on top of the links. */}
          <circle cx={cx} cy={cy} r={16} fill="#18181b" stroke="#52525b" strokeWidth={1.5} />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" className="fill-zinc-400 font-mono" fontSize={8}>
            analysis
          </text>
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-[10px] uppercase tracking-wider text-zinc-500">
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#34d399" }} /> low avg score</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#fbbf24" }} /> mixed</span>
        <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full" style={{ background: "#fb7185" }} /> high avg score</span>
        <span className="text-zinc-600 normal-case">Clusters are signals, not verdicts — see each address&apos;s evidence below.</span>
      </div>
    </section>
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

/**
 * CSV download CTA. Genesis aesthetic — mono, lime accent, hover-invert.
 * Shows row count BEFORE click so the user knows what they're getting,
 * and real byte size + filename AFTER download lands so it doesn't feel
 * silent ("did it work? what did I get?").
 */
function ExportCsvButton({
  analysisId,
  rowCount,
}: {
  analysisId: string;
  rowCount: number | null;
}) {
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
      const filename = `sybilshield-${analysisId.slice(0, 8)}.csv`;
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const kb = (blob.size / 1024).toFixed(1);
      setMsg({ kind: "ok", text: `✓ Saved ${filename} · ${kb} KB` });
      setTimeout(() => setMsg(null), 4000);
    } finally {
      setBusy(false);
    }
  }

  // Rough KB estimate: header (~90 chars) + ~120 chars/row at decision-aware
  // CSV width. Only shown when we know the row count.
  const estimateKb =
    rowCount != null && rowCount > 0 ? Math.max(1, Math.round((90 + rowCount * 120) / 1024)) : null;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={go}
        disabled={busy}
        aria-label="Download all results as CSV"
        className="group relative inline-flex items-center gap-2 border border-lime/60 bg-black px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-lime transition hover:bg-lime hover:text-black disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime focus-visible:ring-offset-2 focus-visible:ring-offset-black"
      >
        {busy ? (
          <>
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-lime group-hover:bg-black"
              aria-hidden
            />
            Exporting…
          </>
        ) : (
          <>
            <span aria-hidden>↓</span>
            Download.csv
          </>
        )}
      </button>
      {rowCount != null && rowCount > 0 && !busy && !msg && (
        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
          {rowCount.toLocaleString()} rows
          {estimateKb && estimateKb >= 1 && ` · ~${estimateKb} KB`}
        </span>
      )}
      {msg && (
        <span
          className={`font-mono text-[10px] uppercase tracking-widest ${
            msg.kind === "ok" ? "text-lime" : "text-rose-400"
          }`}
        >
          {msg.text}
        </span>
      )}
    </div>
  );
}

/**
 * Visible in-flight progress card. Replaces the old "Loading…" line while
 * status is pending/ingesting/queued so users can see (a) it's working and
 * (b) roughly how long it's been running. We don't have per-stage telemetry
 * from the worker — just status — so stages are derived from `status`.
 */
function ProgressCard({ analysis, tick: _tick }: { analysis: Analysis; tick: number }) {
  // Use Date.now to compute live elapsed seconds. The `tick` prop forces a
  // re-render each second (it's not used in math, just as a React signal).
  const createdAtMs = new Date(analysis.created_at).getTime();
  const elapsedSec = Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000));

  // Rough heuristic: ~3 sec / 100 addresses on real Alchemy from prod traces.
  const expectedSec = Math.max(5, Math.ceil(analysis.address_count * 0.03) + 4);
  const pct = Math.min(95, Math.round((elapsedSec / expectedSec) * 100));

  const stages = [
    { key: "pending", label: "Queued — waiting for worker pickup" },
    { key: "ingesting", label: "Ingesting on-chain data via Alchemy + running 6 detection methods" },
    { key: "scoring", label: "Scoring + writing evidence" },
  ];
  // Map raw worker status to a friendly stage. "scoring" is mapped to
  // "ingesting" by the worker today; if a future status flips to "scoring"
  // explicitly, the dropdown will pick it up automatically.
  const activeStage = analysis.status === "pending" ? 0 : 1;

  return (
    <section className="mt-6 rounded-lg border border-emerald-700/30 bg-emerald-900/[0.04] p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold">{analysis.name}</h2>
        <span className="font-mono text-xs uppercase tracking-widest text-emerald-300">
          {analysis.status} · {elapsedSec}s elapsed
        </span>
      </div>
      <p className="mt-1 text-sm text-zinc-400">
        {analysis.address_count.toLocaleString()} addresses
        {analysis.preset && (
          <>
            {" "}
            · <span className="font-mono">preset={analysis.preset}</span>
          </>
        )}
        {analysis.mode === "cluster_only" && (
          <>
            {" "}
            · <span className="font-mono text-amber-300">cluster-only</span>
          </>
        )}
      </p>

      {/* Live progress bar — animates each second via the tick state */}
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className="h-full bg-emerald-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-zinc-500">
        <span>~{Math.max(0, expectedSec - elapsedSec)}s remaining</span>
        <span>auto-refreshing every 2s</span>
      </div>

      {/* Stage list with the active stage highlighted */}
      <ol className="mt-6 space-y-3 text-sm">
        {stages.map((s, i) => {
          const done = i < activeStage;
          const active = i === activeStage;
          return (
            <li key={s.key} className="flex items-center gap-3">
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full font-mono text-[10px] ${
                  done
                    ? "bg-emerald-600 text-white"
                    : active
                      ? "bg-emerald-500/30 text-emerald-300 ring-2 ring-emerald-500"
                      : "bg-zinc-800 text-zinc-500"
                }`}
                aria-hidden
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={done ? "text-zinc-400 line-through" : active ? "text-zinc-100" : "text-zinc-500"}>
                {s.label}
              </span>
              {active && (
                <span className="ml-2 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-6 text-xs text-zinc-500">
        Stay on this page — results will appear automatically. No need to refresh.
      </p>
    </section>
  );
}
