import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Docs · SybilShield" };

const API = "https://api.sybilshield.org";

export default function DocsPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-16 space-y-12">
        <header>
          <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">// api docs</p>
          <h1 className="mt-2 text-4xl font-bold">Docs</h1>
          <p className="mt-3 text-zinc-400">
            Every example below hits the live sandbox at{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">{API}</code>.
            Replace <code className="rounded bg-zinc-900 px-1 font-mono text-xs">$KEY</code> with
            your sandbox key from <Link href="/dashboard/api-keys" className="text-emerald-400 hover:underline">/dashboard/api-keys</Link>.
          </p>
        </header>

        <Section title="1 · Getting started">
          <p>
            Sign up at <Link className="text-emerald-400 hover:underline" href="/dashboard">/dashboard</Link>{" "}
            with an email — no card required. You get an API key with a Free Sandbox quota
            of 100 calls/month. Store the key somewhere safe; it cannot be retrieved later
            (only rotated).
          </p>
        </Section>

        <Section title="2 · Authentication">
          <p>All authenticated endpoints take a bearer token.</p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  ${API}/v1/account`}</Code>
          <Code lang="json">{`{
  "id": "...",
  "email": "you@example.com",
  "plan": "free",
  "api_key_prefix": "sk_live_xxxx...",
  "usage": { "calls_this_month": 3, "limit": 100 }
}`}</Code>
        </Section>

        <Section title="3 · Create an analysis">
          <p>
            Submit a list of addresses on one or more chains. Returns immediately with
            an <code className="rounded bg-zinc-900 px-1 font-mono text-xs">id</code> and
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">status: pending</code>.
            The worker picks the job up, ingests on-chain data via Alchemy, runs the
            detection pipeline, and writes scores.
          </p>
          <Code lang="bash">{`curl -X POST ${API}/v1/analyses \\
  -H "Authorization: Bearer $KEY" \\
  -H 'content-type: application/json' \\
  -d '{
    "name": "my first analysis",
    "chains": ["ethereum"],
    "addresses": [
      "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      "0xab5801a7d398351b8be11c439e05c5b3259aec9b"
    ]
  }'`}</Code>
          <Code lang="json">{`{
  "id": "325554d5-559a-40dc-bd34-b3d180d5eb08",
  "status": "pending",
  "address_count": 2,
  "estimated_time_minutes": 2
}`}</Code>
        </Section>

        <Section title="4 · Check analysis status">
          <p>Poll the resource until <code className="rounded bg-zinc-900 px-1 font-mono text-xs">status === "complete"</code>.</p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  ${API}/v1/analyses/$ID`}</Code>
          <Code lang="json">{`{
  "id": "325554d5-...",
  "status": "complete",
  "name": "my first analysis",
  "chains": ["ethereum"],
  "address_count": 2,
  "summary": {
    "total_scored": 2,
    "sybil_count": 0,
    "suspicious_count": 0,
    "genuine_count": 2,
    "cluster_count": 0
  },
  "processing_time_seconds": 5,
  "completed_at": "2026-05-25T..."
}`}</Code>
          <p className="text-zinc-500 text-sm">
            Or configure a webhook — see §7 — and skip polling entirely.
          </p>
        </Section>

        <Section title="5 · Read results">
          <p>
            Per-address scores with structured evidence. Paginated; default 100 per page.
            Optional filter: <code className="rounded bg-zinc-900 px-1 font-mono text-xs">?label=sybil</code> /{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">suspicious</code> /{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">genuine</code>.
          </p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  "${API}/v1/analyses/$ID/results?limit=10"`}</Code>
          <Code lang="json">{`{
  "data": [
    {
      "address": "0xd8da6bf26964af9d7eed9e03e53415d37aa96045",
      "chain": "ethereum",
      "sybil_score": 0,
      "label": "genuine",
      "confidence": "0.000",
      "cluster_id": null,
      "cluster_size": null,
      "evidence": []
    }
  ],
  "page": 0,
  "limit": 10
}`}</Code>
          <p className="text-zinc-500 text-sm">
            <strong>Score 0–100.</strong> Default thresholds: ≥70 = sybil, 40–69 =
            suspicious, &lt;40 = genuine. Configurable per analysis on Pilot/Growth plans.
            <strong> Evidence</strong> is a JSON array describing which methods fired
            and which features pushed the score — populated only for flagged scores.
          </p>
        </Section>

        <Section title="6 · Export CSV">
          <p>One row per address, same scoring columns. Auth required (Bearer header).</p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  "${API}/v1/analyses/$ID/results/export" \\
  -o analysis-$ID.csv`}</Code>
          <Code lang="csv">{`address,chain,sybil_score,label,confidence,cluster_id,cluster_size
0xd8da6bf26964af9d7eed9e03e53415d37aa96045,ethereum,0,genuine,0.000,,
0xab5801a7d398351b8be11c439e05c5b3259aec9b,ethereum,0,genuine,0.000,,`}</Code>
        </Section>

        <Section title="7 · Webhook behavior">
          <p>
            Configure a webhook URL + secret on{" "}
            <Link href="/dashboard/api-keys" className="text-emerald-400 hover:underline">/dashboard/api-keys</Link>.
            When an analysis completes, we POST a JSON event with a SHA-256 HMAC signature
            in <code className="rounded bg-zinc-900 px-1 font-mono text-xs">X-SybilShield-Signature</code>.
          </p>
          <Code lang="json">{`POST https://your-server.com/webhook
Content-Type: application/json
X-SybilShield-Signature: sha256=...

{
  "type": "analysis.completed",
  "analysisId": "325554d5-...",
  "data": {
    "total_scored": 2,
    "sybil_count": 0,
    "suspicious_count": 0,
    "genuine_count": 2,
    "cluster_count": 0
  }
}`}</Code>
          <p className="text-zinc-500 text-sm">
            Verify with HMAC-SHA256 over the raw body, using your webhook_secret as the
            key. If signatures don&apos;t match, reject the event.
          </p>
        </Section>

        <Section title="8 · Audit log">
          <p>
            Every flagged score and every appeal verdict writes an append-only row to the
            audit log. Read your slice with:
          </p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  "${API}/v1/audit-log?analysis_id=$ID&limit=100"`}</Code>
        </Section>

        <Section title="9 · Rate limits & quotas">
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-2">Tier</th>
                  <th>Per minute</th>
                  <th>Per month</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                <tr><td className="py-2">Free Sandbox</td><td>30</td><td>100</td></tr>
                <tr><td className="py-2">Pilot</td><td>100</td><td>per engagement</td></tr>
                <tr><td className="py-2">Growth API <span className="text-zinc-500">(coming soon)</span></td><td>300</td><td>250,000</td></tr>
                <tr><td className="py-2">Enterprise <span className="text-zinc-500">(coming soon)</span></td><td>1,000</td><td>unlimited</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            Exceeding the monthly quota returns <code className="rounded bg-zinc-900 px-1 font-mono text-xs">429 monthly_quota_exceeded</code> with{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">upgrade_url</code> in the body.
            Exceeding RPM returns <code className="rounded bg-zinc-900 px-1 font-mono text-xs">429 rate_limit_exceeded</code> with{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">retry_after_seconds</code>.
          </p>
        </Section>

        <Section title="10 · Current sandbox limitations">
          <p className="text-zinc-300">
            The public sandbox is intended for testing the API flow, dashboard, evidence
            format, and scoring workflow. Real on-chain ingestion runs through Alchemy on
            5 chains (Ethereum, Arbitrum, Optimism, Base, Polygon). Production model
            calibration on a real labeled corpus is handled separately from the sandbox
            environment.
          </p>
          <ul className="mt-4 list-disc space-y-1 pl-6 text-sm text-zinc-400">
            <li>Scores in the sandbox may shift as the model is recalibrated.</li>
            <li>Cluster IDs are stable within an analysis, not across analyses.</li>
            <li>Evidence arrays are empty when sybil_score &lt; 40.</li>
            <li>Webhook retries are manual today (auto-retry with backoff is on the roadmap).</li>
          </ul>
        </Section>

        <p className="text-center text-sm text-zinc-500">
          Bug or unclear doc?{" "}
          <a href="mailto:support@sybilshield.org" className="text-emerald-400 hover:underline">
            support@sybilshield.org
          </a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-xl font-semibold">{title}</h2>
      <div className="mt-4 space-y-4 text-zinc-300 text-sm leading-relaxed">{children}</div>
    </section>
  );
}

function Code({ children, lang }: { children: string; lang: string }) {
  return (
    <pre className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
      <code data-lang={lang}>{children}</code>
    </pre>
  );
}
