"use client";

import { useEffect, useState } from "react";

interface Delivery {
  id: string;
  url: string;
  event_type: string;
  status_code: number | null;
  error: string | null;
  attempts: number;
  sent_at: string;
}

export default function WebhooksPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const base = process.env.NEXT_PUBLIC_API_URL;

  async function load() {
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) return;
    try {
      const r = await fetch(`${base}/v1/webhooks/deliveries`, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const j = await r.json();
      setDeliveries(j.data ?? []);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function sendTest() {
    setTesting(true);
    const key = localStorage.getItem("sybilshield_api_key");
    try {
      await fetch(`${base}/v1/webhooks/test`, {
        method: "POST",
        headers: { Authorization: `Bearer ${key}` },
      });
      await load();
    } finally {
      setTesting(false);
    }
  }

  async function retry(id: string) {
    const key = localStorage.getItem("sybilshield_api_key");
    await fetch(`${base}/v1/webhooks/deliveries/${id}/retry`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    load();
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Webhooks</h1>
      <p className="mt-2 text-sm text-zinc-400">
        We POST signed events to your endpoint when analyses complete or appeals are filed. HMAC-SHA256 signature in <code>X-SybilShield-Signature</code>.
      </p>

      <div className="mt-8 rounded border border-zinc-800 bg-zinc-900 p-6">
        <h2 className="text-lg font-semibold">Configuration</h2>
        <p className="mt-2 text-sm text-zinc-400">
          Set your URL and secret on the <a href="/dashboard/api-keys" className="text-emerald-400 hover:underline">API keys</a> page.
        </p>
        <button
          onClick={sendTest}
          disabled={testing}
          className="mt-4 rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          {testing ? "Sending..." : "Send test event"}
        </button>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Recent deliveries</h2>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {deliveries.length === 0 ? (
        <p className="mt-4 rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
          No deliveries yet.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">event</th>
                <th className="px-4 py-2 text-left">url</th>
                <th className="px-4 py-2 text-left">status</th>
                <th className="px-4 py-2 text-left">attempts</th>
                <th className="px-4 py-2 text-left">sent</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {deliveries.map((d) => {
                const ok = d.status_code && d.status_code < 400;
                return (
                  <tr key={d.id} className="bg-zinc-950">
                    <td className="px-4 py-2 font-mono text-xs">{d.event_type}</td>
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500">{d.url}</td>
                    <td className={`px-4 py-2 font-mono text-xs ${ok ? "text-emerald-400" : "text-red-400"}`}>
                      {d.status_code ?? d.error ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-xs">{d.attempts}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">{new Date(d.sent_at).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right">
                      {!ok && (
                        <button onClick={() => retry(d.id)} className="text-xs text-emerald-400 hover:underline">
                          retry
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
