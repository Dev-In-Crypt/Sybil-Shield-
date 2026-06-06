import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Changelog · SybilShield" };

interface Entry {
  version: string;
  date: string;
  title: string;
  changes: { tag: "added" | "changed" | "fixed" | "removed"; body: string }[];
}

const ENTRIES: Entry[] = [
  {
    version: "0.6.0",
    date: "2026-06-01",
    title: "free_tier_enforcement",
    changes: [
      { tag: "added", body: "Per-plan caps enforced server-side: max addresses per analysis, max concurrent in-flight jobs, addresses_file_url size limit, and per-analysis Alchemy CU budget. Returns structured 400/429 with limit + upgrade_url." },
      { tag: "changed", body: "Dashboard polling + read endpoints (GET /v1/analyses/:id, /results, /account, etc.) no longer count against the monthly quota. The 100/mo free budget is now 100 billable POSTs, not 100 of anything-including-status-polls." },
      { tag: "added", body: "complete_over_budget terminal status — if a run exceeds its CU budget, partial results are kept and the dashboard shows an amber upgrade banner instead of pretending it finished clean." },
    ],
  },
  {
    version: "0.5.0",
    date: "2026-05-26",
    title: "decision_ready_api + presets",
    changes: [
      { tag: "added", body: "Decision-ready results: every address gets decision (DROP/REVIEW/KEEP) + decision_confidence + rationale_codes, computed server-side from a named preset. No more threshold-picking by the customer." },
      { tag: "added", body: "Four presets — airdrop / dao / grant / balanced — calibrated against 600 real wallets. Pre-pilot retro: 100% recall on confessed sybils, 0% false-positive on confirmed governance voters after a cluster-threshold tune. Full numbers at /blog/preset-calibration." },
      { tag: "added", body: "Cluster-only mode (POST /v1/analyses with mode: cluster_only) — skips ML scoring, returns multi-wallet farm groupings only. New ML /cluster-only endpoint." },
      { tag: "added", body: "CSV-upload form on /dashboard/new (replaces the API-only flow), live progress card with auto-refresh, and a per-address feedback loop (thumbs-up / false-positive / false-negative) wired to the feedback table + audit log." },
      { tag: "changed", body: "ML model retrained on a real Alchemy corpus (v0.5.0-gov-expanded) — genuine pool grew ~10x via a new on-chain governance-voters source. Adversarial recall 0.0 → 1.0." },
    ],
  },
  {
    version: "0.4.3",
    date: "2026-05-25",
    title: "honesty_pass",
    changes: [
      { tag: "changed", body: "Walked back over-claims across the public surface: Trust page compliance set to real state (SOC 2 not started, pentest not scheduled), homepage drops aggressive copy, pricing restructured to Free Sandbox / Pilot / Growth (coming soon) / Enterprise (coming soon)." },
      { tag: "changed", body: "Crypto checkout (Atlos) marked beta — works in code, used on the manual Pilot flow only. Self-serve production billing is on the roadmap, not live." },
      { tag: "added", body: "Legal pages (/privacy, /terms, /cookies), public unauth score lookup (GET /v1/score/:address), and the GET /v1/audit-log endpoint the Trust page promises." },
    ],
  },
  {
    version: "0.4.2",
    date: "2026-05-24",
    title: "alchemy_live + quota_enforcement",
    changes: [
      { tag: "changed", body: "Switched crypto rail from NowPayments to Atlos. Non-custodial wallet→wallet, 0% fees, no KYC for buyer or merchant." },
      { tag: "added", body: "Real per-plan quota enforcement: api_calls_this_month counter, 429 monthly_quota_exceeded once limit hit, per-customer RPM rate-limit." },
      { tag: "added", body: "Real Alchemy provider on production — Ethereum mainnet live, MockProvider only in tests." },
      { tag: "added", body: "Monthly quota reset cron (00:05 on the 1st)." },
    ],
  },
  {
    version: "0.4.1",
    date: "2026-05-24",
    title: "production_deploy",
    changes: [
      { tag: "added", body: "Backend live on Hetzner (api.sybilshield.org) with Let's Encrypt TLS, nginx reverse proxy, daily pg_dump backup." },
      { tag: "added", body: "Frontend on Vercel (sybilshield.org) with custom 404, proper favicon + OG, /blog/[slug] dynamic route." },
      { tag: "added", body: "Email routing via Cloudflare — support@ + security@ forwarded to ops mailbox." },
    ],
  },
  {
    version: "0.4.0",
    date: "2026-05-24",
    title: "site_structure_expansion",
    changes: [
      { tag: "added", body: "14 new public pages: compare, lookup, pricing-calculator, quickstart, api-playground, trust, sub-processors, customers, changelog, plus 4 product use-case landings." },
      { tag: "added", body: "Dashboard depth: notifications inbox, webhook deliveries log, team invites with roles, watchlist with daily re-scoring." },
      { tag: "added", body: "5 new backend tables and matching REST endpoints." },
    ],
  },
  {
    version: "0.3.2",
    date: "2026-05-22",
    title: "crypto_checkout + production_deploy",
    changes: [
      { tag: "added", body: "NowPayments integration for BTC/ETH/USDC checkout on growth/scale plans." },
      { tag: "added", body: "Production deploy configs: Vercel + Railway + Supabase + Upstash." },
      { tag: "fixed", body: "Alchemy provider switches in automatically when ALCHEMY_API_KEY is set." },
    ],
  },
  {
    version: "0.3.1",
    date: "2026-05-19",
    title: "seo + legal_pages",
    changes: [
      { tag: "added", body: "SEO basics: favicon, OG tags, sitemap.xml, robots.txt, custom 404." },
      { tag: "added", body: "Privacy notice, Terms of service, Cookie policy." },
      { tag: "added", body: "First retro-analysis blog post: Linea airdrop methodology." },
    ],
  },
  {
    version: "0.3.0",
    date: "2026-05-16",
    title: "genesis_design + dashboard_polish",
    changes: [
      { tag: "changed", body: "Site-wide visual refresh: Genesis design system (black + neon lime/purple)." },
      { tag: "added", body: "Dashboard subpages: analyses, api-keys, billing, single-analysis detail." },
      { tag: "added", body: "Mobile hamburger menu, sandbox banner, footer reorg." },
    ],
  },
  {
    version: "0.2.0",
    date: "2026-05-12",
    title: "audit_log + retrain_orchestrator",
    changes: [
      { tag: "added", body: "Audit log writes on every flagged score and feedback verdict." },
      { tag: "added", body: "Retraining cron orchestrator with PSI + adversarial recall triggers." },
      { tag: "added", body: "derive_ens_veterans + derive_power_users scripts for G1/G2 labels." },
    ],
  },
  {
    version: "0.1.0",
    date: "2026-05-09",
    title: "first_green_build",
    changes: [
      { tag: "added", body: "Dockerized test suites (API vitest + ML pytest) — both green." },
      { tag: "fixed", body: "fastify-raw-body version pin for Stripe webhook signature verification." },
      { tag: "fixed", body: "Multi-chain analyses persist per-score chain (no longer hardcoded)." },
    ],
  },
  {
    version: "0.0.1",
    date: "2026-04-30",
    title: "initial_release",
    changes: [
      { tag: "added", body: "Monorepo scaffold, Drizzle schema, six detection methods, ML model + adversarial loop, REST API + worker pipeline." },
      { tag: "added", body: "Public appeal endpoint with 48h SLA." },
    ],
  },
];

const TAG_COLOR: Record<string, string> = {
  added: "border-emerald-500 text-emerald-400",
  changed: "border-sky-500 text-sky-400",
  fixed: "border-amber-500 text-amber-400",
  removed: "border-red-500 text-red-400",
};

export default function ChangelogPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <header>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">// release notes</p>
          <h1 className="mt-2 text-5xl font-bold">Changelog</h1>
          <p className="mt-3 text-zinc-400">
            <a href="https://keepachangelog.com" className="text-emerald-400 hover:underline">Keep a Changelog</a> format. Subscribe via{" "}
            <a href="https://github.com/Dev-In-Crypt/Sybil-Shield-/releases.atom" className="text-emerald-400 hover:underline">RSS</a>.
          </p>
        </header>

        <ul className="space-y-10 border-l border-zinc-800 pl-6">
          {ENTRIES.map((e) => (
            <li key={e.version} className="relative">
              <span className="absolute -left-[31px] top-1 h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">
                {e.date} · v{e.version}
              </p>
              <h2 className="mt-1 font-mono text-lg text-emerald-400">{e.title}</h2>
              <ul className="mt-3 space-y-2">
                {e.changes.map((c, i) => (
                  <li key={i} className="text-sm text-zinc-300">
                    <span className={`mr-2 inline-block rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${TAG_COLOR[c.tag]}`}>
                      {c.tag}
                    </span>
                    {c.body}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </>
  );
}
