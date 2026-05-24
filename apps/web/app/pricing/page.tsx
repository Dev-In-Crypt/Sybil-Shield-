import Link from "next/link";
import { CryptoPayButton } from "../../components/CryptoPayButton";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { StatusBadge } from "../../components/StatusBadge";

export const metadata = { title: "Pricing · SybilShield" };

export default function PricingPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Simple pricing, public methodology</h1>
          <p className="mt-3 text-zinc-400">
            Free tier today. Paid plans launch with crypto checkout (NowPayments) — card
            payments after incorporation.
          </p>
        </div>

        {/* Subscription plans */}
        <section className="mt-16">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            API subscriptions
          </h2>
          <div className="mt-6 grid gap-6 md:grid-cols-4">
            <Plan
              name="Free"
              price="$0"
              suffix=""
              status="available"
              features={[
                "100 API calls / month",
                "Single-address scoring",
                "Read evidence reports",
                "Public appeal endpoint",
                "Community Discord",
              ]}
              cta={{ href: "/dashboard", label: "Start free" }}
            />
            <Plan
              name="Developer"
              price="$499"
              suffix="/mo"
              status="available"
              features={[
                "50K API calls / month",
                "Batch scoring (up to 100 / req)",
                "Webhook notifications",
                "All clustering methods",
                "Email support",
              ]}
              payable={{ plan: "developer", priceUsd: 499 }}
            />
            <Plan
              name="Growth"
              price="$1,499"
              suffix="/mo"
              status="available"
              highlight
              features={[
                "250K API calls / month",
                "Full per-analysis pipeline",
                "Evidence + cluster export",
                "Priority queue",
                "SLA: 99.5%",
                "Slack support",
              ]}
              payable={{ plan: "growth", priceUsd: 1499 }}
            />
            <Plan
              name="Enterprise"
              price="$4,999"
              suffix="/mo"
              status="available"
              features={[
                "Unlimited API calls",
                "Custom-trained models",
                "Dedicated instance",
                "SLA: 99.9% + 1h response",
                "On-call engineering",
                "Custom contract / DPA",
              ]}
              payable={{ plan: "enterprise", priceUsd: 4999 }}
            />
          </div>
        </section>

        {/* Per-analysis */}
        <section className="mt-20">
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            One-time per-analysis (no subscription)
          </h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            For airdrops and TGEs that need a single filtering pass. No commitment.
          </p>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <Plan
              name="Starter"
              price="$2,500"
              suffix="/ analysis"
              status="coming-soon"
              features={[
                "Up to 100K addresses",
                "Single chain",
                "Sybil score + label",
                "Basic clustering",
                "CSV export",
              ]}
            />
            <Plan
              name="Standard"
              price="$7,500"
              suffix="/ analysis"
              status="coming-soon"
              highlight
              features={[
                "Up to 500K addresses",
                "Multi-chain (up to 4)",
                "Full evidence per address",
                "All clustering methods",
                "Webhook on completion",
                "Appeal handling included",
              ]}
            />
            <Plan
              name="Enterprise"
              price="$15-50K"
              suffix="/ analysis"
              status="coming-soon"
              features={[
                "1M+ addresses",
                "All 8 chains + cross-chain",
                "Custom model retrained on your data",
                "Dedicated reviewer for appeals",
                "Public methodology audit",
                "Custom SLA",
              ]}
            />
          </div>
        </section>

        {/* Payment methods */}
        <section className="mt-20 rounded-lg border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-2xl font-semibold">Payment methods</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <PaymentMethod
              name="Crypto (USDT/USDC/ETH/BTC)"
              desc="Pay from your treasury wallet via NowPayments. Lowest fees, no KYC."
              status="coming-soon"
            />
            <PaymentMethod
              name="Bank wire (USD/EUR)"
              desc="For Enterprise contracts. After incorporation."
              status="roadmap"
            />
            <PaymentMethod
              name="Card (Stripe)"
              desc="Standard recurring billing. After incorporation."
              status="roadmap"
            />
          </div>
        </section>

        {/* Public-good commitment */}
        <section className="mt-20 rounded-lg border border-emerald-900/40 bg-emerald-900/10 p-8">
          <h2 className="text-2xl font-semibold text-emerald-200">Free public-good tier</h2>
          <p className="mt-3 max-w-2xl text-zinc-300">
            Any project can call <code className="font-mono text-emerald-300">GET /v1/score/:address</code> for
            free at low volume. No registration required for read-only on cached scores. The
            detection methodology is open-source (MIT) — you can audit, fork, or self-host.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold">Billing FAQ</h2>
          <div className="mt-6 space-y-4">
            <Faq q="When will paid plans go live?" a="After we secure either grant funding or first paid analysis. The crypto checkout flow is the next infra task on the roadmap — see /roadmap." />
            <Faq q="Can I pre-commit?" a="Yes - email support@sybilshield.org with your expected volume. We honour pre-commit pricing locked at today's tiers." />
            <Faq q="Refunds?" a="Per-analysis: no refunds once ingestion starts (compute is sunk cost). Subscriptions: prorated refund within 14 days, no questions." />
            <Faq q="Custom contracts / DPA / MSA?" a="Enterprise tier includes. We'll have a templates package after incorporation." />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function Plan({
  name,
  price,
  suffix,
  features,
  status,
  highlight,
  cta,
  payable,
}: {
  name: string;
  price: string;
  suffix: string;
  features: string[];
  status: "available" | "coming-soon" | "beta";
  highlight?: boolean;
  cta?: { href: string; label: string };
  payable?: { plan: "developer" | "growth" | "enterprise"; priceUsd: number };
}) {
  return (
    <div
      className={`flex flex-col rounded-lg border p-6 ${
        highlight ? "border-emerald-700/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{name}</h3>
        <StatusBadge status={status} />
      </div>
      <div className="mt-4">
        <span className="text-3xl font-bold">{price}</span>
        {suffix && <span className="text-sm text-zinc-500">{suffix}</span>}
      </div>
      <ul className="mt-6 flex-1 space-y-2 text-sm text-zinc-400">
        {features.map((f) => (
          <li key={f}>· {f}</li>
        ))}
      </ul>
      {cta ? (
        <div className="mt-6">
          <Link
            href={cta.href}
            className="block rounded bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-500"
          >
            {cta.label}
          </Link>
          <p className="mt-1 text-center text-[10px] uppercase tracking-widest text-zinc-600">
            // no card · cancel anytime
          </p>
        </div>
      ) : payable ? (
        <>
          <CryptoPayButton plan={payable.plan} priceUsd={payable.priceUsd} />
          <a
            href={`mailto:support@sybilshield.org?subject=${encodeURIComponent(`${name} plan — wire / card`)}&body=${encodeURIComponent(`Hi — I'd like to pay for the ${name} plan (${price}${suffix}) via wire transfer or card.\n\nCompany:\nVAT/EIN:\n\nThanks`)}`}
            className="mt-1 block text-center text-xs text-zinc-500 hover:text-emerald-400"
          >
            or pay by wire / card →
          </a>
        </>
      ) : (
        <a
          href={`mailto:support@sybilshield.org?subject=${encodeURIComponent(`${name} plan inquiry`)}&body=${encodeURIComponent(`Hi — I'd like to start on the ${name} plan (${price}${suffix}).\n\nUse case:\nMonthly volume:\nPreferred payment (card / crypto / wire):\n\nThanks`)}`}
          className="mt-6 rounded border border-emerald-700/60 bg-emerald-900/20 px-4 py-2 text-center text-sm font-medium text-emerald-300 hover:bg-emerald-900/40"
        >
          Contact sales
        </a>
      )}
    </div>
  );
}

function PaymentMethod({
  name,
  desc,
  status,
}: {
  name: string;
  desc: string;
  status: "coming-soon" | "available" | "roadmap";
}) {
  return (
    <div className="rounded border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{name}</h3>
        <StatusBadge status={status} />
      </div>
      <p className="mt-2 text-sm text-zinc-400">{desc}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <details className="group rounded border border-zinc-800 bg-zinc-900 p-4">
      <summary className="cursor-pointer font-medium">{q}</summary>
      <p className="mt-2 text-sm text-zinc-400">{a}</p>
    </details>
  );
}
