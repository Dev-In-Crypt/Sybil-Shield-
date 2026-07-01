import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Free & open · SybilShield" };

export default function PricingPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Free &amp; open — a public good</h1>
          <p className="mt-3 max-w-2xl text-zinc-400 mx-auto">
            SybilShield is a free public good, not a product. No prices, no plans, no
            checkout. Anyone can use the sandbox and the public methodology at no cost —
            fair-use limits keep the shared service healthy.
          </p>
        </div>

        {/* Free sandbox */}
        <section className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-emerald-900/40 bg-emerald-900/10 p-8">
            <h2 className="text-2xl font-semibold text-emerald-200">Public sandbox</h2>
            <p className="mt-3 text-zinc-300">
              Register with an email, get an API key, and score address cohorts with the
              full evidence pipeline. No card, ever.
            </p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-400">
              <li>· Full DROP / REVIEW / KEEP decisions + evidence reports</li>
              <li>· All six detection methods · public appeal flow</li>
              <li>· CSV export · dashboard polling and reads are free</li>
            </ul>
            <div className="mt-6">
              <Link
                href="/dashboard"
                className="inline-block rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
              >
                Start free →
              </Link>
            </div>
            <p className="mt-4 text-[10px] uppercase tracking-widest text-zinc-600">
              // no card · email only
            </p>
          </div>

          <div className="flex flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-8">
            <h2 className="text-2xl font-semibold">Fair-use limits</h2>
            <p className="mt-3 text-zinc-400">
              Sensible caps that keep the shared sandbox healthy for everyone — not a
              paywall. Doing heavy research? Email us and we&apos;ll help.
            </p>
            <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-400">
              <li>· 100 calls / month (writes; reads are free)</li>
              <li>· Up to 1,000 addresses per analysis</li>
              <li>· 1 analysis at a time · 1 MB CSV upload</li>
            </ul>
            <div className="mt-6">
              <a
                href="mailto:support@sybilshield.org?subject=Research%20access"
                className="inline-block rounded border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-500"
              >
                Ask about research access →
              </a>
            </div>
          </div>
        </section>

        {/* Public-good commitment */}
        <section className="mt-20 rounded-lg border border-emerald-900/40 bg-emerald-900/10 p-8">
          <h2 className="text-2xl font-semibold text-emerald-200">Open methodology</h2>
          <p className="mt-3 max-w-2xl text-zinc-300">
            Any project can call{" "}
            <code className="font-mono text-emerald-300">GET /v1/score/:address</code> for free at low
            volume — no registration required for read-only lookups on cached scores.
          </p>
          <p className="mt-3 max-w-2xl text-zinc-400">
            All six detection methods, the audit-log schema, and the appeal protocol spec are
            MIT-licensed. You can fork, self-host, or just borrow the methodology.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/lookup" className="rounded bg-emerald-700/50 px-4 py-2 text-sm hover:bg-emerald-700/70">
              Try public lookup
            </Link>
            <a
              href="https://github.com/Dev-In-Crypt/Sybil-Shield-"
              className="rounded border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-500"
            >
              GitHub →
            </a>
          </div>
        </section>

        {/* How this is funded */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold">How this is funded</h2>
          <div className="mt-6 space-y-6 text-sm text-zinc-300">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Grants, not customers
              </h3>
              <p className="mt-2 text-zinc-400">
                SybilShield is sustained by public-goods funding — ecosystem grants such as
                the Ethereum Foundation ESP, Gitcoin, Octant, Optimism RetroPGF, and Arbitrum
                — plus the open-source community. Sybil resistance is shared infrastructure,
                so we fund it the way other shared infrastructure is funded.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Why free?
              </h3>
              <p className="mt-2 text-zinc-400">
                A Sybil-detection tool that airdrop teams, DAOs, and grant committees can all
                trust works best when it&apos;s open and neutral. Charging per analysis would
                gate the exact teams who most need honest scoring. So it&apos;s free, the
                methodology is public, and the code is MIT-licensed.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Want to support it?
              </h3>
              <p className="mt-2 text-zinc-400">
                Fund a grant, contribute on GitHub, or send feedback that improves the models.
                Reach us at{" "}
                <a href="mailto:support@sybilshield.org" className="text-emerald-300 hover:underline">
                  support@sybilshield.org
                </a>
                .
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
