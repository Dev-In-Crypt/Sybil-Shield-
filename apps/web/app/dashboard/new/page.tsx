"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Mirror of apps/api/src/lib/presets.ts descriptions — duplicated here so the
// form can render preset summaries without an extra round-trip.
const PRESETS = [
  {
    key: "balanced",
    name: "Balanced",
    desc: "Default symmetric threshold around the model's separability point. Pick this if unsure.",
    drop: "score ≥ 80",
    review: "score ≥ 50",
  },
  {
    key: "airdrop",
    name: "Airdrop",
    desc: "Aggressive filtering for token distributions — both score AND cluster signals trigger DROP.",
    drop: "score ≥ 85 OR cluster_size ≥ 50",
    review: "score ≥ 60 OR cluster_size ≥ 20",
  },
  {
    key: "dao",
    name: "DAO voting",
    desc: "Conservative — false-positives matter more in governance contexts. Cluster signal preferred.",
    drop: "score ≥ 90 OR cluster_size ≥ 30",
    review: "score ≥ 50 OR cluster_size ≥ 10",
  },
  {
    key: "grant",
    name: "Grant committee",
    desc: "Cluster-first — verify whether applicants are connected entities. Ignores low-volume score signal.",
    drop: "cluster_size ≥ 20",
    review: "cluster_size ≥ 5 OR score ≥ 70",
  },
] as const;

type PresetKey = (typeof PRESETS)[number]["key"];

const CHAINS = ["ethereum", "arbitrum", "optimism", "base", "polygon"] as const;

export default function NewAnalysisPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [chains, setChains] = useState<string[]>(["ethereum"]);
  const [preset, setPreset] = useState<PresetKey>("balanced");
  const [mode, setMode] = useState<"full" | "cluster_only">("full");
  const [addresses, setAddresses] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const MAX_ADDRESSES = 1000;
  const validCount = addresses.length;
  const overLimit = validCount > MAX_ADDRESSES;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setFileName(f.name);
    setParseError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      const lines = text.split(/\r?\n/);
      const out: string[] = [];
      const seen = new Set<string>();
      for (const line of lines) {
        // CSV-tolerant: take the first comma-separated cell.
        const cell = (line.split(",")[0] ?? "").trim().toLowerCase();
        if (/^0x[0-9a-f]{40}$/.test(cell) && !seen.has(cell)) {
          seen.add(cell);
          out.push(cell);
        }
      }
      if (out.length === 0) {
        setParseError("No valid Ethereum addresses found. Each line should start with 0x… (40 hex).");
      }
      setAddresses(out);
    };
    reader.onerror = () => setParseError("Could not read file.");
    reader.readAsText(f);
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
      setSubmitError(`Free tier limit is ${MAX_ADDRESSES} addresses. Trim the file or contact us for higher.`);
      return;
    }
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

      <section className="mt-6 space-y-2">
        <label className="text-xs uppercase tracking-wider text-zinc-500">Addresses</label>
        <input
          type="file"
          accept=".csv,.txt"
          onChange={handleFile}
          className="block w-full text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-4 file:py-2 file:text-sm file:text-zinc-200 hover:file:bg-zinc-700"
        />
        <p className="text-xs text-zinc-500">
          CSV or plain text, one address per line. First comma-separated cell is parsed.{" "}
          <strong>Free tier:</strong> up to {MAX_ADDRESSES.toLocaleString()} addresses · 1 analysis at a time · 1 MB
          upload · 100 billable POSTs / month (dashboard polling + reads are free).
        </p>
        {fileName && (
          <p className="text-xs text-zinc-400">
            <span className="font-mono">{fileName}</span> — parsed{" "}
            <span className={overLimit ? "text-rose-400" : "text-emerald-400"}>{validCount.toLocaleString()}</span>{" "}
            valid addresses {overLimit && <span className="text-rose-400">(over limit)</span>}
          </p>
        )}
        {parseError && <p className="text-xs text-rose-400">{parseError}</p>}
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
