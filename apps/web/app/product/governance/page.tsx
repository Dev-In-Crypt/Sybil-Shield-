import { ProductLanding } from "../../../components/ProductLanding";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

export const metadata = { title: "Governance · SybilShield" };

export default function GovernancePage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <ProductLanding spec={{
        eyebrow: "for dao operators",
        title: "One-vote-per-entity, not per-wallet.",
        lead: "Pre-vote Sybil scans on Snapshot or on-chain proposals. We score every voting wallet and tell you how many unique entities are actually behind them. Use the scores as input to your weighting algorithm.",
        stats: [
          { value: "~33%", label: "median wallet-to-entity ratio in DAO votes" },
          { value: "4h", label: "turnaround on typical proposal voter set" },
          { value: "$0", label: "free tier covers most DAO votes" },
          { value: "open", label: "scores publishable for community review" },
        ],
        methods: [
          { name: "Funding clustering", why: "DAO sybil attacks often use freshly-funded wallets from a single source — the highest-signal method here." },
          { name: "Behavioral fingerprint", why: "Voting wallets created days before a contentious vote with no other activity = strong signal." },
          { name: "Cross-chain linking", why: "Entities holding voting tokens on multiple chains get linked back to one identity." },
          { name: "Temporal correlation", why: "Wallets that vote within seconds of each other across many proposals are flagged as a coordinated bloc." },
        ],
        miniCase: {
          title: "DAO-X: 614 wallets → 412 entities",
          body: "A treasury proposal was passing 53/47. We scored the voter set; two clusters of 78 and 53 wallets were aligned YES. Removing their weight flipped the result to 49/51. The DAO re-ran the vote with one-entity-one-vote weighting — the proposal failed by 18 points.",
        },
        tier: { name: "Free → Starter", price: "$0 → $99/mo", reason: "Most DAO votes fit in the free tier (100 calls/month). Starter when you need webhook delivery into Snapshot.", href: "/pricing" },
      }} />
      <SiteFooter />
    </>
  );
}
