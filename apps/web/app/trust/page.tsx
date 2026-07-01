import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Trust Center · SybilShield" };

const COMPLIANCE = [
  { fw: "GDPR", scope: "EU users / EU PII", status: "Compliant", color: "text-emerald-400", art: ["/privacy", "Privacy notice"] },
  { fw: "CCPA", scope: "California users", status: "Compliant", color: "text-emerald-400", art: ["/privacy", "Privacy notice §8"] },
  { fw: "SOC 2 Type I", scope: "Service org controls", status: "Not started", color: "text-zinc-500", art: [null, "Planned after incorporation"] },
  { fw: "SOC 2 Type II", scope: "Operating effectiveness", status: "Planned", color: "text-zinc-500", art: [null, "After SOC 2 Type I"] },
  { fw: "ISO 27001", scope: "InfoSec mgmt", status: "Backlog", color: "text-zinc-500", art: [null, "2027+"] },
  { fw: "PCI-DSS", scope: "Card data", status: "Out of scope", color: "text-emerald-400", art: [null, "No payments — free public good"] },
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
            Honest current state. We&apos;d rather under-promise here than over-claim
            compliance posture we haven&apos;t actually shipped yet.
          </p>
        </header>

        <section>
          <h2 className="text-2xl font-semibold">Current security state</h2>
          <ul className="mt-6 space-y-3 text-sm text-zinc-300">
            <li className="flex gap-3">
              <span className="text-emerald-400">▸</span>
              <span>Open-source sandbox deployment at sybilshield.org. All detection code is MIT-licensed and auditable in the public repo.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">▸</span>
              <span>No production customer data is processed in the public sandbox. SybilShield is a free public good — there is no paid engagement or billing.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">▸</span>
              <span>Backend on a single VPS (Hetzner CX22) with daily local <code className="font-mono text-emerald-300">pg_dump</code> backup. Off-site backup planned.</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">▸</span>
              <span>TLS 1.3 via Let&apos;s Encrypt; secrets in <code className="font-mono text-emerald-300">.env</code>, never committed; UFW + fail2ban on the host; root SSH disabled; password auth disabled (keys only).</span>
            </li>
            <li className="flex gap-3">
              <span className="text-emerald-400">▸</span>
              <span>Per-customer rate-limits + monthly call-quota enforcement live. Bearer-token auth with HMAC-signed webhook delivery.</span>
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Security posture</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="font-mono text-sm text-emerald-400">SOC 2</h3>
              <p className="mt-2 text-sm text-zinc-500">Not started</p>
              <p className="mt-2 text-sm text-zinc-400">Planned after incorporation and first production customer data handling.</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="font-mono text-sm text-emerald-400">Pentest</h3>
              <p className="mt-2 text-sm text-amber-400">Not scheduled yet</p>
              <p className="mt-2 text-sm text-zinc-400">Planned before production launch. No vendor selected.</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="font-mono text-sm text-emerald-400">Encryption</h3>
              <p className="mt-2 text-sm text-emerald-400">Active</p>
              <p className="mt-2 text-sm text-zinc-400">TLS 1.3 in transit, AES-256 at rest (Postgres + filesystem). Secrets in env, not source.</p>
            </div>
            <div className="rounded border border-zinc-800 bg-zinc-900 p-4">
              <h3 className="font-mono text-sm text-emerald-400">SDLC</h3>
              <p className="mt-2 text-sm text-emerald-400">Active</p>
              <p className="mt-2 text-sm text-zinc-400">Public repo + signed commits + CI test gates. Secret scanning via GitGuardian on push.</p>
            </div>
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
            Every flagged score, every appeal, every reversal is written append-only to
            <code className="mx-1 rounded bg-zinc-900 px-1 font-mono text-xs">evidence_audit_log</code>.
            Customers can export their slice via{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">GET /v1/audit-log?analysis_id={`{id}`}</code>.
          </p>
          <pre className="mt-4 overflow-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">{`{
  "event_id": "evt_01HX...",
  "event_type": "flagged",
  "address": "0xa12b...c4d7",
  "actor": "system:v0.5.0-gov-expanded",
  "prior_score": null,
  "new_score": 87,
  "reason": "sybil",
  "timestamp": "2026-05-25T08:14:22.118Z"
}`}</pre>
        </section>

        <section>
          <h2 className="text-2xl font-semibold">Quick links</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["/security", "Security policy"],
              ["/privacy", "Privacy notice"],
              ["/sub-processors", "Sub-processors"],
              ["mailto:security@sybilshield.org", "Report a vulnerability"],
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
