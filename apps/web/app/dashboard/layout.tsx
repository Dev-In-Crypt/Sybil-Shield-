import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { StatusBadge } from "../../components/StatusBadge";
import { type FeatureKey, getStatus } from "../../lib/feature-status";

export const metadata = { title: "Dashboard · SybilShield" };

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Sidebar reads status from the single source of truth (lib/feature-status.ts).
  // Don't hardcode badges here — they'll drift the moment a feature ships.
  const nav: { href: string; label: string; key?: FeatureKey }[] = [
    { href: "/dashboard", label: "Overview", key: "pageDashboardOverview" },
    { href: "/dashboard/analyses", label: "Analyses", key: "pageAnalysesList" },
    { href: "/dashboard/notifications", label: "Notifications" },
    { href: "/dashboard/new", label: "New analysis", key: "pageNewAnalysis" },
    { href: "/dashboard/api-keys", label: "API keys", key: "pageApiKeys" },
    { href: "/dashboard/webhooks", label: "Webhooks" },
    { href: "/dashboard/team", label: "Team" },
    { href: "/dashboard/scoring", label: "Scoring" },
    { href: "/dashboard/watchlist", label: "Watchlist" },
    { href: "/dashboard/billing", label: "Usage", key: "pageBilling" },
    { href: "/dashboard/settings", label: "Settings", key: "pageSettings" },
  ];

  return (
    <>
      <SandboxBanner />
      <div className="border-b border-zinc-900 bg-zinc-950">
        <div className="mx-auto max-w-6xl px-6 py-3">
          <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-100">
            ← back to site
          </Link>
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 md:grid-cols-[200px_1fr]">
        <aside>
          <nav className="space-y-1 text-sm">
            {nav.map((item) => {
              const status = item.key ? getStatus(item.key) : "available";
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center justify-between rounded px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                >
                  <span>{item.label}</span>
                  {status !== "available" && <StatusBadge status={status} />}
                </Link>
              );
            })}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </>
  );
}
