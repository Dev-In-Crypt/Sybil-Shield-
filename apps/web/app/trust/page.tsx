import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Trust Center · SybilShield" };

const COMPLIANCE = [
  { fw: "GDPR", scope: "EU users / EU PII", status: "Compliant", color: "text-emerald-400", art: ["/privacy", "Privacy notice"] },
  { fw: "CCPA", scope: "California users", status: "Compliant", color: "text-emerald-400", art: ["/privacy", "Privacy notice §8"] },
  { fw: "SOC 2 Type I", scope: "Service org controls", status: "Audit underway", color: "text-amber-400", art: [null, "Q3 2026"] },
  { fw: "SOC 2 Type II", scope: "Operating effectiveness", status: "Planned", color: "text-zinc-500", art: [null, "Q1 2027"] },
  { fw: "ISO 27001", scope: "InfoSec mgmt", status: "Backlog", color: "text-zinc-500", art: [null, "2027"] },
  { fw: "PCI-DSS", scope: "Card data", status: "Out of scope", color: "text-emerald-400", art: [null, "Stripe-hosted"] },
] as const;

export default function TrustPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-6 py-16 space-y-16">
        <header>
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400">// trust center</p>
          <h1 className="mt-2 text-5xl font-bold">Trust</h1>
          <p className="mt-3 max-w-2xl text-zinc-400">
            Security posture, compliance status, audit log, and links to every legal artifact we publish.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-semibold">Security posture</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["SOC 2", "amber", "In progress · Q3 2026", "Type I audit started May 2026. Type II Q1 2027."],
              ["Pentest", "amber", "Scheduled", "First external pentest Aug 2026 (Trail of Bits). Public-redacted report."],
              ["Encryption", "emerald", "Active", "TLS 1.3 in transit, AES-256 at rest. KMS-backed secrets."],
              ["SDLC", "emerald", "Active", "Required review, signed commits, branch protection, secret + dep scanning."],
            ].map(([title, c, status, body]) => (
              <div key={title} className="rounded border border-zinc-800 bg-zinc-900 p-4">
                <h3 className="font-mono text-sm text-emerald-400">{(title as string).toUpperCase()}</h3>
                <p className={`mt-2 text-sm ${c === "emerald" ? "text-emerald-400" : "text-amber-400"}`}>{status}</p>
                <p className="mt-2 text-sm text-zinc-400">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Compliance matrix</h2>
          <div className="mt-6 overflow-x-auto rounded border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-2 text-left">framework</th>
                  <th className="px-4 py-2 text-left">scope</th>
                  <th className="px-4 py-2 text-left">status</th>
                  <th className="px-4 py-2 text-left">artifact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {COMPLIANCE.map((c) => (
                  <tr key={c.fw} className="bg-zinc-950">
                    <td className="px-4 py-2 font-mono text-emerald-400">{c.fw}</td>
                    <td className="px-4 py-2 text-zinc-300">{c.scope}</td>
                    <td className={`px-4 py-2 ${c.color}`}>{c.status}</td>
                    <td className="px-4 py-2">
                      {c.art[0] ? (
                        <Link href={c.art[0]} className="text-emerald-400 hover:underline">
                          {c.art[1]}
                        </Link>
                      ) : (
                        <span className="text-zinc-500">{c.art[1]}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Audit log</h2>
          <p className="mt-3 text-zinc-400">
            Every score change, appeal, review, and reversal is recorded in our immutable audit log. Customers can export their slice via{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">GET /v1/audit-log</code>.
          </p>
          <pre className="mt-4 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">{`{
  "event_id": "evt_01HX...",
  "event_type": "flagged",
  "address": "0xa12b...c4d7",
  "actor": "system:model:rule_based",
  "prior_score": null,
  "new_score": 87,
  "reason": "sybil",
  "timestamp": "2026-05-21T08:14:22.118Z"
}`}</pre>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Quick links</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["/security", "Security policy"],
              ["/privacy", "Privacy notice"],
              ["/sub-processors", "Sub-processors"],
              ["mailto:security@sybilshield.com", "Report a vulnerability"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded border border-zinc-800 bg-zinc-900 p-4 hover:border-emerald-500">
                <h3 className="font-mono text-sm text-emerald-400">{label} →</h3>
              </a>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
