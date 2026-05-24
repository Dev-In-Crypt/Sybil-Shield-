import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Sub-processors · SybilShield" };

const VENDORS = [
  ["Vercel", "Frontend hosting", "HTTP logs, IP", "USA · global edge", "https://vercel.com/legal/dpa"],
  ["Railway", "API + worker hosting", "App data, logs", "USA (us-west-2)", "https://railway.com/legal/dpa"],
  ["Supabase", "Managed Postgres", "All customer records", "EU (Frankfurt)", "https://supabase.com/legal/dpa"],
  ["Upstash", "Managed Redis (queue)", "Job payloads", "EU (Frankfurt)", "https://upstash.com/dpa"],
  ["Cloudflare", "CDN, DNS, WAF", "Request metadata", "Global edge", "https://www.cloudflare.com/cloudflare-customer-dpa/"],
  ["Alchemy", "RPC provider", "Public on-chain queries", "USA", "https://www.alchemy.com/policies/dpa"],
  ["Stripe", "Card payments (USD)", "Billing email, last4", "USA + global", "https://stripe.com/legal/dpa"],
  ["Atlos", "Crypto checkout (non-custodial)", "Wallet address, order ID", "Global (settles on-chain)", "https://atlos.io/legal"],
  ["Postmark", "Transactional email", "Email addr, subject", "USA", "https://postmarkapp.com/eu-privacy"],
  ["GitGuardian", "Secret leak scanning", "Public repo content", "EU (France)", "https://www.gitguardian.com/legal"],
  ["PostHog", "Product analytics", "Pseudonymous events", "EU (Germany)", "https://posthog.com/dpa"],
  ["Sentry", "Error tracking", "Stack traces, hash", "USA", "https://sentry.io/legal/dpa/"],
] as const;

export default function SubProcessorsPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-12">
        <header>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">// legal</p>
          <h1 className="mt-2 text-5xl font-bold">Sub-processors</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Third-party services we use to operate SybilShield. Each is bound by a written DPA. Subscribe to{" "}
            <a href="mailto:support@sybilshield.org" className="text-emerald-400 hover:underline">change notifications</a>{" "}
            (30-day advance notice).
          </p>
        </header>

        <div className="overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">vendor</th>
                <th className="px-4 py-2 text-left">purpose</th>
                <th className="px-4 py-2 text-left">data</th>
                <th className="px-4 py-2 text-left">region</th>
                <th className="px-4 py-2 text-left">dpa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {VENDORS.map(([v, purp, data, region, dpa]) => (
                <tr key={v} className="bg-zinc-950">
                  <td className="px-4 py-2 font-mono text-emerald-400">{v}</td>
                  <td className="px-4 py-2 text-zinc-300">{purp}</td>
                  <td className="px-4 py-2 text-zinc-400">{data}</td>
                  <td className="px-4 py-2 text-zinc-400">{region}</td>
                  <td className="px-4 py-2">
                    <a href={dpa} className="text-emerald-400 hover:underline">
                      DPA
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <section>
          <h2 className="text-2xl font-semibold">Data residency summary</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="font-mono text-sm text-emerald-400">PRIMARY</h3>
              <p className="mt-2 text-sm text-zinc-400">Customer records — EU (Frankfurt). Supabase + Upstash.</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="font-mono text-sm text-emerald-400">EDGE</h3>
              <p className="mt-2 text-sm text-zinc-400">Static assets + DNS — global edge. No customer PII.</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="font-mono text-sm text-emerald-400">BILLING</h3>
              <p className="mt-2 text-sm text-zinc-400">Cards — Stripe (PCI-DSS L1, post-incorporation). Crypto — Atlos (non-custodial, settles direct to merchant wallet).</p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
