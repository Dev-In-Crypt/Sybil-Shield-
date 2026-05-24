import { SandboxBanner } from "../../components/SandboxBanner";
import { SiteFooter } from "../../components/SiteFooter";
import { SiteHeader } from "../../components/SiteHeader";

export const metadata = { title: "Documentation · SybilShield" };

export default function DocsPage() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-4xl font-bold">Documentation</h1>
        <p className="mt-3 text-zinc-400">
          What the SybilShield API does, how analyses flow, and how to integrate. The full
          OpenAPI spec and ready-to-import Postman collection ship with the next release.
        </p>

        <Section title="How it works">
          <p className="text-zinc-300">
            Submit an address list. We ingest on-chain history for every wallet, run six
            independent detection methods, produce a per-address risk score with evidence, and
            return both a queryable result set and a downloadable CSV. The whole pipeline takes
            hours, not weeks.
          </p>
          <ol className="mt-6 space-y-3 text-zinc-300">
            <Step n={1} title="Register">
              Create a free account. Receive an API key (shown once — store it securely). Free tier covers 100 calls/month.
            </Step>
            <Step n={2} title="Create an analysis">
              Submit a list of wallet addresses (up to 1M per request) along with chains and sensitivity preference. The platform queues the job and returns an analysis ID.
            </Step>
            <Step n={3} title="Track progress">
              Poll the analysis endpoint or subscribe to a webhook. Status transitions through <em>ingesting → analyzing → scoring → complete</em>.
            </Step>
            <Step n={4} title="Read results">
              Fetch scored addresses (filterable by label), detected clusters, and per-address evidence reports. Export as CSV.
            </Step>
            <Step n={5} title="Handle appeals">
              Flagged users can submit appeals directly via the public endpoint. Every submission is logged immutably and routed to a reviewer.
            </Step>
          </ol>
        </Section>

        <Section title="What you get back">
          <div className="grid gap-4 md:grid-cols-2">
            <Feature title="Sybil score" desc="0–100 confidence that the address is part of a Sybil farm. Three bucket labels: genuine, suspicious, sybil." />
            <Feature title="Cluster ID" desc="Which other wallets in the analysis it groups with, plus the cluster's size and detection method." />
            <Feature title="Evidence list" desc="Per-address human-readable evidence items pointing at the specific features or cluster memberships that produced the score." />
            <Feature title="Confidence interval" desc="Calibrated probability output from the ML ensemble alongside per-evidence-item confidence." />
            <Feature title="CSV export" desc="Full results table for compliance archiving or distribution-list filtering." />
            <Feature title="Webhook notification" desc="Signed POST to your URL on analysis completion with summary statistics." />
          </div>
        </Section>

        <Section title="Endpoints overview">
          <div className="space-y-3">
            <Endpoint group="Account" items={[
              { name: "Register a new account", desc: "Returns an API key shown once" },
              { name: "Rotate API key", desc: "Invalidates the old key immediately" },
              { name: "View account & usage", desc: "Plan, monthly call count, webhook configuration" },
              { name: "Configure webhook", desc: "Set URL and receive a signing secret" },
            ]} />
            <Endpoint group="Analyses" items={[
              { name: "Create analysis", desc: "Submit address list, chains, sensitivity" },
              { name: "List analyses", desc: "Paginated history of your analyses" },
              { name: "Get analysis status", desc: "Includes summary counts when complete" },
              { name: "Get scored results", desc: "Paginated, filter by label (sybil/suspicious/genuine)" },
              { name: "Export CSV", desc: "Stream the full results table" },
              { name: "Get detected clusters", desc: "Cluster metadata with detection method" },
            ]} />
            <Endpoint group="Scoring" items={[
              { name: "Single-address score", desc: "Cached lookup for any address previously seen" },
              { name: "Batch score (up to 100)", desc: "Bulk lookup endpoint" },
              { name: "Known entity check", desc: "Cross-analysis intelligence — is this address flagged anywhere?" },
            ]} />
            <Endpoint group="Trust & feedback" items={[
              { name: "Submit feedback", desc: "Customer-side false-positive / false-negative reporting" },
              { name: "Public appeal", desc: "Open, unauthenticated — anyone can dispute their score" },
              { name: "Appeals policy", desc: "Public-readable JSON describing review SLA" },
            ]} />
          </div>
        </Section>

        <Section title="Webhook signature verification">
          <p className="text-zinc-300">
            Every webhook payload is signed with HMAC-SHA256 using a secret you receive when you
            configure the webhook URL. The signature arrives in the
            <code className="mx-1 rounded bg-zinc-900 px-1.5 py-0.5 font-mono text-xs text-emerald-300">x-sybilshield-signature</code>
            header as <em>sha256=&lt;hex&gt;</em>. Recompute the HMAC over the raw request body and
            compare with constant-time equality. Reject mismatches.
          </p>
        </Section>

        <Section title="Rate limits & quotas">
          <table className="mt-4 w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
              <tr>
                <th className="py-2">Plan</th>
                <th>Calls / month</th>
                <th>Per-minute rate</th>
                <th>Concurrent analyses</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              <Row label="Free" cols={["100", "30 / min", "1"]} />
              <Row label="Developer" cols={["50,000", "100 / min", "3"]} />
              <Row label="Growth" cols={["250,000", "300 / min", "10"]} />
              <Row label="Enterprise" cols={["Unlimited", "1,000 / min", "Unlimited"]} />
            </tbody>
          </table>
          <p className="mt-3 text-xs text-zinc-500">
            Exceeding a limit returns HTTP 429 with a <em>retry-after</em> header. We never
            silently drop data.
          </p>
        </Section>

        <Section title="Coming next">
          <ul className="space-y-2 text-zinc-300">
            <li>· Interactive OpenAPI explorer (Stoplight / Redoc)</li>
            <li>· Ready-to-import Postman collection</li>
            <li>· Official SDKs: TypeScript and Python</li>
            <li>· Streaming results endpoint for &gt;500K-address jobs</li>
            <li>· GraphQL gateway for advanced filtering</li>
          </ul>
        </Section>

        <p className="mt-12 text-sm text-zinc-500">
          Questions? Email <a className="underline" href="mailto:hello@sybilshield.com">hello@sybilshield.com</a> or
          open an issue on GitHub.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Step({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-emerald-700/50 bg-emerald-900/20 text-sm font-semibold text-emerald-300">
        {n}
      </div>
      <div>
        <div className="font-medium">{title}</div>
        <p className="mt-1 text-sm text-zinc-400">{children}</p>
      </div>
    </li>
  );
}

function Feature({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{desc}</p>
    </div>
  );
}

function Endpoint({
  group,
  items,
}: {
  group: string;
  items: { name: string; desc: string }[];
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-5">
      <div className="text-xs uppercase tracking-wider text-emerald-400">{group}</div>
      <ul className="mt-3 space-y-2">
        {items.map((i) => (
          <li key={i.name} className="flex flex-wrap justify-between gap-3 text-sm">
            <span className="font-medium">{i.name}</span>
            <span className="text-zinc-500">{i.desc}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Row({ label, cols }: { label: string; cols: string[] }) {
  return (
    <tr>
      <td className="py-2 font-medium text-zinc-200">{label}</td>
      {cols.map((c, i) => (
        <td key={i} className="text-zinc-400">{c}</td>
      ))}
    </tr>
  );
}
