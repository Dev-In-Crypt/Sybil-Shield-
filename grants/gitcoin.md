# Gitcoin Grants

**Submit at:** https://grants.gitcoin.co/ (each round)
**Form:** Quadratic funding round
**Target:** Web3 OSS Round (or Sybil-Detection-specific round if active)

---

## Project name

SybilShield

## Short description (160 chars)

Open-source Sybil-detection engine for token distributions. 6 methods, public methodology, MIT licensed. Built so airdrops work for real users.

## Long description

Airdrops are broken. Every major distribution in 2023-2026 lost 20-40% of value to industrial Sybil farming. Real users get less; farmers dump immediately; the project's PMF signal is corrupted; the ecosystem loses credibility.

SybilShield is the open-source detection engine for fixing this. Six independent detection methods (funding-source clustering, behavioral HDBSCAN, graph community detection via Leiden, temporal anomaly features, cross-chain identity linking, ML ensemble) produce evidence-backed scores. Every flagged event writes to an immutable audit log. A public appeal endpoint with a 48-hour SLA is built into the protocol from day one.

The hosted service is commercial. The protocol — clustering algorithms, feature extractors, audit-log schema, appeal flow specification — is MIT-licensed on GitHub. Same model as Sentry, Posthog, Supabase: operations are paid, the protocol is a public good.

We're applying to Gitcoin because the methodology, the appeal protocol, and the planned public retrospectives benefit the entire Ethereum ecosystem — not just our customers. Quadratic funding matches the breadth of this benefit.

## What we'll do with funding

100% of Gitcoin contributions go to the public-good components:

1. **Free public scoring API** — `GET /v1/score/:address` rate-limited but free for anyone to test
2. **Public retrospectives** — aggregate-only analyses of completed airdrops (Linea Q3, LayerZero Q3, Arbitrum Q4)
3. **Open methodology maintenance** — keeping documentation current, accepting community PRs
4. **Adversarial test set** — public benchmarks so other detectors can validate against the same evasion techniques

Per-quarter public-good budget transparently published at https://sybilshield.org/budget (will go live).

## What contributors get

Visibility into a public-good project that improves how every Ethereum project does airdrops. Direct line to the team. Optional recognition in the contributors section of the GitHub README (with consent).

No token. No promise of future distribution. No vested interest beyond the satisfaction of funding open infrastructure.

## Why Gitcoin specifically

Gitcoin Grants is the longest-running infrastructure for funding Ethereum public goods. Sybil detection is literally a Gitcoin-relevant problem (Gitcoin Passport exists because of it). The match multiplier rewards breadth — and Sybil detection benefits every airdrop, every governance vote, every DeFi protocol concerned about farming.

Plus we want to dogfood: SybilShield should be used to verify Gitcoin Passport stamps in the next iteration, and Gitcoin Passport stamps inform our G1-tier labels. The relationship is symbiotic.

## Verifiable claims

- 63 automated tests green: `docker compose -f docker-compose.test.yml up`
- 6 detection methods, each unit-tested with synthetic ground truth
- MIT license: `LICENSE` at repo root
- Public retrospectives: published at https://sybilshield.org/blog
- Open-source contributors welcome: `CONTRIBUTING.md`

## Team identity

[REAL NAME] · solo founder · pre-incorporation
GitHub: https://github.com/USER
Twitter: @[HANDLE]
Email: support@sybilshield.org

## Treasury

[TREASURY ADDRESS — Gnosis Safe 2-of-3]

## Links

- https://github.com/USER/sybilshield
- https://sybilshield.org
- https://sybilshield.org/methodology.html
- https://sybilshield.org/status.html
- (Linea retro URL when published)
