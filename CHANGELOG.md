# Changelog

All notable changes to SybilShield are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [0.6.0] — 2026-06-01

### Added
- Free-tier enforcement: per-plan caps on addresses per analysis, concurrent in-flight jobs, `addresses_file_url` size, and per-analysis Alchemy CU budget. Structured `400`/`429` responses with `limit` + `upgrade_url`.
- `complete_over_budget` terminal status — partial results kept + dashboard upgrade banner when a run exceeds its CU budget.

### Changed
- Dashboard polling + read GETs no longer count toward the monthly quota. The free 100/mo is now 100 billable POSTs, not 100 status polls.

## [0.5.0] — 2026-05-26

### Added
- Decision-ready API: `decision` (DROP/REVIEW/KEEP) + `decision_confidence` + `rationale_codes` per address, computed from a named preset.
- Four presets (`airdrop` / `dao` / `grant` / `balanced`) calibrated against 600 real wallets — 100% recall on confessed sybils, 0% FP on confirmed governance voters. Retro at `/blog/preset-calibration`.
- Cluster-only mode (`mode: cluster_only`) + new ML `/cluster-only` endpoint.
- CSV-upload form on `/dashboard/new`, live progress card with auto-refresh, per-address feedback loop (thumbs-up / false-positive / false-negative).

### Changed
- ML model retrained on real Alchemy corpus (`v0.5.0-gov-expanded`); genuine pool ~10× via on-chain governance-voters source; adversarial recall 0.0 → 1.0.

## [0.4.3] — 2026-05-25

### Changed
- Honesty pass across the public surface: Trust page set to real compliance state (SOC 2 not started, pentest not scheduled), homepage de-hyped, pricing restructured to Free Sandbox / Pilot / Growth (coming soon) / Enterprise (coming soon).
- Crypto checkout (Atlos) marked beta — manual Pilot flow only; self-serve billing remains roadmap.

### Added
- Legal pages (`/privacy`, `/terms`, `/cookies`), public unauth `GET /v1/score/:address`, and `GET /v1/audit-log`.

## [0.4.0] — 2026-05-24

### Added
- 14 new public pages: `/compare`, `/lookup`, `/pricing/calculator`, `/docs/quickstart`, `/docs/api-playground`, `/trust`, `/sub-processors`, `/customers`, `/changelog`, plus 4 product use-case landings.
- Dashboard depth: notifications inbox, webhook deliveries log with retry, team invites with scoped roles, watchlist with daily re-scoring.
- 5 new backend tables (`notifications`, `webhook_deliveries`, `team_members`, `invites`, `watchlist`) + matching REST endpoints.

## [0.3.2] — 2026-05-22

### Added
- NowPayments integration for BTC/ETH/USDC checkout on growth/scale plans.
- Production deploy configs: Vercel (web), Railway (api+worker), Supabase (db), Upstash (redis).

### Fixed
- Alchemy provider switches in automatically when `ALCHEMY_API_KEY` is set; falls back to MockProvider otherwise.

## [0.3.1] — 2026-05-19

### Added
- SEO basics: favicon, OG tags, sitemap.xml, robots.txt, custom 404.
- Legal pages: Privacy notice, Terms of service, Cookie policy.
- First retro-analysis blog post: Linea airdrop methodology.

## [0.3.0] — 2026-05-16

### Changed
- Site-wide visual refresh: Genesis design system (black + neon lime/purple, Space Grotesk + JetBrains Mono).

### Added
- Dashboard subpages: analyses, api-keys, billing, plus single-analysis detail view.
- Mobile hamburger menu, sandbox banner, footer reorg.

## [0.2.0] — 2026-05-12

### Added
- Audit log writes on every flagged score and feedback verdict (legal defensibility).
- Retraining cron orchestrator with PSI + adversarial recall triggers.
- `derive_ens_veterans.py` + `derive_power_users.py` for G1/G2 verified-genuine labels.

## [0.1.0] — 2026-05-09

### Added
- Dockerized test suites (API vitest + ML pytest) — both green.

### Fixed
- `fastify-raw-body` version pin for Stripe webhook signature verification.
- Multi-chain analyses persist per-score chain (previously hardcoded to first chain).

## [0.0.1] — 2026-04-30

### Added
- Initial release: monorepo scaffold, Drizzle schema, six detection methods (funding clustering, behavioral HDBSCAN, graph Leiden, temporal, cross-chain, ML ensemble), public appeal endpoint with 48h SLA.
