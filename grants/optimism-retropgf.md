# Optimism RetroPGF

**Submit at:** https://round.optimism.io/ (during application window)
**Form:** Retroactive — must show shipped value before applying
**Target tier:** Onchain Builders / Dev Tooling

---

## Project name

SybilShield

## Category

Onchain Builders → Developer Tooling / Sybil Detection

## Description

Open-source Sybil-detection engine for token distributions on Optimism Superchain (Optimism, Base, Mode, Worldchain, etc.). Six detection methods with public methodology, immutable audit log, and public appeal protocol. Used by [X] Optimism-ecosystem projects to filter [Y] addresses across [Z] distributions in the past 6 months.

## Impact on Optimism

### Quantitative

| Metric | Value | Period |
|---|---|---|
| Optimism-ecosystem projects using SybilShield | [X] | last 6 months |
| Addresses scored on Optimism | [Y] | last 6 months |
| Cross-chain entity links identified (OP ↔ ETH/Base/Arb) | [Z] | last 6 months |
| Public appeals processed for OP-related flags | [W] | last 6 months |
| Open-source methodology PRs accepted from OP community | [V] | last 6 months |

(These numbers populate after we deploy production and run for 6 months. Apply when we have the data.)

### Qualitative

- Reduced Sybil leakage in [Project A]'s Q[X] distribution from estimated 25% to <5% of supply
- Provided free scoring tier to [N] small-cap Optimism-ecosystem projects who couldn't afford Nansen-grade analysis
- Cross-chain identity linker open-sourced — used by [Project B] and [Project C] for their own internal filtering
- Adversarial test set published, used by [Project D]'s ML team to benchmark their detector

## Public-good commitment

| Component | Status | Funding model |
|---|---|---|
| Detection algorithms | MIT on GitHub | Public good (grants) |
| Public scoring API (rate-limited free tier) | Live | Public good |
| Public retrospectives | 4-6 per year | Public good |
| Appeal protocol spec | Documented | Public good |
| Hosted enterprise service | Commercial | Subsidy → Public good |

## Open source

- GitHub: https://github.com/USER/sybilshield (MIT)
- Methodology docs: https://sybilshield.org/methodology.html
- Detection-algorithm changelog (PRs from external contributors): /CHANGELOG.md

## Sustainability post-RetroPGF

Hosted service is on track to $40-80K MRR by month 12. The public-good components (free tier, retros, methodology, adversarial set) are subsidised by commercial revenue. RetroPGF funding goes 100% to the public-good components — not to commercial development.

We commit to publishing actual public-good vs commercial spend quarterly. If commercial fails, the public-good components survive through:
- All code MIT — anyone can self-host
- Independent grant funding (EF, Octant, ecosystem grants)
- Other detection contributors continuing the project

## Verification trail for impact claims

Every quantitative claim above is verifiable through:
- GitHub stars, forks, contributors
- npm/pip download stats for the (planned) SDKs
- Public API call count statistics (we publish anonymised totals quarterly)
- Public retrospectives (linkable URLs)
- Customer testimonials (with their permission)

If you (RetroPGF reviewer) want raw data to verify, contact support@sybilshield.org.

## Team / identity

- Founder: [REAL NAME] · [EMAIL] · [GITHUB] · [TWITTER]
- Pre-incorporation; Delaware C-corp planned Q4 2026

## Links

- https://github.com/USER/sybilshield
- https://sybilshield.org
- https://sybilshield.org/methodology.html
- https://sybilshield.org/status.html

## Honest caveats

- This grant application is best filed in retro round N+1 (not N) — we want shipped Optimism impact to point at first
- We have not yet published a public retro on an Optimism-ecosystem airdrop. Planned: Velodrome v2 retro Q3 2026
- We're new to RetroPGF and would value reviewer guidance on what evidence carries most weight
