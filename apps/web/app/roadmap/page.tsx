import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { StatusBadge } from "../../components/StatusBadge";

export const metadata = { title: "Roadmap · SybilShield" };

interface Item {
  title: string;
  desc: string;
  status: "available" | "beta" | "sandbox" | "coming-soon" | "roadmap";
}

const NOW: Item[] = [
  { title: "Full API surface", desc: "All 11 endpoints live (analyses, scoring, evidence, appeals, feedback, account)", status: "available" },
  { title: "Six detection methods", desc: "Funding / behavior (HDBSCAN) / graph (Leiden) / temporal / cross-chain / ML ensemble", status: "available" },
  { title: "Public appeal flow", desc: "Anyone can dispute a score. 48h response policy. Immutable audit log per event.", status: "available" },
  { title: "Webhook delivery", desc: "HMAC-SHA256 signed on analysis.completed. Customer-configured URL + secret.", status: "available" },
  { title: "Open-source clustering", desc: "MIT license. Algorithms reproducible from the published manifest.", status: "available" },
  { title: "63 automated tests", desc: "47 ML + 16 API including 4 real-DB integration. CI green on every PR.", status: "available" },
  { title: "Docker full-stack", desc: "One-command up: postgres + redis + ml + api + worker + migrations.", status: "available" },
];

const NEXT: Item[] = [
  { title: "Real on-chain data (Alchemy)", desc: "Live — AlchemyProvider on Ethereum mainnet. Multi-chain (Arbitrum/OP/Base/Polygon) one click away.", status: "available" },
  { title: "Crypto checkout (Atlos)", desc: "Beta — Atlos (non-custodial, 0% fees, USDT/USDC/ETH/BTC) wired into Pilot Analysis flow. Production-self-serve checkout still on the roadmap.", status: "beta" },
  { title: "Calibrated production model", desc: "Train on 10K+ real labeled corpus. Calibrate probabilities so the 70 threshold is meaningful.", status: "coming-soon" },
  { title: "Free single-address public API", desc: "Rate-limited public-good tier for any project to test our scores.", status: "coming-soon" },
  { title: "Public retro-analyses", desc: "Aggregate-only posts: 'we agree with Linea on 478K, found 45K more, 8K likely FP'. Methodology peer-review.", status: "coming-soon" },
  { title: "Real T1/T2 labeled sources", desc: "Replace synthetic placeholders with LayerZero amnesty, Hop investigations, etc.", status: "coming-soon" },
  { title: "New-analysis dashboard form", desc: "CSV upload UI to replace the API-only flow", status: "roadmap" },
  { title: "Cluster network visualization", desc: "Interactive graph of detected Sybil clusters in the analysis detail page.", status: "roadmap" },
];

const LATER: Item[] = [
  { title: "Stripe card payments", desc: "After legal entity is incorporated.", status: "roadmap" },
  { title: "Enterprise contracts + DPA / MSA templates", desc: "After legal entity.", status: "roadmap" },
  { title: "Self-hosted Erigon/Reth node", desc: "For >100K-address analyses. Removes Alchemy quota dependency.", status: "roadmap" },
  { title: "Custom-model training", desc: "Train a per-customer model on their own labeled examples.", status: "roadmap" },
  { title: "Automatic retrain on drift alert", desc: "PSI > 0.25 → kick off retrain pipeline automatically. Manual today.", status: "roadmap" },
  { title: "Galxe / Gitcoin Passport integrations", desc: "Score-as-a-credential. Embedded in major airdrop campaign platforms.", status: "roadmap" },
  { title: "DAO governance Sybil detection", desc: "Real-time scoring for governance voting. Separate product, same engine.", status: "roadmap" },
];

export default function RoadmapPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16">
        <h1 className="text-4xl font-bold">Roadmap</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          What's shipped, what's next, and what we're committing to publicly. Honest about gaps.
          Full feature flags live at{" "}
          <a className="underline" href="/status">
            /status
          </a>
          .
        </p>

        <Phase
          title="Now"
          subtitle="Public beta — shipped"
          tone="emerald"
          items={NOW}
        />
        <Phase
          title="Next"
          subtitle="Q3 2026 — depends on first grant or first paid analysis"
          tone="amber"
          items={NEXT}
        />
        <Phase
          title="Later"
          subtitle="Q4 2026+ — after legal entity"
          tone="zinc"
          items={LATER}
        />

        <section className="mt-16 rounded-lg border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-400">
          <h2 className="text-lg font-semibold text-zinc-100">What's NOT on the roadmap</h2>
          <ul className="mt-3 space-y-2">
            <li>· KYC / identity verification — that's Worldcoin/Civic's job, not ours</li>
            <li>· Sybil-resistant social graph — out of scope</li>
            <li>· Token of our own — no plans, no announcement, treat any "$SHIELD" rumour as a scam</li>
            <li>· Confidential / proprietary detection rules — everything is open-source by design</li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Phase({
  title,
  subtitle,
  tone,
  items,
}: {
  title: string;
  subtitle: string;
  tone: "emerald" | "amber" | "zinc";
  items: Item[];
}) {
  const toneClass = {
    emerald: "border-emerald-800/40 bg-emerald-900/10",
    amber: "border-amber-800/40 bg-amber-900/10",
    zinc: "border-zinc-800 bg-zinc-900",
  }[tone];
  const titleColor = {
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    zinc: "text-zinc-300",
  }[tone];

  return (
    <section className={`mt-12 rounded-lg border p-6 ${toneClass}`}>
      <div className="flex items-baseline gap-4">
        <h2 className={`text-2xl font-semibold ${titleColor}`}>{title}</h2>
        <span className="text-sm text-zinc-500">{subtitle}</span>
      </div>
      <ul className="mt-6 grid gap-4 md:grid-cols-2">
        {items.map((it) => (
          <li key={it.title} className="rounded border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{it.title}</h3>
              <StatusBadge status={it.status} />
            </div>
            <p className="mt-2 text-sm text-zinc-400">{it.desc}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
