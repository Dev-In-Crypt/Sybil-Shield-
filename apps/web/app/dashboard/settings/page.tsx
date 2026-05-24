import Link from "next/link";
import { StatusBadge } from "../../../components/StatusBadge";

export const metadata = { title: "Settings · SybilShield" };

export default function SettingsPage() {
  return (
    <main className="max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold">Settings</h1>
        <StatusBadge status="roadmap" />
      </div>
      <p className="mt-3 text-zinc-400">
        Account-level settings (name, company, default chains, notification preferences) are
        on the roadmap. For now, the things you can manage live on{" "}
        <Link href="/dashboard/api-keys" className="underline">
          /dashboard/api-keys
        </Link>{" "}
        (API key + webhook URL).
      </p>

      <section className="mt-8 space-y-4">
        <Disabled label="Display name" />
        <Disabled label="Company" />
        <Disabled label="Default chains" />
        <Disabled label="Email notifications: weekly digest" />
        <Disabled label="Email notifications: analysis complete (use webhook for now)" />
        <Disabled label="Delete account" tone="danger" />
      </section>
    </main>
  );
}

function Disabled({ label, tone }: { label: string; tone?: "danger" }) {
  const cls = tone === "danger" ? "border-rose-900/40 text-rose-300/60" : "border-zinc-800 text-zinc-500";
  return (
    <div className={`flex items-center justify-between rounded border ${cls} bg-zinc-900 px-4 py-3`}>
      <span className="text-sm">{label}</span>
      <StatusBadge status="roadmap" />
    </div>
  );
}
