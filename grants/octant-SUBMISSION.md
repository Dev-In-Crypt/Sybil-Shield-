# Octant — submission-ready

> Apply at: https://octant.app (during open epoch — check schedule)
> Epoch length: **90 days**; allocation comes from Golem GLM staking yield
> Selection: community vote + Golem Foundation review

---

## Pre-requisites

- [ ] **Proof of Personhood**: Octant requires connected identities (Gitcoin Passport ≥15 score + WorldID or Polygon ID)
- [ ] **GLM staking position** is helpful but not required for projects (it's required for VOTERS)
- [ ] Public GitHub repo
- [ ] Live demo URL

---

## Project name

```
SybilShield — Open Sybil detection for Ethereum distributions
```

## One-liner

```
MIT-licensed Sybil detection engine with built-in public appeal protocol. Six methods, evidence per address, immutable audit log.
```

## Project URL

```
https://sybilshield.org
```

## Repository

```
https://github.com/Dev-In-Crypt/Sybil-Shield-
```

## Funding amount

```
$25,000 in ETH equivalent (one epoch ≈ 3 months runway for the public-good components)
```

## Description (~400 words)

SybilShield is open detection infrastructure for Ethereum token distributions. Six independent detection methods (funding-source clustering, behavioral HDBSCAN, graph Leiden, temporal anomaly, cross-chain entity linking, LightGBM ensemble) produce probabilistic scores 0–100 per wallet, each with a structured evidence payload. Every flag writes to an immutable audit log. Every published filter list using our scores must expose a public appeal endpoint with 48h SLA — this is contractual, not optional.

We're trying to establish "appeal flow mandatory" as the community standard for any public filter list naming wallets Sybil. Current Sybil-detection landscape (Trusta, Nansen, Chainalysis) is closed-source, unappealable, and shipped on faith. The cost falls on real users when they get filtered wrongly, on projects when farmers slip through, and on the L2 ecosystem when each painful airdrop reduces willingness to launch tokens openly.

### Public goods we ship

| Component | What it gives the community |
|---|---|
| `GET /v1/score/:address` | Free public scoring of any address (rate-limited 30/hour per IP) |
| Open methodology | All 6 detection algorithms in MIT-licensed Python; auditable |
| Adversarial test set generator | Red-teamers can stress-test our claims publicly |
| Public retro-analyses | 4 published analyses in 2026 (Linea, LayerZero, Arbitrum, zkSync) — aggregate-only, peer-reviewable |
| Audit-log schema | Reusable spec for any other detector that wants legal defensibility |
| Appeal protocol spec | Becomes part of the SybilShield ToS for anyone publishing filter lists |

### Current status

Public beta live. Backend on Hetzner (api.sybilshield.org) with Let's Encrypt TLS. Frontend on Vercel. Real Alchemy provider on 5 chains. Billing enforcement live with Atlos (non-custodial crypto). 18 API tests + 47 ML tests green in CI. Baseline LightGBM model deployed.

### How epoch funding accelerates

- **First $15K**: Alchemy Scale tier + Hetzner CCX22 + manual labeled-data curation (paid researchers) → calibrated v1.0 model
- **Next $7K**: 2 public retro-analyses published (writing time + Alchemy CU for re-scoring 1M-address snapshots)
- **Last $3K**: TypeScript + Python SDK release + adversarial red-team contractor pass

By end of epoch: 1 trained-on-real-data model + 2 retros + SDK published + adversarial test set v1.

### Why Octant

Public-good detection infrastructure has no venture-scale return. The components benefit every project running a distribution, not just our paying customers. Octant's mission (long-term funding for public goods on Ethereum) matches what we're building — and the GLM-yield mechanism is structurally compatible with "useful even after the grant ends" infrastructure.

### Sustainability

Hosted product (subscriptions, per-analysis batches) runs commercially. Open-source components stay open regardless. If the company fails, the protocol survives in the fork.

## Allocation strategy for voters

If we get votes in this epoch, the math suggests we can deploy ~30% of the epoch yield to direct rewards for voters (per Octant rules), but our PREFERENCE is to direct 100% to project — every dollar goes to the deliverables list above. We won't compete with voter-reward strategies.
