import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Customers · SybilShield" };

const CASES = [
  { slug: "linea", tag: "L2 · airdrop", title: "Linea retro", body: "Re-scored the May 2024 airdrop. 23% sybil rate confirmed. Methodology now public." },
  { slug: "dao-x", tag: "dao · governance", title: "DAO-X (anon)", body: "Pre-vote Sybil scan on a contentious proposal. 614 voting wallets reduced to 412 unique entities." },
  { slug: "defi-protocol", tag: "defi · farming", title: "DeFi protocol (anon)", body: "Real-time score on every LP deposit. Caught a 380-wallet farm. $1.8M reward saved." },
];

export default function CustomersPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-16">
        <header>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">// customers</p>
          <h1 className="mt-2 text-5xl font-bold">Customers</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Teams using SybilShield to keep token distributions honest. Most early adopters prefer to stay unnamed — we respect that.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-semibold">Public reference customers</h2>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="flex h-28 items-center justify-center rounded border border-zinc-800 bg-zinc-900 font-mono text-xs uppercase tracking-widest text-zinc-600">
                // REDACTED
              </div>
            ))}
            <a
              href="mailto:support@sybilshield.org?subject=Add%20our%20logo"
              className="flex h-28 items-center justify-center rounded border border-dashed border-emerald-700 bg-transparent font-mono text-xs uppercase tracking-widest text-emerald-400 hover:bg-emerald-900/10"
            >
              + Your logo
            </a>
          </div>
          <p className="mt-3 text-xs text-zinc-500">// 8 confirmed pilots · logo permission pending · 3 published case studies below</p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Case studies</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {CASES.map((c) => (
              <Link
                key={c.slug}
                href={`/customers/${c.slug}`}
                className="block rounded border border-zinc-800 bg-zinc-900 p-5 hover:border-emerald-500"
              >
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">// {c.tag}</p>
                <h3 className="mt-2 font-mono text-base text-emerald-400">{c.title}</h3>
                <p className="mt-3 text-sm text-zinc-400">{c.body}</p>
                <p className="mt-4 font-mono text-xs text-emerald-400">READ →</p>
              </Link>
            ))}
          </div>
        </section>

        <section className="rounded border border-zinc-800 bg-zinc-900 p-8 text-center">
          <h3 className="font-mono text-lg text-emerald-400">USE_SYBILSHIELD?</h3>
          <p className="mt-3 text-zinc-400">
            If we've protected one of your distributions, we'd love to feature you — anonymized or named, your call.
          </p>
          <a href="mailto:support@sybilshield.org?subject=Case%20study" className="mt-6 inline-block rounded bg-emerald-600 px-5 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            Contact us
          </a>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
