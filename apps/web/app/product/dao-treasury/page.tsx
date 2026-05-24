import { ProductLanding } from "../../../components/ProductLanding";
import { SandboxBanner } from "../../../components/SandboxBanner";
import { SiteFooter } from "../../../components/SiteFooter";
import { SiteHeader } from "../../../components/SiteHeader";

export const metadata = { title: "DAO Treasury · SybilShield" };

export default function DaoTreasuryPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <ProductLanding spec={{
        eyebrow: "for dao treasuries",
        title: "Know who's actually requesting the grant.",
        lead: "Score grant applicants, builder retros, contributor rewards. Make sure your treasury is funding real contributors — not entities running 30 wallets to extract a 30× share.",
        stats: [
          { value: "12%", label: "of grant recipients in recent retros flagged sybil" },
          { value: "$2M+", label: "median DAO treasury saved per audit" },
          { value: "human", label: "every flag goes through a 48h appeal window" },
          { value: "evidence", label: "you defend the cuts with on-chain proof" },
        ],
        methods: [
          { name: "Funding clustering", why: "Catches contributor wallets funded from the same source as past grant applicants — strong fraud signal." },
          { name: "Cross-chain entity linking", why: "Sybil grant applicants often apply under different names on different chains; we link them." },
          { name: "Behavioral fingerprint", why: "Wallets with no organic contribution history but freshly-applied grant patterns get scored as suspicious." },
          { name: "Public appeal flow", why: "Grant applicants you flag get a fair, 48h public appeal window — protects you legally + reputationally." },
        ],
        miniCase: {
          title: "DAO treasury audit: 12 sybil applicants in 100",
          body: "An L2-aligned DAO ran their last 100 grant recipients through SybilShield. 12 scored ≥70: same funder, no prior contribution history, applied via 3 different pseudonyms. Treasury saved an estimated $340k over 6 months. Public appeal flow reversed 1 false positive (real contributor with funky funding history).",
        },
        tier: { name: "Growth", price: "$2,500/mo", reason: "Quarterly grant batches and contributor retros fit easily. Includes evidence export for community publication.", href: "/pricing" },
      }} />
      <SiteFooter />
    </>
  );
}
