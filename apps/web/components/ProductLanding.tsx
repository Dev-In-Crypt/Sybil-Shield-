import Link from "next/link";

export interface ProductSpec {
  eyebrow: string;
  title: string;
  lead: string;
  stats: { value: string; label: string }[];
  methods: { name: string; why: string }[];
  miniCase: { title: string; body: string };
  tier: { name: string; price: string; reason: string; href: string };
}

export function ProductLanding({ spec }: { spec: ProductSpec }) {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 space-y-20">
      <header>
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">// {spec.eyebrow}</p>
        <h1 className="mt-2 text-5xl font-bold leading-tight">{spec.title}</h1>
        <p className="mt-4 max-w-2xl text-lg text-zinc-400">{spec.lead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/dashboard" className="rounded bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">
            Start free
          </Link>
          <Link href="/lookup" className="rounded border border-zinc-700 px-5 py-2.5 text-sm hover:border-emerald-500">
            Lookup an address
          </Link>
        </div>
      </header>

      <section>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {spec.stats.map((s) => (
            <div key={s.label} className="rounded border border-zinc-800 bg-zinc-900 p-5">
              <div className="font-mono text-2xl font-bold text-emerald-400">{s.value}</div>
              <div className="mt-1 text-sm text-zinc-400">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Which detection methods matter here</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {spec.methods.map((m) => (
            <div key={m.name} className="rounded border border-zinc-800 bg-zinc-900 p-5">
              <h3 className="font-mono text-sm uppercase tracking-widest text-emerald-400">{m.name}</h3>
              <p className="mt-2 text-sm text-zinc-300">{m.why}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-zinc-800 bg-zinc-900 p-8">
        <p className="font-mono text-xs uppercase tracking-widest text-zinc-500">// mini case study</p>
        <h2 className="mt-2 text-2xl font-semibold">{spec.miniCase.title}</h2>
        <p className="mt-4 text-zinc-300">{spec.miniCase.body}</p>
        <Link href="/customers" className="mt-4 inline-block text-sm text-emerald-400 hover:underline">
          See more case studies →
        </Link>
      </section>

      <section>
        <h2 className="text-2xl font-semibold">Suggested plan</h2>
        <div className="mt-6 flex flex-col items-start gap-4 rounded border border-emerald-700 bg-emerald-900/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-mono text-lg text-emerald-400">{spec.tier.name}</h3>
            <p className="mt-1 text-2xl font-bold">{spec.tier.price}</p>
            <p className="mt-2 max-w-xl text-sm text-zinc-400">{spec.tier.reason}</p>
          </div>
          <Link href={spec.tier.href} className="rounded bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">
            See pricing →
          </Link>
        </div>
      </section>
    </main>
  );
}
