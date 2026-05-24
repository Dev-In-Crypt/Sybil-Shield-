"use client";

import { useMemo, useState } from "react";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

const callsSteps = [100, 1000, 10000, 50000, 250000, 1000000, 10000000];
const addrSteps = [1000, 10000, 50000, 100000, 250000, 500000, 1000000];

const fmt = (n: number) =>
  n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` :
  n >= 1000 ? `${(n / 1000).toFixed(n % 1000 ? 1 : 0)}K` :
  String(n);
const money = (n: number) => "$" + Math.round(n).toLocaleString();

export default function CalculatorPage() {
  const [callsIdx, setCallsIdx] = useState(2);
  const [analyses, setAnalyses] = useState(2);
  const [addrsIdx, setAddrsIdx] = useState(3);
  const [evidence, setEvidence] = useState(true);
  const [multichain, setMultichain] = useState(true);
  const [sla, setSla] = useState(false);
  const [customModel, setCustomModel] = useState(false);
  const [dedicated, setDedicated] = useState(false);

  const calls = callsSteps[callsIdx]!;
  const addrs = addrSteps[addrsIdx]!;

  const quote = useMemo(() => {
    const freeFit = calls <= 100;
    const devFit = calls <= 50000 && !sla && !customModel && !dedicated;
    const growthFit = calls <= 250000 && !customModel && !dedicated;
    const entFit = true;

    let perA = addrs <= 100000 ? 2500 : addrs <= 500000 ? 7500 : 15000 + Math.ceil((addrs - 500000) / 100000) * 2000;
    if (multichain) perA *= 1.15;
    if (sla) perA *= 1.1;
    const perATotal = perA * analyses;

    let sub = 0;
    if (freeFit) sub = 0;
    else if (devFit) sub = 499;
    else if (growthFit) sub = 1499;
    else sub = 4999;

    return { freeFit, devFit, growthFit, entFit, perATotal, sub, annual: perATotal * 12 + sub * 12 };
  }, [calls, addrs, analyses, multichain, sla, customModel, dedicated]);

  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-8 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">// estimate</p>
        <h1 className="mt-3 font-mono text-5xl font-bold tracking-tight">// CALCULATOR</h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-400">Slide to your volume. Cheapest fitting tier highlighted live.</p>

        <div className="mt-12 border border-white/10 bg-zinc-900 p-8">
          <Slider label="// monthly_api_calls" value={fmt(calls)} max={6} step={1} v={callsIdx} onChange={setCallsIdx} ticks={callsSteps.map(fmt)} />
          <Slider label="// per-analysis_batches / month" value={String(analyses)} max={10} step={1} v={analyses} onChange={setAnalyses} />
          <Slider label="// addresses_per_analysis" value={fmt(addrs)} max={6} step={1} v={addrsIdx} onChange={setAddrsIdx} ticks={addrSteps.map(fmt)} />
          <div className="mt-8 flex flex-wrap gap-2">
            <Toggle on={evidence} onClick={() => setEvidence(!evidence)} label="evidence per address" />
            <Toggle on={multichain} onClick={() => setMultichain(!multichain)} label="multi-chain (4+)" />
            <Toggle on={sla} onClick={() => setSla(!sla)} label="SLA 99.9%" />
            <Toggle on={customModel} onClick={() => setCustomModel(!customModel)} label="custom-trained model" />
            <Toggle on={dedicated} onClick={() => setDedicated(!dedicated)} label="dedicated instance" />
          </div>
        </div>

        <div className="mt-8 grid gap-px bg-white/10 md:grid-cols-4">
          <Plan label="// free" v="$0" hi={quote.freeFit && !quote.devFit ? false : quote.freeFit} dim={!quote.freeFit} note={quote.freeFit ? "covers" : "exceeds"} />
          <Plan label="// developer" v="$499/mo" hi={!quote.freeFit && quote.devFit} dim={!quote.devFit} note={quote.devFit ? "covers" : "exceeds"} />
          <Plan label="// growth" v="$1,499/mo" hi={!quote.devFit && quote.growthFit} dim={!quote.growthFit} note={quote.growthFit ? "covers" : "exceeds"} />
          <Plan label="// enterprise" v="$4,999+/mo" hi={!quote.growthFit} dim={false} note="always fits" />
        </div>

        <div className="mt-8 grid gap-6 border border-white/10 bg-zinc-900 p-8 md:grid-cols-3">
          <div><div className="font-mono text-xs uppercase text-zinc-500">// per-analysis</div><div className="mt-2 font-mono text-3xl font-bold text-lime-300">{money(quote.perATotal)}</div></div>
          <div><div className="font-mono text-xs uppercase text-zinc-500">// monthly sub</div><div className="mt-2 font-mono text-3xl font-bold text-lime-300">{money(quote.sub)}</div></div>
          <div><div className="font-mono text-xs uppercase text-zinc-500">// year-1 estimate</div><div className="mt-2 font-mono text-3xl font-bold text-lime-300">{money(quote.annual)}</div></div>
        </div>

        <p className="mt-6 font-mono text-xs text-zinc-500">// non-binding estimates · email support@sybilshield.org to lock</p>
      </main>
      <SiteFooter />
    </>
  );
}

function Slider({ label, value, max, step, v, onChange, ticks }: { label: string; value: string; max: number; step: number; v: number; onChange: (n: number) => void; ticks?: string[] }) {
  return (
    <div className="mt-6">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</span>
        <span className="font-mono text-2xl font-bold text-lime-300">{value}</span>
      </div>
      <input type="range" min={0} max={max} step={step} value={v} onChange={(e) => onChange(Number(e.target.value))} className="mt-2 w-full" />
      {ticks && (
        <div className="mt-1 flex justify-between font-mono text-[10px] text-zinc-600">
          {ticks.map((t, i) => <span key={i}>{t}</span>)}
        </div>
      )}
    </div>
  );
}

function Toggle({ on, onClick, label }: { on: boolean; onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className={`border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.15em] ${on ? "border-lime-300 bg-lime-300 text-black" : "border-white/10 bg-zinc-950 text-zinc-400 hover:border-lime-300/40 hover:text-lime-300"}`}>
      {label}
    </button>
  );
}

function Plan({ label, v, hi, dim, note }: { label: string; v: string; hi: boolean; dim: boolean; note: string }) {
  return (
    <div className={`bg-black p-6 ${hi ? "ring-1 ring-lime-300/40" : ""} ${dim ? "opacity-40" : ""}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{label}</div>
      <div className="mt-2 font-mono text-2xl font-bold">{v}</div>
      <div className="mt-2 font-mono text-[11px] text-zinc-500">{note}</div>
    </div>
  );
}
