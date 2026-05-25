"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CopyableSecret } from "../../components/CopyableSecret";

interface Analysis {
  id: string;
  name: string;
  status: string;
  addressCount: number;
  totalScored?: number | null;
  sybilCount?: number | null;
  suspiciousCount?: number | null;
  genuineCount?: number | null;
  clusterCount?: number | null;
  createdAt: string;
}

interface Account {
  id: string;
  email: string;
  plan: string;
  api_key_prefix: string | null;
  webhook_configured: boolean;
  usage: { calls_this_month: number; limit: number };
}

export default function DashboardOverview() {
  const [apiKey, setApiKey] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem("sybilshield_api_key") ?? "");
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    const base = process.env.NEXT_PUBLIC_API_URL;
    const headers = { Authorization: `Bearer ${apiKey}` };
    (async () => {
      try {
        const [a, l] = await Promise.all([
          fetch(`${base}/v1/account`, { headers }).then((r) => r.json()),
          fetch(`${base}/v1/analyses`, { headers }).then((r) => r.json()),
        ]);
        if (a.error) throw new Error(a.error);
        setAccount(a);
        setAnalyses(l.data ?? []);
      } catch (e) {
        setError(String(e));
      }
    })();
  }, [apiKey]);

  if (!apiKey) {
    return <Onboard onSet={setApiKey} />;
  }

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold">Overview</h1>
        <Link
          href="/dashboard/analyses"
          className="text-sm text-emerald-400 hover:underline"
        >
          See all analyses →
        </Link>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {account && (
        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <Card title="Plan" value={account.plan} subtitle={account.api_key_prefix ?? "no key"} />
          <Card
            title="Usage this month"
            value={account.usage.calls_this_month.toLocaleString()}
            subtitle={`of ${account.usage.limit.toLocaleString()}`}
          />
          <Card
            title="Webhook"
            value={account.webhook_configured ? "Configured" : "Not set"}
            subtitle={
              <Link className="text-emerald-400 hover:underline" href="/dashboard/api-keys">
                Manage →
              </Link>
            }
          />
        </section>
      )}

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Recent analyses</h2>
        {analyses.length === 0 ? (
          <EmptyState apiKeyPrefix={account?.api_key_prefix ?? ""} />
        ) : (
          <ul className="mt-4 divide-y divide-zinc-900 rounded-lg border border-zinc-800">
            {analyses.slice(0, 5).map((a) => (
              <li key={a.id} className="bg-zinc-900 px-4 py-3">
                <div className="flex items-baseline justify-between gap-4">
                  <Link
                    href={`/dashboard/analyses/${a.id}`}
                    className="font-medium hover:text-emerald-300"
                  >
                    {a.name}
                  </Link>
                  <span className="text-xs text-zinc-500">{a.status}</span>
                </div>
                <p className="text-xs text-zinc-500">
                  {a.addressCount.toLocaleString()} addresses · created{" "}
                  {new Date(a.createdAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

function EmptyState({ apiKeyPrefix }: { apiKeyPrefix: string }) {
  const [copied, setCopied] = useState(false);
  const example = `# Replace $KEY with the value shown on /dashboard/api-keys
curl -X POST https://api.sybilshield.org/v1/analyses \\
  -H "Authorization: Bearer $KEY" \\
  -H 'content-type: application/json' \\
  -d '{
    "name": "first analysis",
    "chains": ["ethereum"],
    "addresses": [
      "0xd8da6bf26964af9d7eed9e03e53415d37aa96045"
    ]
  }'`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(example);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* noop */
    }
  }

  return (
    <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-8">
      <h3 className="text-lg font-semibold">No analyses yet</h3>
      <p className="mt-2 text-sm text-zinc-400">
        Use the API to create your first job. The CSV-upload UI is on the roadmap.
      </p>
      <p className="mt-2 text-xs text-zinc-500">
        Key prefix: <code className="font-mono text-emerald-300">{apiKeyPrefix || "n/a"}</code>
      </p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          href="/docs"
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
        >
          View API docs →
        </Link>
        <button
          type="button"
          onClick={copy}
          className="rounded border border-zinc-700 px-4 py-2 text-sm hover:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          {copied ? "✓ Copied" : "Copy example curl"}
        </button>
      </div>
      <pre className="mt-4 overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">{example}</pre>
    </div>
  );
}

function Card({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <div className="text-xs uppercase tracking-wider text-zinc-500">{title}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {subtitle && <div className="mt-1 text-xs text-zinc-500">{subtitle}</div>}
    </div>
  );
}

function Onboard({ onSet }: { onSet: (k: string) => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [key, setKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteKey, setPasteKey] = useState("");

  async function register(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/account/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      const data = await r.json();
      if (!r.ok) {
        setError(JSON.stringify(data));
      } else {
        setKey(data.api_key);
        localStorage.setItem("sybilshield_api_key", data.api_key);
      }
    } finally {
      setBusy(false);
    }
  }

  function savePastedKey() {
    const k = pasteKey.trim();
    if (!k.startsWith("sk_")) {
      setError("Key should start with sk_live_ or sk_test_");
      return;
    }
    localStorage.setItem("sybilshield_api_key", k);
    onSet(k);
  }

  if (key) {
    return (
      <main className="space-y-6">
        <h1 className="text-3xl font-semibold">You&apos;re in.</h1>
        <p className="text-zinc-400">
          Save your API key now — it cannot be retrieved later, only rotated.
        </p>
        <div className="rounded border border-emerald-700 bg-emerald-900/20 p-4">
          <div className="text-xs text-emerald-300">Your API key</div>
          <div className="mt-2">
            <CopyableSecret value={key} />
          </div>
        </div>
        <button
          onClick={() => onSet(key)}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          I saved it — continue
        </button>
      </main>
    );
  }

  return (
    <main className="max-w-md">
      <h1 className="text-3xl font-semibold">Sign up</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Free Sandbox tier — 100 API calls/month. No card. Email is the only required field.
      </p>
      <form onSubmit={register} className="mt-8 space-y-4">
        <div>
          <label className="text-sm font-medium">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          />
        </div>
        <div>
          <label className="text-sm font-medium">Name (optional)</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          />
        </div>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        >
          {busy ? "Creating..." : "Create account"}
        </button>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      <div className="mt-8 border-t border-zinc-900 pt-6">
        <p className="text-xs text-zinc-500">
          Already have a key?{" "}
          <button
            type="button"
            className="text-emerald-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            onClick={() => setPasteOpen((v) => !v)}
            aria-expanded={pasteOpen}
          >
            Paste it
          </button>
        </p>
        {pasteOpen && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              type="password"
              autoFocus
              value={pasteKey}
              onChange={(e) => setPasteKey(e.target.value)}
              placeholder="sk_live_..."
              className="min-w-[260px] flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            />
            <button
              type="button"
              onClick={savePastedKey}
              className="rounded bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
            >
              Save
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
