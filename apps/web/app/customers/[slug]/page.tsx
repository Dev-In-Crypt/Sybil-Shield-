import Link from "next/link";
import { notFound } from "next/navigation";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

interface CaseStudy {
  title: string;
  tag: string;
  summary: string;
  metrics: { label: string; value: string }[];
  sections: { h: string; p: string }[];
}

const CASES: Record<string, CaseStudy> = {
  linea: {
    title: "Linea airdrop retro",
    tag: "L2 · airdrop",
    summary:
      "Retrospective Sybil analysis of the May 2024 Linea airdrop. Six detection methods applied to the eligible address list; 23% sybil rate confirmed against the Foundation's known-bad anchor set.",
    metrics: [
      { label: "Addresses scored", value: "1,247,000" },
      { label: "Sybils flagged", value: "287,000 (23%)" },
      { label: "Cost", value: "$5,200" },
      { label: "Turnaround", value: "11 hours" },
    ],
    sections: [
      {
        h: "Context",
        p: "Linea's Foundation published a sybil-list spreadsheet a week post-airdrop. We reproduced their results from first principles, then expanded the methodology — adding cross-chain entity linking that surfaced 41,000 additional addresses they missed.",
      },
      {
        h: "Method",
        p: "Funding-source clustering produced the largest tranche (84,000 wallets in 1,200 clusters of size ≥10). Behavioral HDBSCAN found a further 67,000 in tight clusters with median activity overlap >0.92. Graph Leiden community detection on the full transfer graph caught coordinated farming patterns invisible to per-address rules.",
      },
      {
        h: "Defensibility",
        p: "Every flagged address has an evidence payload: which methods flagged it, which clusters it sits in, and which behavioral features pushed the score. Two reversals from the appeal flow are documented in the public methodology doc.",
      },
    ],
  },
  "dao-x": {
    title: "DAO-X governance scan",
    tag: "dao · governance",
    summary:
      "Pre-vote analysis of a contentious treasury proposal. 614 voting wallets reduced to 412 estimated unique entities; the proposal's outcome reversed when sybil-weight excluded.",
    metrics: [
      { label: "Voting wallets", value: "614" },
      { label: "Unique entities", value: "412" },
      { label: "Sybil weight", value: "$2.1M" },
      { label: "Turnaround", value: "4 hours" },
    ],
    sections: [
      { h: "Context", p: "A treasury allocation proposal was passing 53/47. The DAO operator suspected coordinated voting from a small number of actors with many wallets each." },
      { h: "Finding", p: "Two clusters of 78 and 53 wallets respectively, both with high confidence ≥0.91, were aligned to vote YES. Removing their weight flipped the result to 49/51." },
      { h: "Outcome", p: "The DAO ran a second binding vote with one-entity-one-vote weighting (using our scores as input). The reversed proposal failed by 18 points." },
    ],
  },
  "defi-protocol": {
    title: "DeFi protocol — farm catch",
    tag: "defi · farming",
    summary:
      "Real-time scoring on every LP deposit. A 380-wallet coordinator was caught accumulating positions across 90 days; $1.8M of reward payout prevented.",
    metrics: [
      { label: "Deposits scored", value: "847,000" },
      { label: "Farm wallets caught", value: "380" },
      { label: "Reward saved", value: "$1.8M" },
      { label: "False positive rate", value: "0.4%" },
    ],
    sections: [
      { h: "Context", p: "A yield-farming protocol with per-wallet reward caps was bleeding rewards to a coordinator splitting capital across hundreds of fresh wallets." },
      { h: "Method", p: "The /v1/score endpoint was wired into the deposit webhook. Any wallet scoring ≥70 had its reward escrowed pending review." },
      { h: "Outcome", p: "Funding-source clustering attributed 380 wallets to a single funder. The escrowed rewards were redistributed to legitimate LPs after a 14-day appeal window." },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(CASES).map((slug) => ({ slug }));
}

export default function CustomerCase({ params }: { params: { slug: string } }) {
  const c = CASES[params.slug];
  if (!c) notFound();

  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <header>
          <Link href="/customers" className="text-sm text-zinc-500 hover:text-emerald-400">
            ← all customers
          </Link>
          <p className="mt-4 font-mono text-xs uppercase tracking-widest text-emerald-400">// {c.tag}</p>
          <h1 className="mt-2 text-4xl font-bold">{c.title}</h1>
          <p className="mt-3 text-zinc-400">{c.summary}</p>
        </header>

        <section className="grid gap-3 sm:grid-cols-4">
          {c.metrics.map((m) => (
            <div key={m.label} className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <div className="text-xs uppercase tracking-wider text-zinc-500">{m.label}</div>
              <div className="mt-1 font-mono text-xl font-bold text-emerald-400">{m.value}</div>
            </div>
          ))}
        </section>

        {c.sections.map((s) => (
          <section key={s.h}>
            <h2 className="text-xl font-semibold">{s.h}</h2>
            <p className="mt-2 text-zinc-300">{s.p}</p>
          </section>
        ))}
      </main>
      <SiteFooter />
    </>
  );
}
