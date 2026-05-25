# Arbitrum DAO grants — submission-ready

> Apply at: https://snapshot.org/#/arbitrumfoundation.eth (Snapshot vote required)
> Pre-discussion: https://forum.arbitrum.foundation/ (mandatory — 7 days minimum)
> Programs: **STIP** (Short-Term Incentives), **LTIPP** (Long-Term Incentives Pilot), **Plurality Labs Innovation**

---

## Strategy

Arbitrum is the most fertile ground because **they were the original sybil-disaster** — the 148,595 wallet list, the post-airdrop debrief, the Plurality Labs vote on "what would we do differently." A SybilShield proposal addresses an explicit institutional wound.

**Approach:**
1. Post draft on forum.arbitrum.foundation first → discuss 7-14 days
2. Iterate based on delegate feedback
3. Move to Snapshot vote with ≥3 named delegates as co-sponsors

---

## Pre-requisites

- [ ] **Forum account** at forum.arbitrum.foundation
- [ ] **Identify 3-5 active delegates** likely to support open-source infra grants. Top candidates:
  - L2Beat (Aleksander)
  - 404DAO (Olympus Labs)
  - Camelot DAO
  - Treasure DAO
  - Wintermute Governance (less likely but possible)
- [ ] **DM each delegate** before posting: "Drafting a grant proposal for open Sybil detection infrastructure — would value 10 min of your feedback before I post"
- [ ] **Deploy on Arbitrum** — enable Arbitrum chain in Alchemy + score 10K real Arb addresses publicly

---

## Forum post draft

```markdown
**[Non-Constitutional] SybilShield: Open Sybil-Detection Infrastructure for Arbitrum**

**Author:** [YOUR NAME / @TWITTER]
**Status:** Draft for community feedback
**Ask:** 40,000 ARB ($30K-50K at current price) over 6 months
**Eligible program:** Plurality Labs Innovation Track

# TL;DR

Arbitrum's 2023 airdrop produced a 148,595-address Sybil list that became the public-domain reference for L2 farming detection. Three years later, the community knows the **list** but not the **methodology** — every project filtering their own airdrop has to re-invent the detection wheel, and flagged wallets still have no standardised appeal.

SybilShield is open-source detection infrastructure that solves both. Six independent detection methods (MIT-licensed Python), an immutable audit-log schema, and a contractual appeal protocol. Live on Arbitrum at sybilshield.org/lookup since [DATE].

We're asking the Arbitrum DAO for 40K ARB to fund:
- A public retro of the 2023 Arbitrum airdrop using current methodology (aggregate stats only)
- Free public scoring API for any Arbitrum-ecosystem project filtering grants, governance votes, or distributions
- TypeScript SDK so Arbitrum governance tools can integrate detection natively
- Integration with Plurality Labs' delegate-incentive vote validity

# Why Arbitrum should fund this

1. **Institutional memory.** Every grant program, every governance vote, every protocol launch on Arbitrum has to re-solve "is this a real participant?" Currently each team builds in-house or pays Trusta/Nansen by-the-job. Open infrastructure ends that.

2. **The 2023 retro is overdue.** Multiple delegates have asked publicly what the Sybil filter would have looked like if it were redone with 2026 methodology. We can do it — aggregate-only, with full methodology — and publish it as a public good.

3. **Plurality Labs alignment.** Plurality Labs' work on delegate incentives needs vote-validity detection. SybilShield's `GET /v1/score/:address?chain=arbitrum` is the public infrastructure for that.

4. **Appeal protocol = community legitimacy.** Past Arbitrum filtering decisions had no formal appeal mechanism. We're proposing one as protocol-standard. This is the structural fix the community has been asking for.

# Deliverables

| Month | Deliverable | Verifiable by |
|---|---|---|
| 1 | Arbitrum chain enabled in production; free public scoring API live for Arb addresses | curl https://api.sybilshield.org/v1/score/0x...?chain=arbitrum |
| 2 | Public retro of 2023 Arbitrum airdrop (aggregate, methodology, no individual addresses) | Published at sybilshield.org/blog/arbitrum-2023-retro |
| 3 | TypeScript SDK + integration example for governance frontends | npm publish + Tally-compatible adapter |
| 4 | Adversarial red-team pass on Arb-specific patterns | Public report |
| 5 | Plurality Labs delegate-incentive integration | On-chain attestation issued for valid voters |
| 6 | Annual ecosystem report: "State of Sybil filtering on Arbitrum" | Published with raw aggregate data |

# Funding breakdown

| Item | Cost |
|---|---|
| Alchemy Scale tier (6mo) | $1,200 |
| Hetzner production hosting (6mo) | $1,800 |
| Public retro analysis (Alchemy CU + writing time) | $8,000 |
| TypeScript SDK + Tally integration | $6,000 |
| Adversarial red-team contractor | $4,000 |
| Plurality Labs integration eng time | $6,000 |
| Founder time, 50% on Arb-specific work | $13,000 |
| **Total** | **$40,000 (~40K ARB at current price)** |

# What we will NOT do with this money

- Fund the commercial hosted product (that runs on customer revenue)
- Pay ourselves to maintain non-Arbitrum chains (those benefit but aren't Arb-funded)
- Buy ARB to vote (would be a conflict of interest)

# Open source commitments

- All code MIT
- All retro analyses published openly
- Audit-log schema usable by any other detector
- Appeal protocol spec published as a community standard

# Risks

| Risk | Mitigation |
|---|---|
| Methodology challenged | Open code + per-flag evidence + appeal protocol mean every disagreement is verifiable |
| Slow execution | Already shipped, in production, 18+47 tests green; 6 months of execution risk is low |
| Conflict with Arbitrum Foundation's existing list | We're not republishing the list, only re-running OUR methodology and reporting aggregate disagreement honestly |

# Links

- Live: https://sybilshield.org
- Repo: https://github.com/Dev-In-Crypt/Sybil-Shield- (MIT)
- Methodology: https://sybilshield.org/methodology
- Existing tests: 18 API + 47 ML green in Docker CI

# Asking the community

Please indicate support / concerns in this thread. After 7-14 days of discussion I'll move to a Snapshot vote, with the proposal text adjusted per feedback.

Tagging delegates whose past votes suggest interest: @L2Beat @404DAO @CamelotDAO @TreasureDAO @[OTHERS]
```

## Snapshot vote setup (after forum discussion)

Use the **default Arbitrum DAO Snapshot space**: snapshot.org/#/arbitrumfoundation.eth

Vote type: **Single choice** (For / Against / Abstain)
Quorum: per current Plurality Labs rules
Duration: 7 days

If passed: Arbitrum Foundation processes the disbursement (ARB to your wallet) typically within 30 days.
