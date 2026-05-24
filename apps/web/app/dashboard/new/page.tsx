import Link from "next/link";
import { StatusBadge } from "../../../components/StatusBadge";

export const metadata = { title: "New analysis · SybilShield" };

export default function NewAnalysisPage() {
  return (
    <main className="max-w-2xl">
      <div className="flex items-center gap-3">
        <h1 className="text-3xl font-semibold">New analysis</h1>
        <StatusBadge status="roadmap" />
      </div>
      <p className="mt-3 text-zinc-400">
        The visual CSV-upload form is on the roadmap. Until it ships, new analyses are
        created programmatically through the API.
      </p>

      <section className="mt-10 grid gap-4">
        <Bullet title="What you upload">
          A CSV of wallet addresses (one per row, header optional) or a JSON array. Up to 1M
          addresses per request.
        </Bullet>
        <Bullet title="What you choose">
          Chains to scan (any of Ethereum, Arbitrum, Optimism, Base, Polygon, BSC, Avalanche,
          Linea), sensitivity profile (strict / balanced / lenient), and whether to include
          per-address evidence.
        </Bullet>
        <Bullet title="What you get">
          An analysis ID immediately. A webhook (signed) when complete. Scored results,
          detected clusters, and an exportable CSV — all queryable through the dashboard or API.
        </Bullet>
      </section>

      <section className="mt-12 rounded-lg border border-zinc-800 bg-zinc-900 p-5">
        <h3 className="font-semibold">Start one now</h3>
        <p className="mt-2 text-sm text-zinc-400">
          Read the{" "}
          <Link href="/docs" className="underline hover:text-zinc-100">
            documentation
          </Link>{" "}
          to see the endpoints and required fields. Or contact us if you'd like an account
          manager to walk you through a first analysis.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/docs"
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
          >
            Read API docs →
          </Link>
          <a
            href="mailto:support@sybilshield.org?subject=First%20analysis"
            className="rounded border border-zinc-800 px-4 py-2 text-sm hover:bg-zinc-900"
          >
            Email us
          </a>
        </div>
      </section>

      <section className="mt-12 rounded border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
        <h3 className="font-medium text-zinc-200">Want this form sooner?</h3>
        <p className="mt-2">
          The CSV-upload UI is tracked on the public{" "}
          <Link href="/roadmap" className="underline">
            roadmap
          </Link>
          .
        </p>
      </section>
    </main>
  );
}

function Bullet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-2 text-sm text-zinc-400">{children}</p>
    </div>
  );
}
