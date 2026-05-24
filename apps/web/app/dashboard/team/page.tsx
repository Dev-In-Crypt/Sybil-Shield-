"use client";

import { useEffect, useState } from "react";

interface Member {
  id: string;
  user_email: string;
  role: string;
  status: string;
  joined_at: string | null;
}

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [error, setError] = useState<string | null>(null);

  const base = process.env.NEXT_PUBLIC_API_URL;

  async function load() {
    const key = localStorage.getItem("sybilshield_api_key");
    if (!key) return;
    try {
      const r = await fetch(`${base}/v1/team`, { headers: { Authorization: `Bearer ${key}` } });
      const j = await r.json();
      setMembers(j.data ?? []);
    } catch (e) {
      setError(String(e));
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    const key = localStorage.getItem("sybilshield_api_key");
    const r = await fetch(`${base}/v1/team/invites`, {
      method: "POST",
      headers: { "content-type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ email, role }),
    });
    if (!r.ok) {
      const j = await r.json();
      setError(JSON.stringify(j));
    } else {
      setEmail("");
      load();
    }
  }

  async function remove(id: string) {
    if (!confirm("Remove this teammate?")) return;
    const key = localStorage.getItem("sybilshield_api_key");
    await fetch(`${base}/v1/team/members/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${key}` },
    });
    load();
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold">Team</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Invite colleagues with scoped roles: owner, admin, member, viewer.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Invite</h2>
      <form onSubmit={invite} className="mt-4 flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[240px]">
          <label className="text-xs uppercase tracking-wider text-zinc-500">Email</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="colleague@example.com"
          />
        </div>
        <div>
          <label className="text-xs uppercase tracking-wider text-zinc-500">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="mt-1 rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
          >
            <option value="member">member</option>
            <option value="admin">admin</option>
            <option value="viewer">viewer</option>
          </select>
        </div>
        <button className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
          Send invite
        </button>
      </form>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <h2 className="mt-12 text-xl font-semibold">Members</h2>
      <div className="mt-4 overflow-x-auto rounded border border-zinc-800">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-xs uppercase text-zinc-500">
            <tr>
              <th className="px-4 py-2 text-left">email</th>
              <th className="px-4 py-2 text-left">role</th>
              <th className="px-4 py-2 text-left">status</th>
              <th className="px-4 py-2 text-left">joined</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900">
            {members.map((m) => (
              <tr key={m.id} className="bg-zinc-950">
                <td className="px-4 py-2 font-mono text-xs">{m.user_email}</td>
                <td className="px-4 py-2 text-xs">{m.role}</td>
                <td className={`px-4 py-2 text-xs ${m.status === "active" ? "text-emerald-400" : "text-amber-400"}`}>
                  {m.status}
                </td>
                <td className="px-4 py-2 text-xs text-zinc-500">
                  {m.joined_at ? new Date(m.joined_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-2 text-right">
                  {m.role !== "owner" && (
                    <button onClick={() => remove(m.id)} className="text-xs text-zinc-500 hover:text-red-400">
                      remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-xl font-semibold">Roles</h2>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {[
          ["Owner", "Full access. Manages billing, deletes account, transfers ownership."],
          ["Admin", "All analyses + team invites + API keys. Cannot delete account or change billing."],
          ["Member", "Create & view analyses. Read-only on team + billing."],
          ["Viewer", "Read-only on analyses. Cannot create or modify."],
        ].map(([title, body]) => (
          <div key={title} className="rounded border border-zinc-800 bg-zinc-900 p-4">
            <h3 className="font-mono text-sm text-emerald-400">{title.toUpperCase()}</h3>
            <p className="mt-1 text-sm text-zinc-400">{body}</p>
          </div>
        ))}
      </div>
    </main>
  );
}
