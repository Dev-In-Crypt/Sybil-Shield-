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

        <section id="neutral-second-opinion" className="mt-12">
          <h2 className="text-2xl font-semibold">A neutral second opinion</h2>
          <p className="mt-3 text-zinc-300">
            When a project&apos;s chosen filter — anyone&apos;s, not just ours — flags a real
            contributor and the community pushes back, there&apos;s rarely a neutral party either
            side can point to. The filter vendor made the call; disputing it usually means
            disputing the same vendor.
          </p>
          <p className="mt-3 text-zinc-300">
            SybilShield is structurally suited to be that second opinion: MIT-licensed detection
            code anyone can read line by line, an{" "}
            <a href="/benchmark" className="text-emerald-400 hover:underline">
              honest-holdout accuracy record
            </a>{" "}
            published with its own caveats rather than a marketing number, and no commercial stake
            in any one project&apos;s outcome — the whole thing is free. Not a replacement for
            whichever filter a team already runs; an independent read anyone can check, including
            the people it flags.
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
              <strong className="text-zinc-100">Free for everyone</strong> — the full scoring
              API, dashboard, evidence reports, and public methodology are free. No prices, no
              plans, no checkout. Fair-use limits keep the shared sandbox healthy.
            </li>
            <li>
              <strong className="text-zinc-100">Grants</strong> — funded by public-goods
              grants: Ethereum Foundation ESP, Arbitrum DAO, Octant, Optimism RetroPGF,
              Gitcoin. Sybil resistance is shared infrastructure, so we fund it like it.
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
            An open, grant-funded public-good project — free to use, MIT-licensed, no
            monetization. Anyone using SybilShield scores in a public filter list is
            expected to provide an appeal flow so scored parties can dispute a result. That
            appeal infrastructure (public endpoint, 48h SLA, immutable audit log) is usable{" "}
            <a href="/product/appeals" className="text-emerald-400 hover:underline">
              standalone, alongside any filter
            </a>{" "}
            — not only SybilShield&apos;s own scoring.
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
