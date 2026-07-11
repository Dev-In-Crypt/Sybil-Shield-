"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type PresetKey = "balanced" | "airdrop" | "dao" | "grant";

// Structured preset thresholds — mirror of apps/api/src/lib/presets.ts, used
// both as the placeholder source for the advanced override inputs AND (via
// describeRule below) to derive the human-readable drop/review strings. This
// is the ONLY hand-copied source; previously a second, separately hand-typed
// copy of the display strings existed here and had already drifted from
// canonical (grant.review order was reversed). Single source now — see
// TODO-206 / the same class of bug TODO-205 fixed on the analysis detail page.
const PRESET_THRESHOLDS: Record<
  PresetKey,
  {
    drop: { score_gte: number | null; cluster_size_gte: number | null };
    review: { score_gte: number | null; cluster_size_gte: number | null };
  }
> = {
  balanced: { drop: { score_gte: 80, cluster_size_gte: null }, review: { score_gte: 50, cluster_size_gte: null } },
  airdrop: { drop: { score_gte: 85, cluster_size_gte: 50 }, review: { score_gte: 60, cluster_size_gte: 20 } },
  dao: { drop: { score_gte: 90, cluster_size_gte: 30 }, review: { score_gte: 50, cluster_size_gte: 10 } },
  grant: { drop: { score_gte: null, cluster_size_gte: 20 }, review: { score_gte: 70, cluster_size_gte: 5 } },
};

/** Mirror of apps/api/src/lib/presets.ts describeRule — keep the algorithm identical. */
function describeRule(rule: { score_gte: number | null; cluster_size_gte: number | null }): string {
  const parts: string[] = [];
  if (rule.score_gte !== null) parts.push(`score ≥ ${rule.score_gte}`);
  if (rule.cluster_size_gte !== null) parts.push(`cluster_size ≥ ${rule.cluster_size_gte}`);
  return parts.length > 0 ? parts.join(" OR ") : "—";
}

const PRESETS = [
  {
    key: "balanced" as PresetKey,
    name: "Balanced",
    desc: "Default symmetric threshold around the model's separability point. Pick this if unsure.",
  },
  {
    key: "airdrop" as PresetKey,
    name: "Airdrop",
    desc: "Aggressive filtering for token distributions — both score AND cluster signals trigger DROP.",
  },
  {
    key: "dao" as PresetKey,
    name: "DAO voting",
    desc: "Conservative — false-positives matter more in governance contexts. Cluster signal preferred.",
  },
  {
    key: "grant" as PresetKey,
    name: "Grant committee",
    desc: "Cluster-first — verify whether applicants are connected entities. Ignores low-volume score signal.",
  },
].map((p) => ({
  ...p,
  drop: describeRule(PRESET_THRESHOLDS[p.key].drop),
  review: describeRule(PRESET_THRESHOLDS[p.key].review),
}));

const CHAINS = ["ethereum", "arbitrum", "optimism", "base", "polygon"] as const;

/**
 * Parse addresses out of free text (file contents OR a pasted textarea).
 * CSV-tolerant: takes the first comma-separated cell of each line, lowercases,
 * validates against the EVM address regex, and dedupes. Shared by both the
 * file-upload and paste inputs so they behave identically.
 */
function parseAddresses(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const cell = (line.split(",")[0] ?? "").trim().toLowerCase();
    if (/^0x[0-9a-f]{40}$/.test(cell) && !seen.has(cell)) {
      seen.add(cell);
      out.push(cell);
    }
  }
  return out;
}

const ENS_NAME_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.eth$/i;
// Deliberately conservative (TODO-104 note): resolving each name costs a
// server-side Alchemy RPC call (rate-limited to 20/min on that route), and
// resolution only ever runs on an explicit button click, never on keystroke.
const MAX_ENS_PER_RESOLVE = 20;

/** Extract unique *.eth candidates from the same cell-parsed lines as parseAddresses. */
function extractEnsNames(text: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const cell = (line.split(",")[0] ?? "").trim().toLowerCase();
    if (ENS_NAME_RE.test(cell) && !seen.has(cell)) {
      seen.add(cell);
      out.push(cell);
    }
  }
  return out;
}

/**
 * Resolve ENS names via GET /v1/resolve/:name (public, mainnet-only, no API
 * key). Ethereum-mainnet ENS is the only supported chain per TODO-104.
 */
async function resolveEnsNames(
  names: string[],
): Promise<{ addresses: string[]; failed: string[] }> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  const attempted = names.slice(0, MAX_ENS_PER_RESOLVE);
  const results = await Promise.all(
    attempted.map(async (name) => {
      try {
        const r = await fetch(`${base}/v1/resolve/${encodeURIComponent(name)}`);
        if (!r.ok) return { name, address: null as string | null };
        const j = (await r.json()) as { address?: string };
        return { name, address: typeof j.address === "string" ? j.address.toLowerCase() : null };
      } catch {
        return { name, address: null as string | null };
      }
    }),
  );
  return {
    addresses: results.filter((r) => r.address).map((r) => r.address!),
    failed: results.filter((r) => !r.address).map((r) => r.name),
  };
}

export default function NewAnalysisPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [chains, setChains] = useState<string[]>(["ethereum"]);
  const [preset, setPreset] = useState<PresetKey>("balanced");
  const [mode, setMode] = useState<"full" | "cluster_only">("full");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [pasteText, setPasteText] = useState<string>("");
  const [inputMode, setInputMode] = useState<"file" | "paste">("file");
  const [parseError, setParseError] = useState<string | null>(null);
  // ENS names (*.eth) found in the input. Never resolved automatically — only
  // on explicit "Resolve" click, so pasting/typing never fires a network call.
  const [ensCandidates, setEnsCandidates] = useState<string[]>([]);
  const [ensResolving, setEnsResolving] = useState(false);
  const [ensFailed, setEnsFailed] = useState<string[]>([]);
  const [ensResolvedCount, setEnsResolvedCount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Advanced per-analysis threshold overrides. Empty string = leave at the
  // preset default. Keyed as drop/review × score/cluster.
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [ovr, setOvr] = useState({
    dropScore: "",
    dropCluster: "",
    reviewScore: "",
    reviewCluster: "",
  });

  const MAX_ADDRESSES = 1000;
  const validCount = addresses.length;
  const overLimit = validCount > MAX_ADDRESSES;

  function resetEnsState() {
    setEnsCandidates([]);
    setEnsFailed([]);
    setEnsResolvedCount(0);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setParseError(null);
    resetEnsState();
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const out = parseAddresses(text);
      if (out.length === 0) {
        setParseError("No valid Ethereum addresses found. Each line should start with 0x… (40 hex).");
      }
      setAddresses(out);
      setEnsCandidates(extractEnsNames(text));
    };
    reader.onerror = () => setParseError("Could not read file.");
    reader.readAsText(f);
  }

  function handlePaste(text: string) {
    setPasteText(text);
    setParseError(null);
    const out = parseAddresses(text);
    const ensNames = extractEnsNames(text);
    // Only complain about "no valid addresses" when there's nothing at all to
    // work with — a paste of pure *.eth names is valid input, just pending
    // resolution, not an error.
    if (text.trim() && out.length === 0 && ensNames.length === 0) {
      setParseError("No valid Ethereum addresses found. One 0x… (40 hex) per line.");
    }
    setAddresses(out);
    setEnsCandidates(ensNames);
    setEnsFailed([]);
    setEnsResolvedCount(0);
  }

  async function handleResolveEns() {
    if (ensCandidates.length === 0) return;
    setEnsResolving(true);
    try {
      const { addresses: resolved, failed } = await resolveEnsNames(ensCandidates);
      setAddresses((cur) => {
        const seen = new Set(cur);
        const merged = [...cur];
        for (const addr of resolved) {
          if (!seen.has(addr)) {
            seen.add(addr);
            merged.push(addr);
          }
        }
        return merged;
      });
      setEnsResolvedCount(resolved.length);
      setEnsFailed(failed);
      // Drop resolved (and attempted-but-failed) names from the candidate
      // list; anything past MAX_ENS_PER_RESOLVE stays queued for a re-click.
      const attempted = new Set(ensCandidates.slice(0, MAX_ENS_PER_RESOLVE));
      setEnsCandidates((cur) => cur.filter((n) => !attempted.has(n)));
    } finally {
      setEnsResolving(false);
    }
  }

  function toggleChain(c: string) {
    setChains((cur) => (cur.includes(c) ? cur.filter((x) => x !== c) : [...cur, c]));
  }

  async function submit() {
    setSubmitError(null);
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) {
      setSubmitError("API key missing — log in again on /dashboard.");
      return;
    }
    if (!name.trim()) {
      setSubmitError("Name is required.");
      return;
    }
    if (chains.length === 0) {
      setSubmitError("Select at least one chain.");
      return;
    }
    if (addresses.length === 0) {
      setSubmitError("Upload a CSV with at least one valid address.");
      return;
    }
    if (overLimit) {
      setSubmitError(`Fair-use limit is ${MAX_ADDRESSES} addresses per analysis. Trim the file, or email us for research access.`);
      return;
    }
    // Build threshold_overrides from any non-empty advanced inputs. A blank
    // field is omitted (preset default wins). Only include the object if at
    // least one knob was set.
    const num = (s: string) => (s.trim() === "" ? undefined : Number(s));
    const drop = { score_gte: num(ovr.dropScore), cluster_size_gte: num(ovr.dropCluster) };
    const review = { score_gte: num(ovr.reviewScore), cluster_size_gte: num(ovr.reviewCluster) };
    const dropSet = drop.score_gte !== undefined || drop.cluster_size_gte !== undefined;
    const reviewSet = review.score_gte !== undefined || review.cluster_size_gte !== undefined;
    const thresholdOverrides =
      dropSet || reviewSet
        ? { ...(dropSet ? { drop } : {}), ...(reviewSet ? { review } : {}) }
        : undefined;

    setSubmitting(true);
    try {
      const base = process.env.NEXT_PUBLIC_API_URL;
      const r = await fetch(`${base}/v1/analyses`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          chains,
          addresses,
          preset,
          mode,
          ...(thresholdOverrides ? { threshold_overrides: thresholdOverrides } : {}),
        }),
      });
      const body = await r.json();
      if (!r.ok) {
        setSubmitError(`Submit failed: ${r.status} ${JSON.stringify(body)}`);
        return;
      }
      router.push(`/dashboard/analyses/${body.id}`);
    } catch (e) {
      setSubmitError(String(e));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">New analysis</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Upload a list of wallet addresses, pick a preset, and get back a decision-ready table:
        DROP / REVIEW / KEEP for each address.
      </p>

      <section className="mt-8 space-y-1">
        <label className="text-xs uppercase tracking-wider text-zinc-500">Name</label>
        <input
          className="w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm"
          placeholder="e.g. Linea wave-2 sybil scan"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </section>

      <section className="mt-6 space-y-2">
        <label className="text-xs uppercase tracking-wider text-zinc-500">Chains</label>
        <div className="flex flex-wrap gap-2">
          {CHAINS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => toggleChain(c)}
              className={`rounded border px-3 py-1.5 text-sm font-mono ${
                chains.includes(c)
                  ? "border-emerald-700 bg-emerald-900/30 text-emerald-300"
                  : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <label className="text-xs uppercase tracking-wider text-zinc-500">Preset</label>
        <div className="grid gap-3 sm:grid-cols-2">
          {PRESETS.map((p) => (
            <label
              key={p.key}
              className={`cursor-pointer rounded border p-3 ${
                preset === p.key
                  ? "border-emerald-700 bg-emerald-900/10"
                  : "border-zinc-800 bg-zinc-900 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold">{p.name}</span>
                <input
                  type="radio"
                  name="preset"
                  value={p.key}
                  checked={preset === p.key}
                  onChange={() => setPreset(p.key)}
                  className="h-4 w-4"
                />
              </div>
              <p className="mt-1 text-xs text-zinc-400">{p.desc}</p>
              <div className="mt-2 grid gap-1 font-mono text-[11px] text-zinc-500">
                <div>
                  <span className="text-rose-400">DROP</span> {p.drop}
                </div>
                <div>
                  <span className="text-amber-400">REVIEW</span> {p.review}
                </div>
              </div>
            </label>
          ))}
        </div>
      </section>

      <section className="mt-6 space-y-2">
        <label className="text-xs uppercase tracking-wider text-zinc-500">Mode</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`cursor-pointer rounded border p-3 ${
              mode === "full" ? "border-emerald-700 bg-emerald-900/10" : "border-zinc-800 bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Full scoring</span>
              <input type="radio" checked={mode === "full"} onChange={() => setMode("full")} className="h-4 w-4" />
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              ML model + clusters + evidence. One verdict per address.
            </p>
          </label>
          <label
            className={`cursor-pointer rounded border p-3 ${
              mode === "cluster_only" ? "border-emerald-700 bg-emerald-900/10" : "border-zinc-800 bg-zinc-900"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">Cluster-only</span>
              <input
                type="radio"
                checked={mode === "cluster_only"}
                onChange={() => setMode("cluster_only")}
                className="h-4 w-4"
              />
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Skip ML; return only multi-wallet farm groupings. Strongest signal, no per-address noise.
            </p>
          </label>
        </div>
      </section>

      {/* Advanced threshold overrides — collapsed by default so the simple
          flow is unchanged. Maps to threshold_overrides in the POST body;
          blank fields fall back to the preset. Hidden in cluster-only mode
          (no per-address decision there). */}
      {mode === "full" && (
        <section className="mt-6">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex items-center gap-2 text-xs uppercase tracking-wider text-zinc-500 hover:text-zinc-300"
          >
            <span>{showAdvanced ? "▾" : "▸"}</span> Advanced thresholds (optional)
          </button>
          {showAdvanced && (
            <div className="mt-3 space-y-4 rounded border border-zinc-800 bg-zinc-950 p-4">
              <p className="text-xs text-zinc-500">
                Override the <span className="font-mono text-zinc-400">{preset}</span> preset for this analysis only.
                Leave a field blank to keep the preset default (shown as placeholder). Set{" "}
                <code className="font-mono">0</code> to effectively disable a knob via a lower bound.
              </p>
              {(
                [
                  { label: "DROP if score ≥", key: "dropScore", def: PRESET_THRESHOLDS[preset].drop.score_gte },
                  { label: "DROP if cluster_size ≥", key: "dropCluster", def: PRESET_THRESHOLDS[preset].drop.cluster_size_gte },
                  { label: "REVIEW if score ≥", key: "reviewScore", def: PRESET_THRESHOLDS[preset].review.score_gte },
                  { label: "REVIEW if cluster_size ≥", key: "reviewCluster", def: PRESET_THRESHOLDS[preset].review.cluster_size_gte },
                ] as const
              ).map((row) => (
                <div key={row.key} className="flex items-center justify-between gap-3">
                  <label className="font-mono text-xs text-zinc-400">{row.label}</label>
                  <input
                    type="number"
                    min={0}
                    value={ovr[row.key]}
                    onChange={(e) => setOvr((o) => ({ ...o, [row.key]: e.target.value }))}
                    placeholder={row.def === null ? "disabled" : String(row.def)}
                    className="w-28 rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-right font-mono text-xs text-zinc-200 placeholder:text-zinc-600"
                  />
                </div>
              ))}
              <p className="text-[10px] text-zinc-600">
                Rows decided with an override carry a <code className="font-mono">custom_thresholds</code> rationale
                code and the override is stored on the analysis.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="mt-6 space-y-2">
        <label className="text-xs uppercase tracking-wider text-zinc-500">Addresses</label>

        {/* Input-mode tabs: upload a file, or paste addresses directly. */}
        <div className="flex gap-2">
          {(["file", "paste"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setInputMode(m);
                setParseError(null);
              }}
              className={`rounded px-3 py-1 text-xs font-mono uppercase tracking-wider ${
                inputMode === m
                  ? "bg-emerald-900/30 text-emerald-300 border border-emerald-700"
                  : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:border-zinc-700"
              }`}
            >
              {m === "file" ? "Upload file" : "Paste"}
            </button>
          ))}
        </div>

        {inputMode === "file" ? (
          <input
            type="file"
            accept=".csv,.txt"
            onChange={handleFile}
            className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
          />
        ) : (
          <textarea
            value={pasteText}
            onChange={(e) => handlePaste(e.target.value)}
            rows={6}
            spellCheck={false}
            placeholder={"0xd8da6bf26964af9d7eed9e03e53415d37aa96045\n0xab5801a7d398351b8be11c439e05c5b3259aec9b\n…"}
            className="block w-full rounded border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-xs text-zinc-200 placeholder:text-zinc-600"
          />
        )}

        <p className="text-xs text-zinc-500">
          CSV or plain text, one address per line. First comma-separated cell is parsed.{" "}
          <strong>Public sandbox (fair use):</strong> up to {MAX_ADDRESSES.toLocaleString()} addresses · 1 analysis at a time · 1 MB
          upload · 100 write calls / month (dashboard polling + reads are free).
        </p>
        {inputMode === "file" && fileName && (
          <p className="text-xs text-zinc-400">
            <span className="font-mono">{fileName}</span> — parsed{" "}
            <span className={overLimit ? "text-rose-400" : "text-emerald-400"}>{validCount.toLocaleString()}</span>{" "}
            valid addresses {overLimit && <span className="text-rose-400">(over limit)</span>}
          </p>
        )}
        {inputMode === "paste" && validCount > 0 && (
          <p className="text-xs text-zinc-400">
            parsed{" "}
            <span className={overLimit ? "text-rose-400" : "text-emerald-400"}>{validCount.toLocaleString()}</span>{" "}
            valid addresses {overLimit && <span className="text-rose-400">(over limit)</span>}
          </p>
        )}
        {parseError && <p className="text-xs text-rose-400">{parseError}</p>}

        {ensCandidates.length > 0 && (
          <div className="rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400">
            <span>
              {ensCandidates.length} ENS name{ensCandidates.length === 1 ? "" : "s"} detected (Ethereum mainnet only)
              {ensCandidates.length > MAX_ENS_PER_RESOLVE && (
                <> — resolving {MAX_ENS_PER_RESOLVE} at a time</>
              )}
              .
            </span>{" "}
            <button
              type="button"
              onClick={handleResolveEns}
              disabled={ensResolving}
              className="rounded border border-emerald-700/50 bg-emerald-900/20 px-2 py-0.5 text-emerald-300 hover:bg-emerald-900/40 disabled:opacity-50"
            >
              {ensResolving ? "Resolving…" : "Resolve"}
            </button>
          </div>
        )}
        {ensResolvedCount > 0 && (
          <p className="text-xs text-emerald-400">
            ✓ Resolved {ensResolvedCount} ENS name{ensResolvedCount === 1 ? "" : "s"} to address
            {ensResolvedCount === 1 ? "" : "es"}.
          </p>
        )}
        {ensFailed.length > 0 && (
          <p className="text-xs text-amber-400">
            Could not resolve: {ensFailed.join(", ")} — no address record, or ENS resolution isn&apos;t
            configured on this deployment.
          </p>
        )}
      </section>

      <section className="mt-8 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={submit}
          disabled={submitting || addresses.length === 0 || overLimit}
          className="rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Start analysis"}
        </button>
        {submitError && <p className="text-sm text-rose-400">{submitError}</p>}
      </section>
    </main>
  );
}
