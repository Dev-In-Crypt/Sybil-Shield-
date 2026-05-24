# SybilShield — Airdrop Sybil Detection as a Service

## One-Pager: Stop airdrop farmers before they steal from your community.

---

## 1. The Problem

Airdrops are broken. Every major token distribution in 2024-2026 has been exploited by Sybil farmers — attackers who create hundreds or thousands of fake wallets to claim disproportionate token allocations meant for real users.

The scale of damage is staggering:

- **Arbitrum (2023):** 2.3 million wallets bridged before the snapshot. After filtering, only 625,143 were eligible. Despite Nansen's work, 148,595 Sybil addresses still slipped through and collected roughly 21.8% of distributed tokens.
- **zkSync (2024):** Filters were weak. One farmer publicly extracted approximately $753,000 from 85 wallets. Another individual reportedly controlled more than 21,000 addresses.
- **Linea (2025):** 517,000 out of 1.3 million eligible addresses (40%) were flagged as Sybil wallets.
- **LayerZero (2024):** Ran the most aggressive anti-Sybil campaign in history — filtered 803,273 wallets and offered self-reporting amnesty. Approximately 100,000 wallets confessed.
- **Aptos:** Sybil addresses accounted for 40% of tokens deposited to exchanges after the airdrop.
- **CoinGecko reports:** 88% of airdropped tokens lose value within three months — partly because farmers dump immediately.

The airdrop market is massive. CryptoRank tracks $6.6 billion+ in airdrop distributions in 2024 alone, with Starknet ($1.3B), zkSync ($2B peak), LayerZero ($700M+), and Hyperliquid ($7B+ at peak). The market for airdrop-related services has reached $427 million in 2025, growing at 38% CAGR.

Yet most projects still handle Sybil detection through:
1. **Manual analysis** — data scientists writing one-off SQL queries on Dune
2. **Basic heuristics** — "must have 3+ months history" or "5+ transactions"
3. **Expensive consultants** — hiring Nansen or Chainalysis for $50K-150K per campaign
4. **Trusta Labs** — the only real API-based tool, but limited in scope

The result: projects either overspend on detection, underinvest and lose millions to farmers, or delay launches while they figure out filtering.

---

## 2. The Solution

SybilShield is an API-first Sybil detection platform built specifically for airdrop and token distribution campaigns. Projects submit a list of wallet addresses and receive back a scored, classified, and clustered analysis within hours — not weeks.

### How it works:

```
Project provides: List of 10K-10M wallet addresses + chain(s)
                   ↓
SybilShield runs:  1. Funding Source Analysis
                   2. Transaction Pattern Clustering  
                   3. Temporal Behavior Detection
                   4. Graph-Based Community Detection
                   5. Cross-Chain Identity Linking
                   6. ML Confidence Scoring
                   ↓
Project receives:  Per-address Sybil Risk Score (0-100)
                   Cluster IDs (which wallets belong together)
                   Evidence report for each flagged address
                   Summary statistics & recommendations
                   Exportable CSV / API response
```

### Core detection methods:

**1. Funding Source Analysis**
Track where each wallet got its initial ETH/gas. If 50 wallets were all funded from the same source within the same hour → cluster them as Sybil. This catches 60-70% of amateur farmers.

**2. Transaction Pattern Clustering (OPTICS / DBSCAN)**
Sybil wallets tend to execute identical sequences of transactions at similar times. Bridge → swap → LP deposit → withdraw → bridge back. The pattern repeats across wallets with mechanical precision. Cluster wallets by behavioral similarity.

**3. Temporal Behavior Detection**
Real humans interact with protocols at irregular intervals. Sybil farms show scripted timing: transactions exactly 30 seconds apart, activity bursts at identical times, dormancy patterns that match across wallets. Flag statistical anomalies in timing distributions.

**4. Graph-Based Community Detection (Louvain Algorithm)**
Build a transaction graph: wallets are nodes, transfers between them are edges. Run community detection to find tightly connected clusters that are isolated from the broader network. Sybil farms form dense subgraphs.

**5. Cross-Chain Identity Linking**
Same entity bridges from Ethereum → Arbitrum → Optimism → Base using the same bridge contract within minutes. Link wallet identities across chains via bridge transaction correlation.

**6. ML Confidence Scoring**
Ensemble model (LightGBM + graph neural network) trained on labeled Sybil data from public datasets (Arbitrum, LayerZero, Linea). Outputs a 0-100 confidence score per address. Score of 80+ = high risk. Score below 30 = likely genuine.

### Key differentiator: Evidence Reports

Unlike Trusta Labs which returns a single number (0-100 score), SybilShield returns **evidence** for every flagged address:
- "Funded by 0xABC...123 which also funded 47 other addresses in this set"
- "Transaction pattern matches cluster #4872 (89 addresses, 94% similarity)"
- "Activity window: all 89 addresses active only between 14:00-14:30 UTC on the same 3 days"

This matters because projects need to **justify** their filtering to the community. When LayerZero published their Sybil list, thousands of users complained about false positives. With evidence reports, projects can publish transparent criteria and handle appeals.

---

## 3. Why Now

Several converging trends make 2026 the right time:

1. **Sybil detection is now mandatory.** The majority of significant airdrops in 2025-2026 implemented Sybil filtering. Projects that skip it are increasingly rare and tend to be lower value.

2. **AI agents are making farming harder to detect.** Farmers are upgrading from simple scripts to AI-powered agents that mimic human behavior. Simple heuristics no longer work. Projects need ML-powered detection.

3. **Upcoming massive airdrops create immediate demand.** Polymarket (confirmed airdrop, $15B company), Monad ($244M raised), MegaETH ($107M raised), MetaMask — all planning token distributions. Each one needs Sybil detection.

4. **Regulatory pressure.** Under the SEC's 2024 Framework for Token Distribution Events, KYC may be required for distributions above certain thresholds. Sybil detection becomes a compliance tool, not just an optimization.

5. **The tooling gap persists.** Trusta Labs is the only API-based tool, and their limitations are well-documented: Ethereum-only for Gitcoin Passport stamps, limited multi-chain support, 100K monthly API call limits. The market needs competition.

---

## 4. Competitive Landscape

| Company | What They Do | Strengths | Weaknesses |
|---|---|---|---|
| **Trusta Labs** | AI-powered Sybil scoring API | Integrated with Galxe & Gitcoin, 82.8M API calls in 2024, multi-chain expanding | Ethereum-focused for stamps, black-box scoring, limited evidence, 100K monthly limit |
| **Nansen** | Blockchain analytics platform | Smart money labels, institutional grade | Not Sybil-specific, expensive ($150K+), general-purpose |
| **Chainalysis** | Blockchain compliance & investigation | Enterprise trust, regulatory relationships | Too enterprise, too expensive, not optimized for airdrops |
| **Allium** | On-chain analytics API | Used by Drift for Sybil analysis | Analytics platform, not detection service |
| **Gitcoin Passport** | Identity verification stamps | Proof-of-personhood, composable | User-facing, not project-facing, requires user action |
| **Worldcoin/Civic** | Biometric / identity verification | Strong identity proof | Requires user participation, privacy concerns, friction |
| **Custom (Dune + SQL)** | DIY analysis | Free, flexible | Requires data science team, weeks of work, not scalable |

**SybilShield's position:** Between Trusta (API score) and Nansen/Chainalysis (expensive consulting). We offer Trusta-level automation with Nansen-level depth, at a price point accessible to mid-stage projects.

---

## 5. Target Market

### Primary segments:

| Segment | Size | Deal Size | Priority |
|---|---|---|---|
| Pre-airdrop token projects | 100-200/year | $5,000-25,000 per analysis | Primary |
| Launchpad platforms (Pump.fun, Believe, etc.) | 20-30 | $2,000-5,000/mo subscription | Primary |
| Web3 marketing agencies running airdrop campaigns | 50-100 | $1,000-3,000/mo | Secondary |
| DAO governance (Sybil-proof voting) | 500+ | $500-2,000/mo | Future |
| DeFi protocols (farming detection) | 200+ | $2,000-5,000/mo | Future |

### Ideal first customer:
A project with $5-50M raised, planning an airdrop in the next 1-3 months, with 100K-2M eligible addresses to filter. They've tried basic heuristics and know it's not enough, but can't afford $150K for Nansen/Chainalysis consulting.

---

## 6. Business Model

### Pricing

**Per-Analysis (one-time)**
- **Starter:** $2,500 — Up to 100K addresses, single chain, basic scoring
- **Standard:** $7,500 — Up to 500K addresses, multi-chain, full scoring + clustering + evidence
- **Enterprise:** $15,000-50,000 — 1M+ addresses, custom models, dedicated support, appeal handling

**Subscription API (ongoing)**
- **Developer:** $499/mo — 50K API calls/mo, single-address scoring endpoint
- **Growth:** $1,499/mo — 250K API calls/mo, batch analysis, clustering, webhooks
- **Enterprise:** $4,999/mo — Unlimited calls, custom models, SLA, dedicated instance

### Revenue model math:

| Scenario | Monthly Revenue | How |
|---|---|---|
| Conservative (Month 6) | $15,000-25,000 | 3-4 per-analysis deals + 5-10 API subscribers |
| Moderate (Month 12) | $40,000-80,000 | 5-8 per-analysis + 20-30 API subscribers + 1 enterprise |
| Optimistic (Year 2) | $100,000-250,000 | Platform partnerships + enterprise contracts + API growth |

### Unit economics:
- Per-analysis variable cost (Alchemy Scale, ~150 CU × 2 calls per address):
  - 100K addresses: ~$200–400 (fits one Alchemy month-block; cost is mostly compute + S3 + ML inference)
  - 500K addresses: ~$800–2,000 (requires Alchemy Scale+ or self-hosted node to avoid throttling)
  - 1M+ addresses: $2,000–5,000 (self-hosted Erigon/Reth node becomes mandatory; node infra ~$300/mo amortized)
- **Self-hosted archive node strategy** (Month 4+): one-time ~$300/mo dedicated server (Hetzner AX102 or similar) drops per-analysis variable cost by 60–80%, paying for itself after ~3 analyses/mo
- API variable cost per subscriber: $50–150/mo (compute + cached on-chain reads)
- Gross margin: 78–88% at MVP (Alchemy-only); 88–93% once self-hosted node deployed
- CAC: $500–2,000 (content marketing + direct outreach)
- LTV (API subscribers, 8-month average retention): $4,000–12,000

---

## 7. Go-to-Market Strategy

### Phase 1: Build credibility through public analysis (Weeks 1-6)

**The playbook:** Analyze completed airdrops retroactively and publish the results.
- Take Linea's airdrop data (public). Run your detection. Publish: "SybilShield identified 523K Sybil addresses vs Linea's 517K — here's what they missed and what they over-filtered."
- Do the same for LayerZero, Berachain, Starknet.
- Publish on X/Twitter as long threads with data visualizations.
- Open-source a basic version of the clustering algorithm on GitHub.

This establishes credibility without any customers. When a project googles "airdrop Sybil detection," they find your analysis.

**Legal & PR guardrails for public retros (non-negotiable):**
- **Never publish specific wallet addresses as "Sybil."** Publish aggregate statistics, cluster sizes, and methodology only. Specific addresses are shared privately with the affected project under NDA, never on Twitter/X.
- **Frame as agreement/disagreement with the project's own filter**, not as ground-truth verdicts: "Our detector agrees with Linea on 478K/517K of their flagged addresses, and identifies 45K addresses Linea missed" — not "these wallets are Sybil farmers."
- **Disclaimers on every public post**: results are probabilistic, do not constitute accusations, and may contain false positives. No individual claims.
- **No screenshots of individual addresses, ENS names, or transactions** that could be tied to a real person.
- **Have a takedown/appeal address** (`support@sybilshield.org`) listed in every public post. Document policy: 48hr response, free re-analysis, public correction if we were wrong.
- **Defamation insurance** ($2K–5K/yr for early stage): cheap relative to one frivolous suit.

The same principles apply when customers publish their own filter results using our scores: contractually require disclaimers + appeal flow in the Standard and Enterprise SLAs.

### Phase 2: First paying customers (Weeks 5-12)

- Monitor fundraising announcements for projects likely to airdrop
- Direct outreach to foundation teams and growth leads
- Offer first analysis at 50% discount with case study rights
- Target upcoming airdrops: Polymarket, Monad, MegaETH ecosystem projects

### Phase 3: Platform partnerships (Months 3-6)

- Integrate with Galxe (airdrop campaign platform)
- Integrate with Gitcoin Passport (add as a credential)
- Partner with launchpads (Pump.fun, Believe, etc.)
- One platform partnership = continuous deal flow

### Phase 4: API self-serve (Months 6-12)

- Launch self-serve dashboard where projects upload address lists
- Stripe billing, instant analysis, no sales call needed
- Content marketing + SEO for "Sybil detection API" keywords

---

## 8. Technical Moat

Unlike SpacePack or VaultBrief, SybilShield has a genuine technical moat that grows over time:

1. **Labeled training data accumulates.** Every analysis produces labeled Sybil/genuine addresses. The ML model improves with each customer. Competitors starting later have less data.

2. **Cross-customer intelligence.** A Sybil cluster detected in Project A's analysis gets flagged automatically in Project B's analysis. Network effects: more customers → better detection → more customers.

3. **Graph database of known Sybil entities.** Over time, SybilShield builds the most comprehensive database of Sybil wallet clusters across chains. This is extremely hard to replicate without doing the work.

4. **Speed advantage.** A custom Dune analysis takes 2-4 weeks. Nansen consulting takes 4-8 weeks. SybilShield returns results in hours. For projects on a launch timeline, speed matters.

---

## 9. Investment Potential

### Why a VC would fund this:

1. **Massive and growing TAM.** $6.6B+ in airdrops in 2024. If SybilShield captures 0.5% of that as detection fees, that's $33M/year revenue potential.

2. **Winner-takes-most dynamics.** Sybil detection has strong network effects (more data → better models). First mover with best data wins.

3. **Multiple expansion paths.** Start with airdrops → expand to DAO governance Sybil detection → DeFi farming detection → general blockchain identity scoring → compliance layer.

4. **Proven demand.** LayerZero, Linea, Arbitrum, Wormhole, Ethena — all invested heavily in Sybil detection. Trusta Labs (seed-funded by HashKey Capital) processed 82.8M API calls in 2024. The market exists.

5. **Infrastructure play.** SybilShield can become the "credit scoring" layer for Web3 — every project checks addresses against SybilShield before distributing anything.

### Fundraising target:
Pre-seed: $500K-1M for 2-person team (ML engineer + full-stack), data infrastructure, and first 6 months.

---

## 10. Risks and Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| Trusta Labs expands aggressively | High | Differentiate on evidence reports, multi-chain depth, and pricing. Trusta is expanding into identity/humanity, not doubling down on airdrop analysis. |
| Farmers adapt to detection methods | High | Continuous model retraining on new patterns. Adversarial ML is a feature, not a bug — it creates ongoing need for the service. |
| Fewer airdrops in bear market | Medium | Expand to DAO governance and DeFi farming detection which persist regardless of market cycle. |
| False positives cause backlash | High | Evidence reports + appeal flow + audit log (evidence_audit_log table) + public methodology. Honest precision/FPR metrics from Day 1 — no overclaiming. |
| Data access limitations | Medium | Use public on-chain data. Self-hosted Erigon/Reth node deployed by Month 4–6 to remove dependence on Alchemy quotas. |
| Nansen/Chainalysis enter the space | Medium | They optimize for enterprise compliance, not airdrop-specific detection. Different buyer, different product. |
| Legal risk from public retro analyses or customer use | **Medium-High** | (1) Never publish individual wallet addresses publicly. (2) Aggregate stats only. (3) Disclaimers everywhere. (4) Appeal address + 48hr response policy. (5) Defamation insurance from Month 1. (6) Contractually require customers to provide appeal flow when using our scores. |
| Training-data poisoning (other detectors' FPs propagate) | **High** | Tiered labeling system (Step 0): T1+T2 (confessed + manually verified) used for eval; T4 (other detectors) only for training augmentation with reduced sample weight. |
| Model staleness as farmers adapt | High | Adversarial test set + drift detection + monthly retraining (Step 8.5). |

---

## 11. Metrics to Track

| Metric | Target (Month 6) | Target (Month 12) |
|---|---|---|
| Analyses completed | 15-20 | 50-80 |
| API subscribers | 10-15 | 30-50 |
| Total addresses scored | 5M | 25M+ |
| Known Sybil clusters in DB | 50K | 250K+ |
| Detection precision (vs T1+T2 ground truth) | ≥85% | ≥92% |
| Detection recall (vs T1+T2 ground truth) | ≥75% | ≥85% |
| False positive rate (vs G1 verified-genuine) | ≤5% | ≤3% |
| Adversarial test recall | ≥60% | ≥80% |
| MRR | $15K-25K | $40K-80K |
| Customer retention (API) | >75% | >80% |
| Public analysis views (X) | 100K | 500K+ |
