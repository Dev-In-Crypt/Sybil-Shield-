import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

export const metadata = { title: "Embeddable widget · SybilShield" };

const EMBED_SNIPPET = `<!-- Put this where you want the badge to appear -->
<span data-sybilshield-address="0xd8da6bf26964af9d7eed9e03e53415d37aa96045"></span>

<!-- Once per page, anywhere -->
<script src="https://www.sybilshield.org/widget.js" async></script>`;

const STATES: Array<{ label: string; meaning: string; color: string }> = [
  { label: "Looks clean", meaning: "Decision is KEEP, or no decision on record but sybil_score is low", color: "text-emerald-400" },
  { label: "Under review", meaning: "Decision is REVIEW — uncertain, not confirmed", color: "text-amber-400" },
  { label: "Sybil risk flagged", meaning: "Decision is DROP, or no decision but sybil_score ≥ 70", color: "text-rose-400" },
  { label: "Not yet scored", meaning: "The address has never been part of any SybilShield analysis", color: "text-zinc-400" },
  { label: "Unable to check", meaning: "Network error — the widget degrades honestly instead of guessing", color: "text-zinc-400" },
];

export default function WidgetDocsPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-8 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">// embeddable</p>
        <h1 className="mt-3 font-mono text-5xl font-bold tracking-tight">// SCORE BADGE WIDGET</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Show a SybilShield decision inline on your own claim page, airdrop checker, or DAO dashboard — one
          script tag, no backend integration.
        </p>

        <div className="mt-10 rounded border border-amber-700/40 bg-amber-900/10 p-5 text-sm text-amber-200">
          <strong>MVP scope — read this first.</strong> The widget shows whatever decision SybilShield already
          has on record for an address. It does <strong>not</strong> run a fresh analysis on first sight, and it
          does <strong>not</strong> block anything on your page — it&apos;s a display badge, not a gate. An
          address nobody has ever submitted to SybilShield shows honestly as &quot;Not yet scored&quot;, never a
          false &quot;clean&quot; result. Real-time first-sight scoring is a tracked stretch goal (TODO-308), not
          built yet.
        </div>

        <section className="mt-12">
          <h2 className="font-mono text-xl font-bold">// embed</h2>
          <pre className="mt-4 overflow-x-auto border border-white/10 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">{EMBED_SNIPPET}</pre>
          <p className="mt-3 text-sm text-zinc-500">
            Every element with <code className="font-mono text-emerald-300">data-sybilshield-address</code> on the
            page gets its own badge — safe to use in a list of many addresses.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-xl font-bold">// states</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-2">Badge</th>
                  <th>Meaning</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {STATES.map((s) => (
                  <tr key={s.label}>
                    <td className={`py-2 pr-4 font-mono ${s.color}`}>{s.label}</td>
                    <td className="py-2 text-zinc-400">{s.meaning}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-xl font-bold">// options</h2>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>
              <code className="font-mono text-emerald-300">data-sybilshield-api</code> — point at a self-hosted
              SybilShield API instead of the public sandbox. Defaults to{" "}
              <code className="font-mono text-zinc-400">https://api.sybilshield.org</code>.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="font-mono text-xl font-bold">// under the hood</h2>
          <p className="mt-3 text-sm text-zinc-400">
            One <code className="font-mono text-emerald-300">GET /v1/score/:address</code> call per badge, against
            the same free, unauthenticated, public endpoint documented on{" "}
            <a className="text-emerald-400 hover:underline" href="/docs">/docs</a>. No API key, no cookies, no
            tracking — the widget only talks to the SybilShield API (or your self-hosted override) and nothing
            else.
          </p>
        </section>

        <div className="mt-12 border border-lime-300/30 bg-lime-300/[0.05] p-6">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-lime-300">// next_steps</p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>› <a className="text-lime-300 underline" href="/docs">Full API reference</a></li>
            <li>› <a className="text-lime-300 underline" href="/methodology">Methodology</a> — how a decision is computed</li>
            <li>› <a className="text-lime-300 underline" href="/dashboard/new">Run an analysis</a> — score a cohort so the widget has something to show</li>
          </ul>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
