import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = {
  title: "Privacy notice · SybilShield",
  description: "How SybilShield collects, processes, and stores data in the public sandbox.",
};

export default function PrivacyPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Privacy notice</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">
          Last updated 2026-07-22 · sandbox version
        </p>

        <section className="mt-10 space-y-4 text-sm text-zinc-300">
          <p>
            SybilShield is an open-source Sybil detection sandbox. This notice describes the
            limited personal data we process to run it. We&apos;re a small project pre-incorporation
            — when we incorporate and accept production customers, this notice will be replaced
            with a DPO-reviewed version.
          </p>
        </section>

        <h2 className="mt-12 text-xl font-semibold">1. Data we collect</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
          <li>
            · <span className="font-mono text-emerald-400">email</span> — when you register an
            account, only to deliver your API key and audit-log notifications. Never sold or
            shared with third parties.
          </li>
          <li>
            · <span className="font-mono text-emerald-400">api_key_prefix</span> — first 12
            characters of your API key, stored alongside the bcrypt hash to identify your account
            on requests.
          </li>
          <li>
            · <span className="font-mono text-emerald-400">request metadata</span> — endpoint,
            timestamp, status code, customer ID. Used for rate-limiting and usage counters. No
            request bodies are logged.
          </li>
          <li>
            · <span className="font-mono text-emerald-400">on-chain addresses you submit</span>{" "}
            — stored against your analysis ID for evidence reproducibility. Public information by
            nature.
          </li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">2. Data we do NOT collect</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
          <li>· Cookies (we use one functional cookie for session, no analytics/ads)</li>
          <li>· Browser fingerprints, IP geolocation logs, device IDs</li>
          <li>· Payment data of any kind — SybilShield is a free public good with no billing</li>
          <li>· Third-party tracking pixels, Google Analytics, Hotjar, FB pixel — none</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">3. Where data lives</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Postgres + Redis on a single Hetzner VPS in Germany (DE). Daily local{" "}
          <span className="font-mono text-emerald-400">pg_dump</span> backup retained 7 days.
          Off-site backup planned, not active yet. TLS via Let&apos;s Encrypt.
        </p>

        <h2 className="mt-10 text-xl font-semibold">4. Retention</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
          <li>· Analyses + scores: kept for the life of your account</li>
          <li>· Audit-log entries: kept indefinitely (append-only by design)</li>
          <li>· Account email: until you delete your account (see §6)</li>
          <li>· Request logs: 30 days</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">5. Sub-processors</h2>
        <p className="mt-3 text-sm text-zinc-300">
          See <a href="/sub-processors" className="text-emerald-400 hover:underline">/sub-processors</a>{" "}
          for the canonical list (Hetzner, Vercel, Alchemy).
        </p>

        <h2 className="mt-10 text-xl font-semibold">6. Your rights (GDPR / CCPA)</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Email{" "}
          <a href="mailto:support@sybilshield.org" className="text-emerald-400 hover:underline">
            support@sybilshield.org
          </a>{" "}
          for access, correction, deletion, or export of your data. We respond within 30 days.
          You can also use the public{" "}
          <a href="/appeal" className="text-emerald-400 hover:underline">/appeal</a> flow to
          dispute a score about an address you control.
        </p>

        <h2 className="mt-10 text-xl font-semibold">7. Contact</h2>
        <p className="mt-3 text-sm text-zinc-300">
          SybilShield (pre-incorporation, sole maintainer).
          <br />
          Email:{" "}
          <a href="mailto:support@sybilshield.org" className="text-emerald-400 hover:underline">
            support@sybilshield.org
          </a>
        </p>

        <p className="mt-12 text-xs italic text-zinc-500">
          ⚠ This notice reflects the public sandbox. Production-customer terms will be governed by
          a separate DPA on contract signing.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
