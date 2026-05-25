"use client";

import { useEffect, useState } from "react";
import { InlineConfirm } from "../../../components/InlineConfirm";

interface Account {
  id: string;
  email: string;
  plan: string;
  api_key_prefix: string | null;
  webhook_configured: boolean;
  usage: { calls_this_month: number; limit: number };
}

export default function ApiKeysPage() {
  const [apiKey, setApiKey] = useState("");
  const [account, setAccount] = useState<Account | null>(null);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSecret, setWebhookSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem("sybilshield_api_key") ?? "");
  }, []);

  async function loadAccount() {
    setError(null);
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/account`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setAccount(await r.json());
    } catch (e) {
      setError(String(e));
    }
  }

  async function rotateKey() {
    setError(null);
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/account/api-keys/rotate`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await r.json();
    if (!r.ok) return setError(JSON.stringify(data));
    setNewKey(data.api_key);
    setApiKey(data.api_key);
    localStorage.setItem("sybilshield_api_key", data.api_key);
  }

  async function saveWebhook() {
    setError(null);
    const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/account/webhooks`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
    });
    const data = await r.json();
    if (!r.ok) return setError(JSON.stringify(data));
    setWebhookSecret(data.secret);
    loadAccount();
  }

  async function deleteWebhook() {
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/account/webhooks`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    setWebhookSecret(null);
    setWebhookUrl("");
    loadAccount();
  }

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <h1 className="text-2xl font-semibold">API keys & webhooks</h1>

      <div className="mt-6 flex gap-2">
        <input
          className="flex-1 rounded border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm font-mono"
          placeholder="sk_live_..."
          value={apiKey}
          onChange={(e) => {
            setApiKey(e.target.value);
            localStorage.setItem("sybilshield_api_key", e.target.value);
          }}
        />
        <button className="rounded bg-emerald-600 px-4 py-2 text-sm hover:bg-emerald-500" onClick={loadAccount}>
          Load account
        </button>
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {account && (
        <section className="mt-8 space-y-6">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Account</div>
            <div className="mt-1 text-sm">{account.email}</div>
            <div className="mt-1 text-xs text-zinc-500">
              plan: {account.plan} · prefix: <span className="font-mono">{account.api_key_prefix}</span> · usage: {account.usage.calls_this_month.toLocaleString()} / {account.usage.limit.toLocaleString()}
            </div>
            <div className="mt-3">
              <InlineConfirm
                prompt="Old key stops working immediately. Sure?"
                cta="Rotate"
                variant="danger"
                triggerLabel="Rotate key"
                triggerClass="rounded bg-rose-700 px-3 py-1.5 text-sm hover:bg-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                onConfirm={rotateKey}
              />
            </div>
          </div>

          {newKey && (
            <div className="rounded border border-emerald-700 bg-emerald-900/20 p-4 text-sm">
              <div className="text-emerald-300">New API key (save now):</div>
              <code className="mt-2 block break-all rounded bg-zinc-950 p-2 font-mono text-xs">{newKey}</code>
            </div>
          )}

          <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
            <div className="text-xs uppercase tracking-wider text-zinc-500">Webhook</div>
            <p className="mt-1 text-xs text-zinc-500">
              We POST <span className="font-mono">analysis.completed</span> with an HMAC-SHA256 signature
              in <span className="font-mono">x-sybilshield-signature</span>.
            </p>
            <div className="mt-3 flex gap-2">
              <input
                className="flex-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono"
                placeholder="https://your.app/sybilshield-webhook"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
              />
              <button className="rounded bg-emerald-600 px-3 py-2 text-sm hover:bg-emerald-500" onClick={saveWebhook}>
                Save
              </button>
              {account.webhook_configured && (
                <button className="rounded bg-zinc-700 px-3 py-2 text-sm hover:bg-zinc-600" onClick={deleteWebhook}>
                  Remove
                </button>
              )}
            </div>
            {webhookSecret && (
              <div className="mt-3 rounded border border-emerald-700 bg-emerald-900/20 p-3 text-sm">
                <div className="text-emerald-300 text-xs">Webhook signing secret (save now):</div>
                <code className="mt-1 block break-all rounded bg-zinc-950 p-2 font-mono text-xs">{webhookSecret}</code>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
