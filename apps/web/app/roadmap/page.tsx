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

// Shipped — already live in the public sandbox. Stays here so visitors can
// see scope at a glance, even if some of these have been live for a while.
const NOW: Item[] = [
  { title: "Decision-ready API", desc: "Each result has decision (DROP/REVIEW/KEEP) + confidence + rationale_codes. No threshold-picking by the customer — pick a preset, get verdicts.", status: "available" },
  { title: "Four named presets", desc: "airdrop · dao · grant · balanced. Calibrated against 600 real wallets — 100% recall on confessed sybils, 0% FP on confirmed governance voters.", status: "available" },
  { title: "Cluster-only mode", desc: "POST /v1/analyses?mode=cluster_only — skip ML scoring, return multi-wallet farm groupings only. Strongest signal in the stack.", status: "available" },
  { title: "Real on-chain ingestion (Alchemy)", desc: "5 chains live: Ethereum, Arbitrum, Optimism, Base, Polygon. No more mock provider in prod.", status: "available" },
  { title: "Six detection methods", desc: "Funding (shared funder) / behavior (HDBSCAN) / graph (Leiden) / temporal / cross-chain / ML ensemble (LightGBM v0.5.0 on real Alchemy corpus).", status: "available" },
  { title: "CSV-upload dashboard form", desc: "/dashboard/new parses .csv/.txt, dedupes addresses, picks preset + mode, submits — no curl required.", status: "available" },
  { title: "Live progress + auto-refresh detail page", desc: "Submit → progress card with stage list + elapsed seconds → results render automatically when done. No F5.", status: "available" },
  { title: "Public appeal flow", desc: "Anyone can dispute a score. 48h response policy. Immutable audit log per event. POST /v1/appeals + GET /v1/audit-log.", status: "available" },
  { title: "Webhook delivery", desc: "HMAC-SHA256 signed on analysis.completed. Per-customer URL + secret. Retries + delivery log.", status: "available" },
  { title: "Customer feedback loop", desc: "Thumbs-up / false-positive / false-negative buttons per address. Writes to feedback table + audit-log. Will feed auto-retrain.", status: "available" },
  { title: "Free-tier enforcement", desc: "Per-plan caps on addresses, concurrent jobs, file size, CU budget. Dashboard polling is free — 100/mo quota is 100 meaningful operations.", status: "available" },
  { title: "Auto-deploy + monitoring", desc: "Push to main → CI → deploy → health check. Discord pings on deploy result, uptime probes, worker exceptions.", status: "available" },
  { title: "Daily Postgres backup", desc: "pg_dump cron with 7-day local rotation. Off-site B2 sync wired but awaiting credentials.", status: "available" },
  { title: "Open-source MIT", desc: "All detection code, presets, audit-log schema, appeal protocol on GitHub. Reproducible from public methodology.", status: "available" },
];

// Active work — most of these are blocked on one specific thing (credentials,
// pilot data, incorporation). Listed honestly with what unblocks each.
const NEXT: Item[] = [
  { title: "Pilot calibration on real labelled corpus", desc: "Run scorer on a recent airdrop's address set + their post-hoc verified list. Tune presets to that domain. Needs: one airdrop team that'll share data.", status: "coming-soon" },
  { title: "Exchange-wallet entity table", desc: "Exclude known-CEX hot wallets from the funding clusterer so shared-Binance-funder doesn't create false clusters. Workaround in place via threshold bump.", status: "coming-soon" },
  { title: "Per-customer preset overrides", desc: "Pilots will get cluster_size_gte + score_gte overrides in their analysis config. Manual psql UPDATE today.", status: "coming-soon" },
  { title: "Wild-traffic drift cron", desc: "Weekly PSI check on prod feature distribution vs training set. Currently manual. Auto-retrain triggered by drift is on roadmap.", status: "coming-soon" },
  { title: "Off-site B2 backup activation", desc: "rclone + Backblaze B2 — env placeholders ready, awaiting B2 application key. Local pg_dump rotation works today.", status: "coming-soon" },
  { title: "Gitcoin Passport G1 source", desc: "Strongest 'verified human' signal available. Endpoint is per-address — needs a caching layer. Bumps genuine pool from ~1,700 → ~50,000.", status: "coming-soon" },
];

// Blocked or large-scale work — most depends on incorporation or a first
// enterprise customer.
const LATER: Item[] = [
  { title: "Stripe self-serve billing", desc: "Subscription + invoicing. Requires incorporation (Stripe needs a registered entity).", status: "roadmap" },
  { title: "Resend email integration", desc: "Account confirmations, analysis-complete notifications, monthly usage. Needs Resend account + DNS.", status: "roadmap" },
  { title: "TypeScript + Python SDK", desc: "Auto-generated from OpenAPI. Removes raw-curl friction for developer-customers.", status: "roadmap" },
  { title: "Auto-retrain on drift alert", desc: "PSI > 0.25 → kick off retrain pipeline automatically + ship new model with audit-log entry.", status: "roadmap" },
  { title: "Cluster network visualization", desc: "Interactive D3/Sigma graph of detected Sybil clusters in the analysis detail page.", status: "roadmap" },
  { title: "Self-hosted Erigon/Reth node", desc: "For >100K-address analyses. Removes Alchemy quota dependency — only when CU bill justifies the ops cost.", status: "roadmap" },
  { title: "SOC 2 Type I + pentest", desc: "After first enterprise customer asks for it. Not before — paid certs without paying customers is theatre.", status: "roadmap" },
  { title: "Galxe / Gitcoin Passport credential", desc: "Score-as-a-credential embedded in major airdrop campaign platforms. Requires partnerships.", status: "roadmap" },
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
          subtitle="Shipped — live in the public sandbox today"
          tone="emerald"
          items={NOW}
        />
        <Phase
          title="Next"
          subtitle="Active work — most blocked on one specific input (pilot data, credentials, or a first customer)"
          tone="amber"
          items={NEXT}
        />
        <Phase
          title="Later"
          subtitle="After legal entity / after first enterprise customer"
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
