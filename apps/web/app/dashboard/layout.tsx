import Link from "next/link";
import { SandboxBanner } from "../../components/SandboxBanner";
import { StatusBadge } from "../../components/StatusBadge";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const nav: { href: string; label: string; status?: "available" | "beta" | "roadmap" }[] = [
    { href: "/dashboard", label: "Overview", status: "available" },
    { href: "/dashboard/analyses", label: "Analyses", status: "available" },
    { href: "/dashboard/notifications", label: "Notifications", status: "available" },
    { href: "/dashboard/new", label: "New analysis", status: "roadmap" },
    { href: "/dashboard/api-keys", label: "API keys", status: "available" },
    { href: "/dashboard/webhooks", label: "Webhooks", status: "available" },
    { href: "/dashboard/team", label: "Team", status: "available" },
    { href: "/dashboard/scoring", label: "Scoring", status: "available" },
    { href: "/dashboard/watchlist", label: "Watchlist", status: "available" },
    { href: "/dashboard/billing", label: "Billing", status: "beta" },
    { href: "/dashboard/settings", label: "Settings", status: "roadmap" },
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
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center justify-between rounded px-3 py-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              >
                <span>{item.label}</span>
                {item.status && item.status !== "available" && (
                  <StatusBadge status={item.status} />
                )}
              </Link>
            ))}
          </nav>
        </aside>
        <section>{children}</section>
      </div>
    </>
  );
}
