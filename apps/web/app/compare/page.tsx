import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Compare · SybilShield" };

const ROWS: Array<[string, string, string, string, string, string]> = [
  ["api_first", "✓", "—", "—", "—", "✓"],
  ["price_per_analysis", "$1-3K", "$50-150K", "$80-200K", "4 weeks", "free"],
  ["turnaround", "hours", "4-8 weeks", "4-8 weeks", "2-4 weeks", "hours"],
  ["open_methodology", "—", "—", "—", "(your own)", "MIT"],
  ["evidence_per_address", "—", "manual PDF", "manual PDF", "—", "structured JSON"],
  ["immutable_audit_log", "—", "—", "compliance", "—", "every event"],
  ["public_appeal_flow", "—", "—", "—", "—", "48h SLA"],
  ["cross_chain_linking", "limited", "partial", "strong", "manual", "8 chains"],
  ["ml_ensemble", "✓", "—", "✓", "—", "LightGBM"],
  ["webhook_notifications", "—", "—", "enterprise", "—", "HMAC-signed"],
  ["free_tier", "limited", "—", "—", "your time", "100/mo + lookup"],
  ["multi_seat_team", "ent", "✓", "✓", "n/a", "all plans"],
];

export default function ComparePage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-8 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-purple-400">// vs the world</p>
        <h1 className="mt-3 font-mono text-5xl font-bold tracking-tight">// COMPARE</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">
          Side-by-side with Trusta Labs, Nansen, Chainalysis, and DIY Dune. Honest scoring — "—" where we don't yet match.
        </p>

        <div className="mt-12 overflow-x-auto border border-white/10 bg-black/40">
          <table className="w-full font-mono text-xs">
            <thead className="bg-white/5">
              <tr className="text-left text-[10px] uppercase tracking-[0.2em] text-zinc-500">
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4">Trusta</th>
                <th className="px-6 py-4">Nansen</th>
                <th className="px-6 py-4">Chainalysis</th>
                <th className="px-6 py-4">DIY Dune</th>
                <th className="bg-lime-300/10 px-6 py-4 text-lime-300">SybilShield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {ROWS.map((r) => (
                <tr key={r[0]} className="hover:bg-white/[0.02]">
                  <td className="px-6 py-3 text-zinc-300">{r[0]}</td>
                  <td className="px-6 py-3 text-zinc-500">{r[1]}</td>
                  <td className="px-6 py-3 text-zinc-500">{r[2]}</td>
                  <td className="px-6 py-3 text-zinc-500">{r[3]}</td>
                  <td className="px-6 py-3 text-zinc-500">{r[4]}</td>
                  <td className="bg-lime-300/5 px-6 py-3 text-lime-300">{r[5]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 font-mono text-xs text-zinc-600">// competitor figures are approximate, sourced from public pricing pages — verify independently before quoting</p>
      </main>
      <SiteFooter />
    </>
  );
}
