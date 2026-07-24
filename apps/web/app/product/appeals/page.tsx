import Link from "next/link";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

export const metadata = {
  title: "Appeal infrastructure · SybilShield",
  description:
    "A public appeal workflow with an SLA and an immutable audit log — usable alongside any Sybil filter, not just SybilShield's own scoring.",
};

export default function AppealsInfraPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16 space-y-16">
        <header>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">
            // appeal infrastructure
          </p>
          <h1 className="mt-2 text-5xl font-bold leading-tight">
            Your filter flagged someone. Now what?
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-zinc-400">
            Most Sybil-detection vendors sell a score. Almost none of them sell what happens
            after a real contributor gets caught in it. SybilShield&apos;s public appeal
            endpoint, 48-hour response policy, and append-only audit log work standalone —
            you can point flagged users at it even if your primary filter isn&apos;t
            SybilShield&apos;s own scoring.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-semibold">The gap</h2>
          <p className="mt-4 text-zinc-300">
            When a distribution flags real users, teams improvise. CARV&apos;s own public
            post-mortem on their airdrop&apos;s Sybil detection offered flagged accounts two
            paths: a manual re-review via Nansen (&ldquo;may take about four to eight
            weeks&rdquo;), or a third-party KYC process (&ldquo;approximately two to four
            weeks&rdquo;) — both ad hoc, both assembled after the fact, neither a product
            anyone could point to in advance.
          </p>
          <p className="mt-4 text-sm text-zinc-500">
            Source:{" "}
            <a
              href="https://medium.com/@Carv/addressing-sybil-detection-concerns-in-carvs-airdrop-our-commitment-to-fairness-and-transparency-055b9205d300"
              className="text-emerald-400 hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              CARV&apos;s own public statement
            </a>
            , cited as an example of the industry gap — not a claim about any vendor&apos;s
            detection accuracy.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">What SybilShield gives you, standalone</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-mono text-sm uppercase tracking-widest text-emerald-400">
                Public appeal endpoint
              </h3>
              <p className="mt-2 text-sm text-zinc-300">
                <code className="font-mono text-emerald-300">POST /v1/appeals</code> — no API
                key required. Anyone can dispute a flag on their own wallet.
              </p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-mono text-sm uppercase tracking-widest text-emerald-400">
                48-hour response policy
              </h3>
              <p className="mt-2 text-sm text-zinc-300">
                Every appeal is acknowledged within 48 hours — a stated SLA, not &ldquo;we&apos;ll
                get to it.&rdquo;
              </p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-mono text-sm uppercase tracking-widest text-emerald-400">
                Immutable audit log
              </h3>
              <p className="mt-2 text-sm text-zinc-300">
                Every appeal and every reversal writes an append-only row to{" "}
                <code className="font-mono text-emerald-300">evidence_audit_log</code> —
                exportable via <code className="font-mono text-emerald-300">GET /v1/audit-log</code>.
              </p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-mono text-sm uppercase tracking-widest text-emerald-400">
                Free, no vendor lock-in
              </h3>
              <p className="mt-2 text-sm text-zinc-300">
                No account required to submit an appeal. No dependency on SybilShield being
                your primary scoring system.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Using it alongside a different filter</h2>
          <p className="mt-4 text-zinc-300">
            If your primary Sybil filter is a competitor&apos;s scoring, an in-house script, or
            a manual review — link your flagged users straight to{" "}
            <Link href="/appeal" className="text-emerald-400 hover:underline">
              /appeal
            </Link>
            . They submit their case, you get an audit-logged, timestamped record you can point
            to if the decision is ever disputed publicly. It costs nothing and doesn&apos;t
            require adopting SybilShield&apos;s scores.
          </p>
          <pre className="mt-4 overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">{`curl -X POST https://api.sybilshield.org/v1/appeals \\
  -H 'content-type: application/json' \\
  -d '{
    "address": "0x...",
    "chain": "ethereum",
    "reason": "Owned this wallet since 2019, active Snapshot voter, funded from my own CEX withdrawal."
  }'`}</pre>
        </section>

        <section className="rounded-lg border border-emerald-700 bg-emerald-900/10 p-8">
          <h2 className="text-xl font-semibold text-emerald-300">Get started</h2>
          <p className="mt-3 text-sm text-zinc-300">
            The appeal form is live and public — no setup, no account, no cost.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/appeal"
              className="rounded bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Open the appeal form →
            </Link>
            <Link
              href="/docs"
              className="rounded border border-zinc-700 px-5 py-2.5 text-sm hover:border-emerald-500"
            >
              API reference
            </Link>
            <a
              href="mailto:support@sybilshield.org"
              className="rounded border border-zinc-700 px-5 py-2.5 text-sm hover:border-emerald-500"
            >
              Ask a question
            </a>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
