# Changelog

All notable changes to SybilShield are documented here.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) · Versioning: [SemVer](https://semver.org/).

## [0.11.0] — 2026-07-19

### Added
- `apps/web/public/widget.js` — a copy-paste embeddable score badge for third-party claim pages. Display-only: shows the cached decision for an address SybilShield has already analyzed, or an honest "not yet scored" — does not gate the host page's own form, and does not score addresses it's never seen. See `/docs/widget`.

## [0.10.0] — 2026-07-17

### Added
- A Snapshot governance-strategy validation (MIT-licensed, `packages/snapshot-strategy-sybilshield`) that gates proposal/vote eligibility on a wallet's real DROP/REVIEW/KEEP decision. Built and tested against the live production API; publication to `snapshot-labs/score-api` is pending (a deliberate human step, not automated).

### Changed
- `GET /v1/score/:address` now publicly returns `decision`, `decision_confidence`, and `rationale_codes` (previously stored, not returned).

## [0.9.2] — 2026-07-16

### Fixed
- The documented backup-restore procedure was silently broken (piped into a socket nothing was listening on) — replaced with a real, tested restore drill (`scripts/restore-drill.sh`), verified against a locally-generated dump and a deliberately corrupted one.

### Changed
- Consolidated the self-host / white-label deployment guide into one section in `README.md`; removed duplicated, conflicting instructions.

## [0.9.1] — 2026-07-14

### Added
- Dashboard banner at ≥80% of the monthly fair-use quota, before the hard cap hits.

### Fixed
- The authenticated per-minute rate limit was silently returning `500` instead of `429` past the cap for every customer's 31st+ request/minute — found via a real concurrency load test, fixed, and guarded by a permanent regression test.

## [0.9.0] — 2026-07-12

### Added
- Server-side ENS name resolution: `GET /v1/resolve/:name` (20/min rate limit, Alchemy-backed, key never reaches the browser).
- `/dashboard/new` detects `*.eth` cells and resolves them on an explicit "Resolve" click — never automatically.

## [0.8.1] — 2026-07-11

### Added
- Cluster network graph on the analysis detail page (star-topology SVG — hub + one node per cluster, radius ∝ size, colour ∝ avg score). A force-directed, address-level-edge upgrade is a later idea, not built.
- Analysis responses now echo the canonical preset drop/review rule text (`preset_rules`), removing a second hand-typed copy on the dashboard that had drifted before (a real bug: the `grant` preset's review rule was rendered in the wrong order).
- `preset-sync.test.ts` — CI now fails if the TS and Python preset definitions diverge on any threshold or description.

## [0.8.0] — 2026-07-01

### Changed
- **Free public good.** SybilShield is now funded by grants, not customer revenue. Removed pricing/plans/checkout from the public site, docs, and dashboard. Fair-use limits stay in place as anti-abuse, not a paywall. Stripe/Atlos billing code stays in the repo, dormant, for a possible future pivot.

## [0.7.0] — 2026-07-01

### Added
- `POST /v1/analyses` accepts `threshold_overrides` — tune a preset's drop/review score or cluster-size knobs per analysis, on top of the four named presets.
- `/dashboard/new`: advanced per-analysis threshold-override controls, and a paste-addresses textarea alternative to file upload.

## [0.6.1] — 2026-06-25

### Fixed
- Known-exchange set expanded from 12 to 66 curated CEX/bridge wallets — the actual fix for CEX-shared-funding false positives, previously only mitigated with a cluster-size threshold bump.

### Added
- `model_version` exposed on `GET /health` so ops can confirm the deployed model without SSHing in.

### Changed
- Homepage marquee: replaced the mock-telemetry ticker with a real capability ticker.

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
