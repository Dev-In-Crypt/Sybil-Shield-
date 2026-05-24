"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Analysis {
  id: string;
  name: string;
  status: string;
  addressCount: number;
  sybilCount?: number | null;
  suspiciousCount?: number | null;
  genuineCount?: number | null;
  createdAt: string;
}

export default function AnalysesListPage() {
  const [apiKey, setApiKey] = useState("");
  const [rows, setRows] = useState<Analysis[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setApiKey(localStorage.getItem("sybilshield_api_key") ?? "");
  }, []);

  useEffect(() => {
    if (!apiKey) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/v1/analyses`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
      .then((r) => r.json())
      .then((d) => setRows(d.data ?? []))
      .catch((e) => setError(String(e)));
  }, [apiKey]);

  if (!apiKey) return <p className="text-zinc-500">Set your API key on the overview page first.</p>;

  return (
    <main>
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h1 className="text-3xl font-semibold">Analyses</h1>
        <Link
          href="/dashboard/new"
          className="rounded border border-zinc-800 px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900"
        >
          New (roadmap)
        </Link>
      </div>
      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
      <p className="mt-3 text-xs text-zinc-500">
        Create programmatically: <code className="font-mono">POST /v1/analyses</code> — see{" "}
        <Link href="/docs" className="underline">
          docs
        </Link>
      </p>

      {rows.length === 0 ? (
        <div className="mt-12 rounded border border-zinc-800 bg-zinc-900 p-8 text-center text-sm text-zinc-500">
          No analyses yet.
        </div>
      ) : (
        <table className="mt-8 w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-zinc-500">
            <tr>
              <th className="py-2">Name</th>
              <th>Status</th>
              <th>Addresses</th>
              <th>Sybil</th>
              <th>Suspicious</th>
              <th>Genuine</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-zinc-900/50">
                <td className="py-2">
                  <Link
                    href={`/dashboard/analyses/${r.id}`}
                    className="font-medium hover:text-emerald-300"
                  >
                    {r.name}
                  </Link>
                </td>
                <td className="text-zinc-500">{r.status}</td>
                <td>{r.addressCount.toLocaleString()}</td>
                <td className="text-rose-300">{r.sybilCount ?? "—"}</td>
                <td className="text-amber-300">{r.suspiciousCount ?? "—"}</td>
                <td className="text-emerald-300">{r.genuineCount ?? "—"}</td>
                <td className="text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
