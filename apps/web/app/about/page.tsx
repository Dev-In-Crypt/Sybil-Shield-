import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { StatusBadge } from "../../components/StatusBadge";

export const metadata = { title: "About · SybilShield" };

export default function AboutPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-bold">About SybilShield</h1>
        <p className="mt-3 text-zinc-400">
          Open-methodology Sybil detection for token distributions.
        </p>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Why we built this</h2>
          <p className="mt-3 text-zinc-300">
            Every airdrop in 2023-2025 was extracted by farmers running thousands of wallets.
            Projects either overspend on detection ($150K consulting) or underspend and lose
            20-40% of their distribution. The tooling gap is real: Trusta is Ethereum-focused
            and black-box, Nansen is too expensive and not airdrop-specific, custom Dune
            analyses take weeks.
          </p>
          <p className="mt-3 text-zinc-300">
            We're building the "credit-scoring layer for token distributions" — an
            evidence-based, auditable, open-methodology service that any project can plug into
            their TGE flow.
          </p>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Team <StatusBadge status="beta" /></h2>
          <p className="mt-2 text-sm text-zinc-500">
            Solo founder + open-source contributors. Funded contributors named here as they join.
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-2">
            <Person
              role="Founder · Eng"
              name="—"
              note="Background in on-chain analytics and ML. DM on Telegram or open a GitHub issue to chat."
            />
            <Person
              role="Open seat · Data"
              name="—"
              note="Coming after first grant. Curating labelled corpus + adversarial red-team."
            />
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">How we sustain</h2>
          <ul className="mt-3 space-y-2 text-zinc-300">
            <li>
              <strong className="text-zinc-100">Public-good tier</strong> — free single-address
              scoring API, free CSV export of public retros (aggregate only).
            </li>
            <li>
              <strong className="text-zinc-100">Paid tier</strong> — hosted analyses, dedicated
              SLA, custom models, on-call support.
            </li>
            <li>
              <strong className="text-zinc-100">Grants</strong> — applying to Ethereum
              Foundation ESP, Arbitrum DAO, Octant, Optimism RetroPGF for the public-good
              components.
            </li>
            <li>
              <strong className="text-zinc-100">No token</strong> — we have no plans to launch
              a token. Anyone claiming "$SHIELD" is a scam.
            </li>
          </ul>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-semibold">Legal posture</h2>
          <p className="mt-3 text-zinc-300">
            Pre-incorporation. Will register a Delaware C-corp (Stripe Atlas) after first grant
            lands. Until then we accept crypto via Atlos (non-custodial, 0% fees) and operate as a public-beta
            indie project. Customers using SybilShield scores in any public filter list are
            contractually required to provide an appeal flow.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Person({ role, name, note }: { role: string; name: string; note: string }) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{role}</div>
      <div className="mt-1 text-lg font-medium">{name}</div>
      <p className="mt-2 text-sm text-zinc-400">{note}</p>
    </div>
  );
}
