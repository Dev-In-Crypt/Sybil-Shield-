# Changelog

All notable changes to SybilShield are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

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
