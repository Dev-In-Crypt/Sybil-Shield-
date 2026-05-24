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
            <a href="https://github.com/sybilshield/sybilshield/releases.atom" className="text-emerald-400 hover:underline">RSS</a>.
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
