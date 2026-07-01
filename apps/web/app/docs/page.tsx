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
            with an email — no card required. SybilShield is a free public good: you get an
            API key with a public-sandbox fair-use limit of 100 calls/month. Store the key
            somewhere safe; it cannot be retrieved later (only rotated).
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

        <Section title="3 · Presets & decisions">
          <p>
            Every analysis comes back with a per-address verdict —{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">DROP</code>,{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">REVIEW</code>, or{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">KEEP</code> — computed
            server-side from the preset you pick at submission time. Pass{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">preset</code> in the POST
            body; the verdict is then stored against the analysis row (and audit-log entries) so
            the decision is reproducible after the fact.
          </p>
          <div className="my-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead className="text-left text-xs uppercase tracking-widest text-zinc-500">
                <tr>
                  <th className="py-2 pr-4">Preset</th>
                  <th className="py-2 pr-4">DROP if</th>
                  <th className="py-2 pr-4">REVIEW if</th>
                  <th className="py-2 pr-4">Tuned for</th>
                </tr>
              </thead>
              <tbody className="font-mono text-xs text-zinc-300">
                <tr className="border-t border-zinc-800">
                  <td className="py-2 pr-4 text-emerald-300">balanced</td>
                  <td>score ≥ 80</td>
                  <td>score ≥ 50</td>
                  <td className="text-zinc-400">default — pick if unsure</td>
                </tr>
                <tr className="border-t border-zinc-800">
                  <td className="py-2 pr-4 text-emerald-300">airdrop</td>
                  <td>score ≥ 85 OR cluster_size ≥ 50</td>
                  <td>score ≥ 60 OR cluster_size ≥ 20</td>
                  <td className="text-zinc-400">aggressive — token distributions</td>
                </tr>
                <tr className="border-t border-zinc-800">
                  <td className="py-2 pr-4 text-emerald-300">dao</td>
                  <td>score ≥ 90 OR cluster_size ≥ 30</td>
                  <td>score ≥ 50 OR cluster_size ≥ 10</td>
                  <td className="text-zinc-400">conservative — governance voting</td>
                </tr>
                <tr className="border-t border-zinc-800">
                  <td className="py-2 pr-4 text-emerald-300">grant</td>
                  <td>cluster_size ≥ 20</td>
                  <td>cluster_size ≥ 5 OR score ≥ 70</td>
                  <td className="text-zinc-400">cluster-first — grant committees</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            <strong>Cluster-only mode.</strong> Pass{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">mode: "cluster_only"</code>{" "}
            to skip per-address ML scoring entirely and return only multi-wallet farm groupings.
            Useful when you care more about &quot;these 47 wallets are one entity&quot; than about
            per-address risk scoring.
          </p>
          <Code lang="bash">{`# Submit with a preset + mode
curl -X POST ${API}/v1/analyses \\
  -H "Authorization: Bearer $KEY" \\
  -H 'content-type: application/json' \\
  -d '{
    "name": "wave-2 airdrop scan",
    "chains": ["ethereum"],
    "preset": "airdrop",
    "mode": "full",
    "addresses": ["0xabc...", "0xdef..."]
  }'`}</Code>
          <p>
            <strong>Threshold overrides.</strong> Tune a preset for one analysis with{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">threshold_overrides</code>.
            Each knob is optional — a number tightens/loosens it, <code className="rounded bg-zinc-900 px-1 font-mono text-xs">null</code>{" "}
            disables it, omitting it keeps the preset value. Rows decided with an override carry a{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">custom_thresholds</code> rationale code, and the
            override is stored on the analysis so the decision is reproducible.
          </p>
          <Code lang="bash">{`# Airdrop preset, but I've already excluded my own CEX
# deposit wallets, so tighten the cluster knob from 50 -> 12
curl -X POST ${API}/v1/analyses \\
  -H "Authorization: Bearer $KEY" \\
  -H 'content-type: application/json' \\
  -d '{
    "name": "wave-2 (cex-excluded)",
    "chains": ["ethereum"],
    "preset": "airdrop",
    "threshold_overrides": {
      "drop":   { "cluster_size_gte": 12 },
      "review": { "cluster_size_gte": 5 }
    },
    "addresses": ["0xabc...", "0xdef..."]
  }'`}</Code>
          <p className="text-zinc-500 text-sm">
            Decision rules live in{" "}
            <code className="font-mono">apps/api/src/lib/presets.ts</code> (canonical) and{" "}
            <code className="font-mono">apps/ml/sybilshield/scoring/presets.py</code> (Python
            mirror) — open-source on GitHub.
          </p>
        </Section>

        <Section title="4 · Create an analysis">
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
    "preset": "balanced",
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

        <Section title="5 · Check analysis status">
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

        <Section title="6 · Read results">
          <p>
            Per-address scores with structured evidence + the preset-aware{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">decision</code>{" "}
            verdict. Paginated; default 100 per page. Filters:{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">?decision=DROP</code>{" "}
            (or REVIEW/KEEP), or legacy{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">?label=sybil</code>.
          </p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  "${API}/v1/analyses/$ID/results?decision=DROP&limit=10"`}</Code>
          <Code lang="json">{`{
  "data": [
    {
      "address": "0x9bfc0b6c1f1f6c9c30b6e8c4e8c1f2a1b3c4d5e6",
      "chain": "ethereum",
      "sybil_score": 100,
      "label": "sybil",
      "confidence": "1.000",
      "cluster_id": "F-a8b2c1d4",
      "cluster_size": 12,
      "decision": "DROP",
      "decision_confidence": "high",
      "rationale_codes": [
        "shared_funder_cluster",
        "score_ge_85",
        "cluster_size_ge_10"
      ],
      "evidence": [
        {
          "type": "shared_funding",
          "description": "Funded from same source as 11 other addresses within 6h.",
          "confidence": 0.95
        }
      ]
    }
  ],
  "page": 0,
  "limit": 10
}`}</Code>
          <p className="text-zinc-500 text-sm">
            <strong>Decision</strong> is the preset-aware verdict (preferred for filtering).{" "}
            <strong>Score 0–100</strong> remains available for callers who want to apply their
            own thresholds. <strong>Evidence</strong> is a JSON array describing which methods
            fired and which features pushed the score — populated only for flagged scores.
          </p>
        </Section>

        <Section title="7 · Export CSV">
          <p>One row per address, same scoring columns. Auth required (Bearer header).</p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  "${API}/v1/analyses/$ID/results/export" \\
  -o analysis-$ID.csv`}</Code>
          <Code lang="csv">{`address,chain,sybil_score,label,confidence,cluster_id,cluster_size
0xd8da6bf26964af9d7eed9e03e53415d37aa96045,ethereum,0,genuine,0.000,,
0xab5801a7d398351b8be11c439e05c5b3259aec9b,ethereum,0,genuine,0.000,,`}</Code>
        </Section>

        <Section title="8 · Webhook behavior">
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

        <Section title="9 · Audit log">
          <p>
            Every flagged score and every appeal verdict writes an append-only row to the
            audit log. Read your slice with:
          </p>
          <Code lang="bash">{`curl -H "Authorization: Bearer $KEY" \\
  "${API}/v1/audit-log?analysis_id=$ID&limit=100"`}</Code>
        </Section>

        <Section title="10 · Fair-use limits">
          <p className="text-sm text-zinc-400">
            SybilShield is a free public good. These fair-use limits keep the shared sandbox
            healthy — they are not a paywall. Running heavier research?{" "}
            <a className="text-emerald-400 hover:underline" href="mailto:support@sybilshield.org">
              Email us
            </a>{" "}
            for more headroom.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
                <tr>
                  <th className="py-2">Limit</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 font-mono text-xs">
                <tr><td className="py-2">Requests / minute</td><td>30</td></tr>
                <tr><td className="py-2">Write calls / month</td><td>100</td></tr>
                <tr><td className="py-2">Addresses / analysis</td><td>1,000</td></tr>
                <tr><td className="py-2">Concurrent analyses</td><td>1</td></tr>
                <tr><td className="py-2">Upload size</td><td>1 MB</td></tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-zinc-500">
            <strong>What counts toward the monthly limit.</strong> Write calls —{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">POST /v1/analyses</code>,{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">POST /v1/score/batch</code>,{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">POST /v1/feedback</code>, and other write
            endpoints. <strong>What does NOT count:</strong> all GET reads (
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">/v1/analyses/:id</code>,{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">/v1/analyses/:id/results</code>,{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">/v1/account</code>, etc.) — dashboard polling
            and result viewing are free.
          </p>
          <p className="mt-3 text-sm text-zinc-500">
            <strong>Error codes.</strong>{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">429 monthly_quota_exceeded</code> (fair-use
            monthly limit, resets monthly);{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">429 rate_limit_exceeded</code> with{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">retry_after_seconds</code>;{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">429 concurrent_limit_exceeded</code>;{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">400 too_many_addresses</code>;{" "}
            <code className="rounded bg-zinc-900 px-1 font-mono text-xs">400 estimated_cu_exceeds_budget</code>.
          </p>
        </Section>

        <Section title="11 · Current sandbox limitations">
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
