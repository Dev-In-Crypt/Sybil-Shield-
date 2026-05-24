"use client";

import { useEffect, useState } from "react";

interface Notification {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const KIND_COLOR: Record<string, string> = {
  analysis_complete: "text-emerald-400",
  appeal_received: "text-amber-400",
  drift_alert: "text-purple-400",
  payment_processed: "text-emerald-400",
  team_invite: "text-sky-400",
};

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [error, setError] = useState<string | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL;

  async function load() {
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) return;
    try {
      const url = `${base}/v1/notifications${filter === "unread" ? "?unread=true" : ""}`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
      const j = await r.json();
      setItems(j.data ?? []);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, [filter]);

  async function markRead(id: string) {
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) return;
    await fetch(`${base}/v1/notifications/${id}/read`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    load();
  }

  async function markAll() {
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) return;
    await fetch(`${base}/v1/notifications/read-all`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
    });
    load();
  }

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <main>
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-3xl font-semibold">Notifications {unread > 0 && <span className="ml-2 text-sm text-emerald-400">{unread} unread</span>}</h1>
        <button onClick={markAll} className="text-sm text-emerald-400 hover:underline">
          Mark all read
        </button>
      </div>
      <div className="mt-4 flex gap-2 text-xs">
        {(["all", "unread"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded px-3 py-1 ${filter === f ? "bg-emerald-600 text-white" : "bg-zinc-900 text-zinc-400"}`}
          >
            {f}
          </button>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      {items.length === 0 ? (
        <p className="mt-8 rounded border border-zinc-800 bg-zinc-900 p-6 text-sm text-zinc-500">
          No notifications. You'll get one when an analysis completes, an appeal arrives, or a payment is processed.
        </p>
      ) : (
        <ul className="mt-6 divide-y divide-zinc-900 rounded-lg border border-zinc-800">
          {items.map((n) => (
            <li
              key={n.id}
              className={`p-4 ${!n.read_at ? "border-l-2 border-emerald-500 bg-zinc-900" : "bg-zinc-950"}`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <div>
                  <span className={`mr-2 font-mono text-xs ${KIND_COLOR[n.kind] ?? "text-zinc-400"}`}>
                    {n.kind}
                  </span>
                  <span className="font-medium">{n.title}</span>
                </div>
                <span className="font-mono text-xs text-zinc-500">
                  {new Date(n.created_at).toLocaleString()}
                </span>
              </div>
              {n.body && <p className="mt-1 text-sm text-zinc-400">{n.body}</p>}
              <div className="mt-2 flex gap-3 text-xs">
                {n.link && (
                  <a href={n.link} className="text-emerald-400 hover:underline">
                    open →
                  </a>
                )}
                {!n.read_at && (
                  <button onClick={() => markRead(n.id)} className="text-zinc-500 hover:text-zinc-100">
                    mark read
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
