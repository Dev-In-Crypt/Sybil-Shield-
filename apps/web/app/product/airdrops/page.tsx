import { ProductLanding } from "../../../components/ProductLanding";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

export const metadata = { title: "Airdrops · SybilShield" };

export default function AirdropsPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <ProductLanding spec={{
        eyebrow: "for foundation teams",
        title: "Protect your airdrop from coordinated farmers.",
        lead: "Pre-TGE Sybil filtering with evidence-backed scores in hours, not weeks. Six detection methods. Public appeal flow. Your community sees the methodology — no black box.",
        stats: [
          { value: "23%", label: "sybil rate in our illustrative L2 airdrop retro" },
          { value: "11h", label: "typical turnaround on 1M addresses" },
          { value: "free", label: "vs $50k-$200k for a Big 4 audit" },
          { value: "0.4%", label: "median false-positive rate in retros" },
        ],
        methods: [
          { name: "Funding clustering", why: "Catches the cheapest sybil pattern — multi-wallet funding from a single source. Recovers 60-70% of farms in most airdrops." },
          { name: "Behavioral HDBSCAN", why: "Finds wallets with statistically identical action sequences. Survives funding obfuscation." },
          { name: "Graph Leiden", why: "Detects coordinated transfer rings invisible to per-address rules." },
          { name: "Cross-chain entity linking", why: "Same actor, different chains — caught via deterministic on-chain hints (e.g. shared ENS, same CEX deposit address)." },
        ],
        miniCase: {
          title: "Linea airdrop retro: 287k sybils confirmed",
          body: "We re-scored the May 2024 Linea airdrop and confirmed 23% sybil rate against the Foundation's anchor set — plus surfaced 41,000 additional addresses they missed. Full methodology + reproducible scores in the case study.",
        },
        tier: { name: "Free public sandbox", price: "Free", reason: "Everything a campaign needs — evidence export, webhooks, and the public appeal page — at no cost. Fair-use limits keep the shared sandbox healthy.", href: "/pricing" },
      }} />
      <SiteFooter />
    </>
  );
}
