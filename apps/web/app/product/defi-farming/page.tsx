import { ProductLanding } from "../../../components/ProductLanding";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

export const metadata = { title: "DeFi Farming · SybilShield" };

export default function DefiFarmingPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <ProductLanding spec={{
        eyebrow: "for defi protocols",
        title: "Stop bleeding rewards to wallet farms.",
        lead: "Score every deposit, swap, or LP add in real time. Webhook fires when a wallet scores ≥70 — escrow the reward, hold for review, save 3-15% of your incentive budget.",
        stats: [
          { value: "8-15%", label: "of farming rewards typically leak to coordinators" },
          { value: "<200ms", label: "p95 score latency at the /v1/score endpoint" },
          { value: "real-time", label: "webhook on every deposit if you want it" },
          { value: "auditable", label: "every escrow decision has evidence attached" },
        ],
        methods: [
          { name: "Funding clustering", why: "Farms split capital from a single funder across 100s of wallets — the canonical pattern, highest yield method." },
          { name: "Behavioral HDBSCAN", why: "Wallets that execute the exact same action sequence (deposit, claim, withdraw) within milliseconds of each other." },
          { name: "Temporal correlation", why: "Bot-coordinated deposits across many wallets fire on the same block height — easy to catch in bulk." },
          { name: "ML ensemble", why: "Combines the above into a single score so your webhook handler can do a single comparison." },
        ],
        miniCase: {
          title: "DeFi protocol: $1.8M saved from 380-wallet farm",
          body: "A yield-farming protocol with per-wallet reward caps wired /v1/score into its deposit webhook. Over 90 days we attributed 380 freshly-funded wallets to a single coordinator. Rewards escrowed, redistributed to legitimate LPs after a 14-day appeal window.",
        },
        tier: { name: "Free public sandbox", price: "Free", reason: "Score farming rings with the full evidence pipeline at no cost. Running continuous, high-volume scoring? Email us for research access.", href: "/pricing" },
      }} />
      <SiteFooter />
    </>
  );
}
