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
  { title: "Fair-use limits", desc: "Sandbox caps on addresses, concurrent jobs, file size, CU budget to keep the shared service healthy. Dashboard polling is free — the monthly cap is 100 meaningful operations.", status: "available" },
  { title: "Auto-deploy + monitoring", desc: "Push to main → CI → deploy → health check. Discord pings on deploy result, uptime probes, worker exceptions.", status: "available" },
  { title: "Daily Postgres backup", desc: "pg_dump cron with 7-day local rotation. Off-site B2 sync wired but awaiting credentials.", status: "available" },
  { title: "Open-source MIT", desc: "All detection code, presets, audit-log schema, appeal protocol on GitHub. Reproducible from public methodology.", status: "available" },
  { title: "Per-analysis threshold overrides", desc: "Tune any preset's drop/review score or cluster-size knobs for a single analysis — via the API (threshold_overrides) or a dashboard UI on /dashboard/new. No database access needed.", status: "available" },
  { title: "ENS name resolution", desc: "GET /v1/resolve/:name resolves *.eth names server-side. /dashboard/new detects .eth cells and resolves them on an explicit click.", status: "available" },
  { title: "Cluster network graph", desc: "Analysis detail page renders a star-topology view of detected clusters (hub + one node per cluster, sized by cluster size).", status: "available" },
  { title: "Embeddable score-badge widget", desc: "A copy-paste <script> badge for third-party claim pages — shows the cached decision for an address SybilShield has already scored. Display-only; doesn't gate the host page's own form, and doesn't score addresses it's never seen (see /docs/widget).", status: "available" },
  { title: "Snapshot governance-strategy plugin", desc: "A validation for snapshot-labs/score-api that gates proposal/vote eligibility on a wallet's real DROP/REVIEW/KEEP decision. Built + tested against the live API; publication to Snapshot's repo is a pending human step.", status: "beta" },
  { title: "Self-host / white-label guide", desc: "A consolidated guide from git clone to a working local instance — mock and real-Alchemy-key paths both documented. MIT means anyone can run their own copy.", status: "available" },
  { title: "Quota-approaching banner", desc: "Dashboard shows a banner once a customer's monthly fair-use usage crosses 80%, before the hard cap hits.", status: "available" },
];

// Active work — most of these are blocked on one specific thing (credentials,
// pilot data, incorporation). Listed honestly with what unblocks each.
const NEXT: Item[] = [
  { title: "Pilot calibration on real labelled corpus", desc: "Run scorer on a recent airdrop's address set + their post-hoc verified list. Tune presets to that domain. Needs: one airdrop team that'll share data.", status: "coming-soon" },
  { title: "Per-customer default threshold overrides", desc: "Remember a customer's preferred thresholds so future analyses use them automatically, without resubmitting threshold_overrides each time. Per-analysis overrides already ship self-serve (see Now) — this is the persistent-default layer on top, needs a small database migration.", status: "coming-soon" },
  { title: "QF pairwise-coordination defense (grant preset)", desc: "A signal grant committees can use to catch pairwise-coordinated funding-splitting, beyond plain cluster-size. Design note done; implementation not started.", status: "coming-soon" },
  { title: "Real-time first-sight scoring", desc: "Score an address SybilShield has never seen, synchronously, fast enough for a claim-page widget — today's embeddable widget only shows addresses already analyzed. Capacity/rate-limiting design done; implementation not started.", status: "coming-soon" },
  { title: "Wild-traffic drift cron", desc: "Weekly PSI check on prod feature distribution vs training set. Currently manual. Auto-retrain triggered by drift is on roadmap.", status: "coming-soon" },
  { title: "Off-site B2 backup activation", desc: "rclone + Backblaze B2 — env placeholders ready, awaiting B2 application key. Local pg_dump rotation works today.", status: "coming-soon" },
  { title: "Gitcoin Passport G1 source", desc: "Strongest 'verified human' signal available. Endpoint is per-address — needs a caching layer. Bumps genuine pool from ~1,700 → ~50,000.", status: "coming-soon" },
];

// Larger initiatives — gated on legal incorporation or a specific grant/
// partner requirement, not on any paying customer (there are none;
// SybilShield is a free public good, funded by grants).
const LATER: Item[] = [
  { title: "Resend email integration", desc: "Account confirmations, analysis-complete notifications, monthly usage. Needs Resend account + DNS.", status: "roadmap" },
  { title: "TypeScript + Python SDK", desc: "Auto-generated from OpenAPI. Removes raw-curl friction for developer-customers.", status: "roadmap" },
  { title: "Auto-retrain on drift alert", desc: "PSI > 0.25 → kick off retrain pipeline automatically + ship new model with audit-log entry.", status: "roadmap" },
  { title: "Force-directed cluster graph", desc: "An address-level-edge upgrade over the current star-topology cluster view (see Now). Needs a new clusters-edges endpoint; not built, not blocking.", status: "roadmap" },
  { title: "Self-hosted Erigon/Reth node", desc: "For >100K-address analyses. Removes Alchemy quota dependency — only when CU bill justifies the ops cost.", status: "roadmap" },
  { title: "SOC 2 Type I + pentest", desc: "Pursued only if a specific grant or partner requires it — not tied to a paying customer, since SybilShield doesn't have any. Paid certs nobody asked for would be theatre.", status: "roadmap" },
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
          subtitle="Gated on incorporation or a specific grant/partner need — not on a paying customer"
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
