# Base Ecosystem Fund (Coinbase) — submission-ready

> Apply at: https://www.base.org/ecosystem (Builder Grants form)
> Also: https://www.coinbase.com/ventures/apply for follow-on Coinbase Ventures
> Profile: Coinbase, the operator of Base, funds builders deploying on Base with both direct USDC grants and follow-on Coinbase Ventures equity

---

## Strategy

Base is **Coinbase's** L2. They care a lot about:
1. Onchain identity / Sybil-resistance (Coinbase Verifications, Basenames, Worldcoin partnership)
2. Builder economy (small, fast-shipping teams)
3. USDC-native products (Coinbase's stablecoin)
4. Compliance-friendly tooling (Coinbase is a regulated entity)

**SybilShield positioning for Base:**
- Sybil detection plays directly into Coinbase Verifications use case
- We accept USDC (via Atlos) — aligns with USDC-first messaging
- We have audit log + appeal flow → compliance-friendly story for institutional builders on Base
- Open methodology = no Trusta/Nansen-style "trust us" relationship

---

## Pre-requisites

- [ ] **Deployment on Base mainnet** — Alchemy has Base enabled, just need a real customer-visible scoring of Base addresses
- [ ] **Basename**: register `sybilshield.base.eth` — strong signal of Base alignment
- [ ] **Coinbase Verification** on the founder's wallet
- [ ] **Onchain attestation** on Base via EAS (Ethereum Attestation Service)
- [ ] **Public retro on a Base-based protocol's distribution** (even a small one — show the use case)

---

## Application form (Base Builder Grants)

### Project name

```
SybilShield
```

### One-line description

```
Open-source Sybil detection with native USDC payments and built-in appeal flow — making Base distributions, governance, and grants resistant to coordinated farming.
```

### Project URL

```
https://sybilshield.org
```

### Description (~400 words)

```markdown
Coinbase Verifications give Base a serious head start on identity-resistant builder activity. SybilShield complements that for the **wallet-level** problem: most distributions, grants, and governance votes still need to filter coordinated farming activity that doesn't show up in identity checks alone.

Six independent detection methods (funding-source clustering, behavioral HDBSCAN, graph Leiden, temporal anomaly, cross-chain entity linking, LightGBM ensemble) produce probabilistic scores 0-100 per wallet, each with structured evidence. Every flag writes to an immutable audit log. Every project using our scores publicly must expose a 48h public appeal endpoint — built into our ToS, not optional.

**Live on Base since [DATE]:**
- `GET /v1/score/:address?chain=base` — free public scoring for any Base wallet
- Real Alchemy data, not synthetic
- Production at https://api.sybilshield.org (Hetzner + Let's Encrypt TLS)
- Repo at github.com/Dev-In-Crypt/Sybil-Shield- (MIT)

**Why Base specifically:**

1. **Sybil-resistant identity stack alignment.** Coinbase Verifications + Basenames + SybilShield wallet scoring = three layers of the identity stack. We integrate Basenames as a feature input (Basename ownership = positive signal).

2. **USDC-native.** Our crypto checkout (Atlos) settles in USDC by default. No third-party custodian. Aligns with Base's USDC-first messaging.

3. **Compliance-friendly story for institutional builders on Base.** Immutable audit log + public appeal protocol = legally defensible filtering decisions. We're the tool Coinbase Institutional clients can use without lawyer pushback.

4. **Builder economy.** Free 100 calls/mo tier serves the 2-person-team-on-Base profile. They can self-serve filtering for their distribution without enterprise sales call.

**What grant funding enables:**

- $25K: Base-specific integrations (Basename feature extractor, Coinbase Verifications adapter)
- $20K: Public retro of a Base-ecosystem distribution (aggregate-only, methodology peer-reviewable)
- $15K: Builder-focused docs + SDK release (TypeScript-first since most Base builders use it)
- $10K: Hetzner + Alchemy production runway, 6 months

**Sustainability:** Hosted product (subscriptions + per-analysis batches) runs commercially. Open-source components stay open regardless. Grant funds the Base-specific work that customers don't pay for.
```

### Funding amount

```
$70,000 USDC over 6 months
```

### Category

```
Developer tooling / Onchain identity / Public goods
```

### How will Base support help?

```
Three things:

1. Distribution amplification — a tweet from @base or @jessepollak about our public scoring API would 10x our awareness in the Base builder community
2. Coinbase Verifications + Basenames integration — direct engineering collab to make our Base detection the best-in-class
3. Builder-to-builder intros — connect us with Base-deployed projects running distributions that need Sybil filtering
```

### Demo

```
1. Open https://sybilshield.org/lookup
2. Paste any Base wallet (try jesse.base.eth's wallet, or any Friend.tech early account)
3. Get score + label + chain in <500ms
4. No signup required
```

### Team

```
Solo founder + open-source contributors. Pre-incorporation; plan Delaware C-corp via Stripe Atlas after first paid customer or grant lands.

Founder: [NAME] · [TWITTER] · [BASENAME].base.eth · [EMAIL]
```

### Why now

```
Base is on track for $X TVL and $Y daily transactions by EOY 2026. As Base-deployed protocols scale, they'll all eventually run distributions or token allocations. Existing detection options are either:
- Closed-source (Trusta, Nansen) — expensive, unappealable, methodology-on-faith
- DIY Dune queries — multi-week, unauditable, no SLA

Coinbase is uniquely positioned to back open Sybil-resistance infra. Builders building on Base need it now, not after the next $1B+ ecosystem distribution.
```
