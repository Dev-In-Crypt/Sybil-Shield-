# LayerZero Foundation Grants — submission-ready

> Apply at: https://dev.layerzero.network/ecosystem (Ecosystem program)
> Also: https://layerzero.foundation/grants — separate foundation grants

---

## Strategy

LayerZero was burned by their own airdrop — 803K wallets filtered, methodology private, community backlash, public amnesty program later. The amnesty list itself became one of the highest-quality T1 (confessed) Sybil datasets in our training corpus.

**Pitch angle:** "We're the tool that would have prevented the LayerZero post-airdrop crisis if it had existed then — AND we're the tool that makes the next omnichain distribution defensible."

---

## Pre-requisites

- [ ] **Stargate Finance integration in code** — we already use Stargate bridge events for cross-chain entity linking. Highlight this.
- [ ] **Public acknowledgement that we use LayerZero amnesty list** as a T1 training source (we do; it's in our manifest.yaml under `layerzero-amnesty`)
- [ ] **Tweet at @LayerZero_Labs / @PrimordialAA** before submitting

---

## Application

### Project name

```
SybilShield — Sybil-detection infra with native cross-chain linking via LayerZero bridge events
```

### Tagline

```
Catches cross-chain farms that single-chain filters miss. Built on LayerZero bridge data.
```

### Project URL

```
https://sybilshield.org
```

### Funding ask

```
$50,000 USDC over 6 months
```

### Why this matters for LayerZero specifically (~300 words)

```markdown
Single-chain filters miss the most sophisticated farms — the ones that split activity across chains so no per-chain filter alone hits a threshold. Bridges are where the truth lives: deterministic on-chain proof that the EOA on chain A is the EOA on chain B.

LayerZero is the dominant omnichain message protocol. Stargate, Hop-style bridges, and the broader LayerZero-powered ecosystem emit structured events that our cross-chain identity linking module consumes. We're not "just another customer of LayerZero" — we're using the protocol's defining capability (omnichain messaging) as a primary signal.

**Concrete reciprocal value to LayerZero:**

1. **Future LayerZero distributions become defensible.** If LayerZero (or any major LayerZero-deployed protocol) runs another token event, they can publish their filter methodology openly via SybilShield. No more "trust us" lists. The post-airdrop crisis pattern doesn't repeat.

2. **LayerZero amnesty data gets a second life.** The 100K+ self-confessed addresses are training data for the broader community. We credit LayerZero explicitly in our manifest. Other chains and projects fine-tune their detection using improved models that started from this data.

3. **Stargate-specific cross-chain scoring.** We can ship a Stargate-aware adapter — flag farms specifically routing capital through Stargate to fake one-chain history. This makes the LayerZero stack itself harder to abuse.

4. **Audit-log standard.** Our immutable audit-log schema is reusable. Any OFT or omnichain token using SybilShield gets legally defensible filtering. LayerZero ecosystem becomes the easiest place to launch a Sybil-resistant distribution.

5. **Appeal protocol.** Future LayerZero-ecosystem distributions ship with public appeals as default. The reputation cost LayerZero paid in 2024 doesn't fall on the next protocol that uses LayerZero.

We're MIT, in production, with the cross-chain module already built. Funding accelerates Stargate-specific work + retro analysis of past LayerZero filter decisions (aggregate-only).
```

### Deliverables

| Month | Deliverable |
|---|---|
| 1 | Stargate bridge event indexer in production; cross-chain scoring for any LayerZero-stack token |
| 2 | Public retro of LayerZero airdrop filter (aggregate-only, methodology peer-reviewable) |
| 3 | OFT (Omnichain Fungible Token) integration adapter — drop-in Sybil filter for any OFT launch |
| 4 | LayerZero-specific adversarial test set (omnichain farming patterns) |
| 5 | Documentation: "How to run a Sybil-resistant OFT launch in 2026" |
| 6 | Joint blog post with LayerZero Foundation (if they want) on lessons from amnesty data |

### Integration points (technical)

```
Already in code (apps/ml/sybilshield/clustering/cross_chain.py):
- Stargate bridge event consumer
- LayerZero OFT transfer event consumer  
- Cross-chain wallet linking via deterministic bridge match
```

### Technical credibility

```
- All 6 detection methods open-source MIT
- 18 API tests + 47 ML tests green in Docker CI
- Production deployment with TLS at api.sybilshield.org
- Real Alchemy data on Ethereum + Arbitrum + Optimism + Base + Polygon
- LightGBM v0.2.0 trained on 15K labeled corpus including LayerZero amnesty as T1
```

### Why grant vs commercial license

```
We charge enterprises for the hosted product (per-analysis batches start at $2,500). But:
- The CROSS-CHAIN MODULE itself is and will remain MIT
- Any OFT project can self-host and use it for free
- The appeal protocol spec is community-owned

LayerZero grant funds the integration + retro + documentation work that customers don't directly subsidise.
```

### Team & contact

```
Solo founder + open-source contributors. Pre-incorporation.
Founder: [NAME] · [TWITTER] · [EMAIL]
Repo: https://github.com/Dev-In-Crypt/Sybil-Shield- (commits since [DATE])
```

### Note on the amnesty data

```
We use the LayerZero amnesty list as a T1 (confessed) training source. Credit appears explicitly in apps/ml/sybilshield/data/labeled/manifest.yaml. We treat this data as the highest-confidence Sybil label available in the open ecosystem.

If LayerZero Foundation prefers we remove or relabel this source, happy to do so — but we'd argue the public-good case for treating it as the reference dataset is strong.
```
