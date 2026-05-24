"use client";

import { useEffect, useState } from "react";

interface Item {
  id: string;
  address: string;
  chain: string;
  label: string | null;
  alert_on_change: boolean;
  added_at: string;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [addr, setAddr] = useState("");
  const [chain, setChain] = useState("ethereum");
  const [label, setLabel] = useState("");
  const [alert, setAlert] = useState(true);

  const base = process.env.NEXT_PUBLIC_API_URL;

  async function load() {
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) return;
    try {
      const r = await fetch(`${base}/v1/watchlist`, { headers: { Authorization: `Bearer ${key}` } });
      const j = await r.json();
      setItems(j.data ?? []);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const key = localStorage.getItem("sybilshield_api_key");
    const r = await fetch(`${base}/v1/watchlist`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        address: addr.toLowerCase(),
        chain,
        label: label || undefined,
        alert_on_change: alert,
      }),
    });
    if (!r.ok) {
      const j = await r.json();
      setError(JSON.stringify(j));
    } else {
      setAddr("");
      setLabel("");
      load();
    }
  }

  async function remove(id: string) {
    const key = localStorage.getItem("sybilshield_api_key");
    await fetch(`${base}/v1/watchlist/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    load();
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Watchlist</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Pin addresses to track. Nightly re-scoring; notification on score change ≥ 5 points.
      </p>

      <form onSubmit={add} className="mt-8 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[260px]">
          <label className="text-xs uppercase tracking-wider text-zinc-500">Address</label>
          <input
            required
            value={addr}
            onChange={(e) => setAddr(e.target.value)}
            placeholder="0x..."
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500">Chain</label>
          <select
            value={chain}
            onChange={(e) => setChain(e.target.value)}
            className="mt-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option>ethereum</option>
            <option>arbitrum</option>
            <option>optimism</option>
            <option>base</option>
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs uppercase tracking-wider text-zinc-500">Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="my treasury wallet"
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 pb-2 text-xs text-zinc-400">
          <input type="checkbox" checked={alert} onChange={(e) => setAlert(e.target.checked)} />
          alert on change
        </label>
        <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          + Add
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <h2 className="mt-12 text-xl font-semibold">Watching ({items.length})</h2>
      {items.length === 0 ? (
        <p className="mt-4 rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
          No addresses pinned yet. Add one above.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded border border-zinc-800">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-2 text-left">address</th>
                <th className="px-4 py-2 text-left">chain</th>
                <th className="px-4 py-2 text-left">label</th>
                <th className="px-4 py-2 text-left">alerts</th>
                <th className="px-4 py-2 text-left">added</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-900">
              {items.map((i) => (
                <tr key={i.id} className="bg-zinc-950">
                  <td className="px-4 py-2 font-mono text-xs text-emerald-400">{i.address}</td>
                  <td className="px-4 py-2 text-xs">{i.chain}</td>
                  <td className="px-4 py-2 text-xs">{i.label ?? "—"}</td>
                  <td className={`px-4 py-2 text-xs ${i.alert_on_change ? "text-emerald-400" : "text-zinc-500"}`}>
                    {i.alert_on_change ? "on" : "off"}
                  </td>
                  <td className="px-4 py-2 text-xs text-zinc-500">{new Date(i.added_at).toLocaleDateString()}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => remove(i.id)} className="text-xs text-zinc-500 hover:text-red-400">
                      remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
