import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = {
  title: "Terms of service · SybilShield",
  description: "Terms governing use of the SybilShield public sandbox.",
};

export default function TermsPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold">Terms of service</h1>
        <p className="mt-2 text-xs uppercase tracking-widest text-zinc-500">
          Last updated 2026-05-25 · sandbox version
        </p>

        <section className="mt-10 space-y-4 text-sm text-zinc-300">
          <p>
            By creating an account and using the SybilShield sandbox, you agree to these terms.
            Paid pilots and production customers will sign a separate, legally-reviewed
            agreement.
          </p>
        </section>

        <h2 className="mt-12 text-xl font-semibold">1. Sandbox status</h2>
        <p className="mt-3 text-sm text-zinc-300">
          The service at <span className="font-mono text-emerald-400">sybilshield.org</span> is a
          public sandbox. Scores are produced by a baseline model not yet calibrated on a full
          production corpus. <strong className="text-amber-300">Do not</strong> use sandbox output
          as a final filter for token distributions without manual review.
        </p>

        <h2 className="mt-10 text-xl font-semibold">2. Acceptable use</h2>
        <ul className="mt-3 space-y-2 text-sm text-zinc-300">
          <li>· Submit only public on-chain addresses</li>
          <li>· Don&apos;t use the service to dox individuals or violate any privacy law</li>
          <li>
            · Don&apos;t exceed the rate limit on your tier (100 calls/month on free sandbox).
            Repeated overshoot may result in API key suspension
          </li>
          <li>· Don&apos;t share your API key or use it for &gt;1 production system</li>
        </ul>

        <h2 className="mt-10 text-xl font-semibold">3. No warranty</h2>
        <p className="mt-3 text-sm text-zinc-300">
          The sandbox is provided <strong>&quot;as is&quot;</strong> without warranty of any
          kind, express or implied. Scores carry inherent false-positive/false-negative rates
          documented on{" "}
          <a href="/methodology" className="text-emerald-400 hover:underline">/methodology</a>.
        </p>

        <h2 className="mt-10 text-xl font-semibold">4. Liability</h2>
        <p className="mt-3 text-sm text-zinc-300">
          To the maximum extent permitted by law, SybilShield is not liable for any direct,
          indirect, incidental, or consequential damages arising from use of the sandbox,
          including but not limited to revenue loss, governance outcomes, or distribution
          decisions made based on scores returned by the service.
        </p>

        <h2 className="mt-10 text-xl font-semibold">5. Appeals + audit-log</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Any address holder can file an appeal at{" "}
          <a href="/appeal" className="text-emerald-400 hover:underline">/appeal</a>. We commit to
          respond within 48 hours. Audit-log records of score changes are append-only and
          reproducible from public methodology.
        </p>

        <h2 className="mt-10 text-xl font-semibold">6. Open source</h2>
        <p className="mt-3 text-sm text-zinc-300">
          All six detection methods, the audit-log schema, and the appeal protocol are{" "}
          <a
            href="https://github.com/Dev-In-Crypt/Sybil-Shield-"
            className="text-emerald-400 hover:underline"
          >
            MIT-licensed on GitHub
          </a>
          . You may fork, self-host, or vendor.
        </p>

        <h2 className="mt-10 text-xl font-semibold">7. Termination</h2>
        <p className="mt-3 text-sm text-zinc-300">
          You may delete your account at any time by emailing{" "}
          <a href="mailto:support@sybilshield.org" className="text-emerald-400 hover:underline">
            support@sybilshield.org
          </a>
          . We may suspend accounts that violate §2, with notice unless suspension is required to
          stop active abuse.
        </p>

        <h2 className="mt-10 text-xl font-semibold">8. Changes</h2>
        <p className="mt-3 text-sm text-zinc-300">
          We&apos;ll publish material changes to these terms on this page and in{" "}
          <a href="/changelog" className="text-emerald-400 hover:underline">/changelog</a>{" "}
          at least 14 days before they take effect.
        </p>

        <h2 className="mt-10 text-xl font-semibold">9. Governing law</h2>
        <p className="mt-3 text-sm text-zinc-300">
          Pre-incorporation: no specific jurisdiction is asserted. Post-incorporation, this will
          be updated to reflect the entity&apos;s registration jurisdiction.
        </p>

        <p className="mt-12 text-xs italic text-zinc-500">
          Contact:{" "}
          <a href="mailto:support@sybilshield.org" className="text-emerald-400 hover:underline">
            support@sybilshield.org
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
