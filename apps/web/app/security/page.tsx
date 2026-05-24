import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Security · SybilShield" };

export default function SecurityPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <header>
          <h1 className="text-4xl font-bold">Security</h1>
          <p className="mt-3 text-zinc-400">
            How we secure data, secrets, and the appeal trail.
          </p>
        </header>

        <Section title="Data classification">
          <ul className="space-y-2 text-zinc-300">
            <li><strong className="text-zinc-100">Wallet addresses</strong> — public on-chain data. We process but never re-publish individual addresses outside aggregate stats.</li>
            <li><strong className="text-zinc-100">Customer email + API key hash</strong> — bcrypt/SHA256 hashed. Plaintext keys shown ONCE at creation.</li>
            <li><strong className="text-zinc-100">Evidence + cluster data</strong> — visible only to the customer who created the analysis. Aggregates may appear in public retros.</li>
            <li><strong className="text-zinc-100">Appeal submissions</strong> — visible to customer who owns the analysis + reviewer. Submitter contact email never published.</li>
            <li><strong className="text-zinc-100">Webhooks</strong> — payloads signed with HMAC-SHA256 against the customer's webhook_secret. Verify before processing.</li>
          </ul>
        </Section>

        <Section title="API key handling">
          <ul className="space-y-2 text-zinc-300">
            <li>· Format <code className="font-mono text-emerald-300">sk_live_&lt;32 base64url chars&gt;</code></li>
            <li>· SHA256 hashed in DB. Plaintext shown once at creation/rotation.</li>
            <li>· Constant-time comparison on every request (timingSafeEqual).</li>
            <li>· Rotate at <a className="underline" href="/dashboard/api-keys">/dashboard/api-keys</a> — old key revoked immediately.</li>
          </ul>
        </Section>

        <Section title="Webhook signature verification">
          <p className="text-zinc-300">
            On <code className="font-mono">analysis.completed</code> we POST to your URL with
            header <code className="font-mono">x-sybilshield-signature: sha256=&lt;hex&gt;</code>.
          </p>
          <pre className="mt-4 overflow-x-auto rounded bg-zinc-900 p-4 text-xs">{`# Node.js
import { createHmac } from 'crypto';

function verify(body, signature, secret) {
  const expected = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');
  return signature === expected;
}`}</pre>
        </Section>

        <Section title="Audit log">
          <p className="text-zinc-300">
            Every flagged event (score &gt;= 40), every appeal, every review, every reversal is
            written to <code className="font-mono">evidence_audit_log</code>. Rows are
            append-only; no admin can edit prior entries. The schema captures:
          </p>
          <ul className="mt-3 space-y-1 text-zinc-400">
            <li>· actor (<code>system:model:vX</code> / <code>customer:&lt;uuid&gt;</code> / <code>public:anonymous</code>)</li>
            <li>· timestamp, prior_score, new_score</li>
            <li>· evidence_snapshot (JSON, frozen at event time)</li>
            <li>· reason (free text)</li>
          </ul>
        </Section>

        <Section title="Reporting a vulnerability">
          <p className="text-zinc-300">
            Email <a className="underline" href="mailto:security@sybilshield.org">security@sybilshield.org</a> with a description and reproduction. We
            commit to:
          </p>
          <ul className="mt-3 space-y-1 text-zinc-400">
            <li>· Acknowledge within 48 hours</li>
            <li>· Patch critical issues within 7 days</li>
            <li>· Public-credit you in the disclosure if you wish</li>
            <li>· No legal action against good-faith research</li>
          </ul>
          <p className="mt-3 text-sm text-zinc-500">
            Bug bounty program will launch with the first hosted production deployment.
          </p>
        </Section>

        <Section title="Operational security (current state, honest)">
          <ul className="space-y-2 text-zinc-300">
            <li>· Code is open-source (MIT) — no secret algorithms to leak</li>
            <li>· Secrets live in <code className="font-mono">.env</code>, never committed (see <code>.gitignore</code>)</li>
            <li>· Pre-incorporation: no formal SOC 2 / ISO 27001. Will pursue after revenue.</li>
            <li>· Hosted production not yet deployed — sandbox mode runs on free-tier infra</li>
          </ul>
        </Section>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}
