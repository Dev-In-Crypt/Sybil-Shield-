"use client";

import { useEffect, useState } from "react";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

const PRESETS: Record<string, { m: string; p: string; b: string }> = {
  register: { m: "POST", p: "/v1/account/register", b: `{\n  "email": "demo@example.com"\n}` },
  score: { m: "GET", p: "/v1/score/0xa12b00000000000000000000000000000000c4d7", b: "" },
  create: { m: "POST", p: "/v1/analyses", b: `{\n  "name":"test",\n  "chains":["ethereum"],\n  "addresses":["0x0000000000000000000000000000000000000001"]\n}` },
  list: { m: "GET", p: "/v1/analyses", b: "" },
  appeal: { m: "POST", p: "/v1/appeals", b: `{\n  "address":"0xa12b00000000000000000000000000000000c4d7",\n  "chain":"ethereum",\n  "reason":"I am a real user with verified ENS since 2019."\n}` },
  watchlist: { m: "POST", p: "/v1/watchlist", b: `{\n  "address":"0x0000000000000000000000000000000000000001",\n  "chain":"ethereum"\n}` },
};

export default function PlaygroundPage() {
  const [method, setMethod] = useState("GET");
  const [path, setPath] = useState("/v1/account");
  const [base, setBase] = useState(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001");
  const [apiKey, setApiKey] = useState("");
  const [body, setBody] = useState("");
  const [status, setStatus] = useState<string>("—");
  const [statusOk, setStatusOk] = useState<boolean | null>(null);
  const [resp, setResp] = useState<string>("// waiting for first request…");

  useEffect(() => {
    setApiKey(localStorage.getItem("sybilshield_api_key") || "");
  }, []);

  function loadPreset(name: string) {
    const p = PRESETS[name];
    if (!p) return;
    setMethod(p.m);
    setPath(p.p);
    setBody(p.b);
  }

  async function send() {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;
    setStatus("sending…");
    setStatusOk(null);
    setResp("");
    try {
      const opts: RequestInit = { method, headers };
      if (method !== "GET" && body) opts.body = body;
      const t0 = performance.now();
      const r = await fetch(base.replace(/\/$/, "") + path, opts);
      const t1 = performance.now();
      const txt = await r.text();
      let pretty = txt;
      try { pretty = JSON.stringify(JSON.parse(txt), null, 2); } catch {}
      setStatus(`${r.status} ${r.statusText} · ${Math.round(t1 - t0)}ms`);
      setStatusOk(r.ok);
      setResp(pretty || "(empty body)");
    } catch (e: any) {
      setStatus("network error");
      setStatusOk(false);
      setResp(`// ${e.message}\n// is API up? curl ${base}/health`);
    }
  }

  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-8 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">// interactive</p>
        <h1 className="mt-3 font-mono text-5xl font-bold tracking-tight">// API PLAYGROUND</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">Send real requests to a localhost SybilShield API. API key from localStorage.</p>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">// presets:</span>
          {Object.keys(PRESETS).map((k) => (
            <button key={k} onClick={() => loadPreset(k)} className="border border-white/10 bg-zinc-950 px-3 py-1 font-mono text-[11px] text-lime-300 hover:border-lime-300">{k}</button>
          ))}
        </div>

        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="border border-white/10 bg-zinc-900 p-6">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">// request</h4>
            <div className="mt-3 flex gap-2">
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="w-24 border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm">
                {["GET", "POST", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}
              </select>
              <input value={path} onChange={(e) => setPath(e.target.value)} placeholder="/v1/..." className="flex-1 border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm" />
            </div>
            <div className="mt-3 flex gap-2">
              <input value={base} onChange={(e) => setBase(e.target.value)} className="flex-1 border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm" />
              <input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); localStorage.setItem("sybilshield_api_key", e.target.value); }} placeholder="sk_live_..." className="flex-1 border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-sm" />
            </div>
            <h4 className="mt-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">// body</h4>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="{}" rows={14} className="mt-2 w-full border border-white/10 bg-zinc-950 p-3 font-mono text-xs text-zinc-300" />
            <button onClick={send} className="mt-4 w-fit border-2 border-lime-300 bg-lime-300 px-6 py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-black hover:bg-transparent hover:text-lime-300">
              send →
            </button>
          </div>

          <div className="border border-white/10 bg-zinc-900 p-6">
            <h4 className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">
              // response · <span className={statusOk === null ? "text-zinc-500" : statusOk ? "text-lime-300" : "text-rose-400"}>{status}</span>
            </h4>
            <pre className="mt-3 min-h-[400px] overflow-auto whitespace-pre-wrap border border-white/10 bg-zinc-950 p-3 font-mono text-xs text-zinc-300">{resp}</pre>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
