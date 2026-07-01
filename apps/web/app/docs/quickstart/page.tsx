import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

export const metadata = { title: "Quickstart · SybilShield" };

const STEPS = [
  { t: "register an account", d: "No card. Free public sandbox — 100 calls/month (fair use).", c: `curl -X POST http://localhost:3001/v1/account/register \\\n  -H 'content-type: application/json' \\\n  -d '{"email":"you@example.com"}'`, n: "response includes api_key shown ONCE — save it" },
  { t: "score a single address", d: "Cached lookup against any address SybilShield has scored before.", c: `curl http://localhost:3001/v1/score/0xa12b00000000000000000000000000000000c4d7 \\\n  -H "Authorization: Bearer $YOUR_KEY"`, n: "" },
  { t: "create a batch analysis", d: "Submit 10K–1M addresses → scores + clusters + evidence.", c: `curl -X POST http://localhost:3001/v1/analyses \\\n  -H "Authorization: Bearer $YOUR_KEY" \\\n  -H 'content-type: application/json' \\\n  -d '{"name":"first","chains":["ethereum"],"addresses":["0x...","0x..."]}'`, n: "status: pending → ingesting → analyzing → scoring → complete" },
  { t: "poll or use webhook", d: "For longer analyses configure webhook URL at /dashboard/api-keys.", c: `curl http://localhost:3001/v1/analyses/$ID \\\n  -H "Authorization: Bearer $YOUR_KEY"`, n: "" },
  { t: "fetch scored results", d: "Paginated. Filter by label.", c: `curl "http://localhost:3001/v1/analyses/$ID/results?label=sybil&limit=100" \\\n  -H "Authorization: Bearer $YOUR_KEY"`, n: "or export full CSV: /v1/analyses/:id/results/export" },
];

export default function QuickstartPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-8 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">// 5 min from zero</p>
        <h1 className="mt-3 font-mono text-5xl font-bold tracking-tight">// QUICKSTART</h1>
        <p className="mt-4 max-w-xl text-lg text-zinc-400">Register, get a key, run your first analysis.</p>

        <div className="mt-12 space-y-8">
          {STEPS.map((s, i) => (
            <div key={i} className="flex gap-6">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-lime-300/50 bg-lime-300/10 font-mono text-lg font-bold text-lime-300">{i + 1}</div>
              <div className="flex-1">
                <h3 className="font-mono text-xl font-bold">{s.t}</h3>
                <p className="mt-2 text-zinc-400">{s.d}</p>
                <pre className="mt-3 overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">{s.c}</pre>
                {s.n && <p className="mt-2 font-mono text-xs text-zinc-500">// {s.n}</p>}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 border border-lime-300/30 bg-lime-300/[0.05] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime-300">// next_steps</p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>› <a className="text-lime-300 underline" href="/docs/api-playground">API playground</a> — try every endpoint in your browser</li>
            <li>› <a className="text-lime-300 underline" href="/docs">Full API reference</a></li>
            <li>› <a className="text-lime-300 underline" href="/methodology">Methodology</a> — how the 6 methods work</li>
            <li>› <a className="text-lime-300 underline" href="/dashboard">Dashboard</a> — visual UI</li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
