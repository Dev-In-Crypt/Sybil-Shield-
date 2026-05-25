import Link from "next/link";
import { CryptoPayButton } from "../../components/CryptoPayButton";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";
import { StatusBadge } from "../../components/StatusBadge";

export const metadata = { title: "Pricing · SybilShield" };

const MAIL = "support@sybilshield.org";

function mailto(subject: string, body?: string): string {
  const params = [`subject=${encodeURIComponent(subject)}`];
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${MAIL}?${params.join("&")}`;
}

export default function PricingPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center">
          <h1 className="text-4xl font-bold">Simple pricing, public methodology</h1>
          <p className="mt-3 max-w-2xl text-zinc-400 mx-auto">
            Free sandbox is live today. Paid pilots are handled manually until production
            billing is enabled.
          </p>
        </div>

        <section className="mt-16">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Plan
              name="Free Sandbox"
              price="$0"
              suffix=""
              status="available"
              features={[
                "100 API calls / month",
                "Sandbox API access",
                "Evidence report format",
                "Public appeal flow testing",
                "Read evidence reports",
              ]}
              footer="Best for testing the product flow"
              cta={{ href: "/dashboard", label: "Start free", style: "primary" }}
              tagline="// no card · cancel anytime"
            />

            <Plan
              name="Pilot Analysis"
              price="From $2,500"
              suffix="/ analysis"
              status="available"
              highlight
              features={[
                "Manual onboarding",
                "Real data ingestion where available",
                "Evidence-backed report",
                "Appeal flow support",
                "Direct Slack with our team",
              ]}
              footer="Best for airdrop teams or grant committees"
              cta={{
                href: mailto(
                  "Pilot inquiry — [your project]",
                  `Hi — interested in a pilot analysis.\n\nProject:\nAddresses to score (approx.):\nTimeline:\nPreferred payment (crypto / wire):\n\nThanks`,
                ),
                label: "Request pilot →",
                style: "primary",
              }}
              tagline="// USDT · USDC · ETH · BTC via Atlos · or wire"
              payable={{ plan: "growth", priceUsd: 2500 }}
            />

            <Plan
              name="Growth API"
              price="—"
              suffix=""
              status="coming-soon"
              features={[
                "Ongoing scoring",
                "Webhook notifications",
                "Higher rate limits",
                "Production support",
                "SLA target 99.5%",
              ]}
              footer="When production billing is enabled"
              cta={{
                href: mailto("Growth API waitlist", `Add me to the Growth API waitlist.\n\nProject:\nExpected monthly volume:\n\nThanks`),
                label: "Join waitlist",
                style: "ghost",
              }}
              tagline="// post-incorporation"
            />

            <Plan
              name="Enterprise"
              price="—"
              suffix=""
              status="coming-soon"
              features={[
                "Custom model support",
                "Dedicated infrastructure",
                "SLA + support contract",
                "Custom DPA",
                "On-call engineering",
              ]}
              footer="For large institutional buyers"
              cta={{
                href: mailto(
                  "Enterprise inquiry",
                  `Hi — interested in Enterprise SybilShield.\n\nCompany:\nUse case:\nExpected volume:\nProcurement timeline:\n\nThanks`,
                ),
                label: "Contact us",
                style: "ghost",
              }}
              tagline="// custom contract"
            />
          </div>
        </section>

        {/* Public-good commitment */}
        <section className="mt-20 rounded-lg border border-emerald-900/40 bg-emerald-900/10 p-8">
          <h2 className="text-2xl font-semibold text-emerald-200">Free public-good tier</h2>
          <p className="mt-3 max-w-2xl text-zinc-300">
            Any project can call{" "}
            <code className="font-mono text-emerald-300">GET /v1/score/:address</code> for free at low
            volume — no registration required for read-only lookups on cached scores.
          </p>
          <p className="mt-3 max-w-2xl text-zinc-400">
            All six detection methods, the audit-log schema, and the appeal protocol spec are
            MIT-licensed. You can fork, self-host, or just borrow the methodology.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/lookup" className="rounded bg-emerald-700/50 px-4 py-2 text-sm hover:bg-emerald-700/70">
              Try public lookup
            </Link>
            <a
              href="https://github.com/Dev-In-Crypt/Sybil-Shield-"
              className="rounded border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-500"
            >
              GitHub →
            </a>
          </div>
        </section>

        {/* Pricing-rationale FAQ */}
        <section className="mt-20">
          <h2 className="text-2xl font-semibold">Pricing rationale</h2>
          <div className="mt-6 space-y-6 text-sm text-zinc-300">
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Why is paid not self-serve yet?
              </h3>
              <p className="mt-2 text-zinc-400">
                Production billing requires legal incorporation and customer-data handling we
                don&apos;t have in the public sandbox. Pilots run manually so we can match the
                methodology to your distribution and you can verify scores before signing
                anything ongoing.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                What does a pilot include?
              </h3>
              <p className="mt-2 text-zinc-400">
                A one-time scoring pass on your address list, the full evidence payload per
                address, a methodology brief you can publish with your filter, and 30 days of
                appeal-flow coverage.
              </p>
            </div>
            <div>
              <h3 className="font-mono text-xs uppercase tracking-widest text-emerald-400">
                Can I pay in crypto?
              </h3>
              <p className="mt-2 text-zinc-400">
                Pilots accept USDT / USDC / ETH / BTC via Atlos (non-custodial, 0% processor
                fee). Wire transfer and card are available on request for Enterprise.
              </p>
            </div>
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
  footer,
  tagline,
  payable,
}: {
  name: string;
  price: string;
  suffix: string;
  features: string[];
  status: "available" | "coming-soon" | "beta";
  highlight?: boolean;
  cta: { href: string; label: string; style: "primary" | "ghost" };
  footer?: string;
  tagline?: string;
  payable?: { plan: "developer" | "growth" | "enterprise"; priceUsd: number };
}) {
  const ctaClass =
    cta.style === "primary"
      ? "block rounded bg-emerald-600 px-4 py-2 text-center text-sm font-medium text-white hover:bg-emerald-500"
      : "block rounded border border-emerald-700/60 bg-emerald-900/10 px-4 py-2 text-center text-sm font-medium text-emerald-300 hover:bg-emerald-900/30";
  return (
    <div
      className={`flex flex-col rounded-lg border p-6 ${
        highlight ? "border-emerald-700/50 bg-emerald-950/20" : "border-zinc-800 bg-zinc-900"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
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
      {footer && (
        <p className="mt-4 text-xs italic text-zinc-500">{footer}</p>
      )}
      <div className="mt-6 space-y-2">
        {cta.href.startsWith("mailto:") ? (
          <a href={cta.href} className={ctaClass}>
            {cta.label}
          </a>
        ) : (
          <Link href={cta.href} className={ctaClass}>
            {cta.label}
          </Link>
        )}
        {payable && (
          <details className="rounded border border-zinc-800 bg-zinc-950">
            <summary className="cursor-pointer px-3 py-2 text-xs text-zinc-400 hover:text-emerald-400">
              or pay now in crypto →
            </summary>
            <div className="border-t border-zinc-800 p-3">
              <CryptoPayButton plan={payable.plan} priceUsd={payable.priceUsd} />
            </div>
          </details>
        )}
        {tagline && (
          <p className="text-center text-[10px] uppercase tracking-widest text-zinc-600">{tagline}</p>
        )}
      </div>
    </div>
  );
}
