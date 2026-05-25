"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { SandboxBanner } from "../components/SandboxBanner";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export default function HomePage() {
  return (
    <div className="relative overflow-x-clip">
      <CyberBackground />
      <SandboxBanner />
      <SiteHeader />

      {/* HERO */}
      <section className="relative">
        <div className="mx-auto max-w-6xl px-6 pb-32 pt-24 md:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 border border-lime/30 bg-lime/5 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-lime">
              <span className="neon-pulse h-1.5 w-1.5 rounded-full bg-lime shadow-[0_0_10px_#c0ff00]" />
              v2.0 // public beta // MIT
            </div>

            <h1 className="mt-8 max-w-5xl font-sans text-6xl font-bold leading-[0.95] tracking-tight md:text-[110px]">
              <Glitch text="HUNT" />{" "}
              <span className="bg-gradient-to-r from-lime via-neon-cyan to-neon-purple bg-clip-text text-transparent">
                SYBILS.
              </span>
              <br />
              <span className="text-zinc-600">PROTECT</span>{" "}
              <span className="bg-gradient-to-r from-neon-purple via-neon-pink to-lime bg-clip-text text-transparent">
                REAL USERS.
              </span>
            </h1>

            <p className="mt-10 max-w-xl text-lg leading-relaxed text-zinc-400">
              Open-source Sybil detection for token distributions, DAO voting, and
              incentive programs. Score wallets, detect coordinated clusters, and give
              users a clear appeal path.
            </p>

            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link
                href="/dashboard"
                className="group relative inline-flex items-center gap-2 border-2 border-lime bg-lime px-7 py-4 font-mono text-sm font-bold uppercase tracking-wider text-black transition-all duration-200 hover:bg-transparent hover:text-lime hover:shadow-[0_0_30px_rgba(192,255,0,0.5)]"
              >
                Launch sandbox <span className="transition group-hover:translate-x-1">→</span>
              </Link>
              <Link
                href="/methodology"
                className="inline-flex items-center gap-2 border border-white/20 bg-transparent px-7 py-4 font-mono text-sm uppercase tracking-wider transition-all hover:border-neon-purple hover:text-neon-purple hover:shadow-[0_0_30px_rgba(168,85,247,0.4)]"
              >
                methodology.md
              </Link>
            </div>
          </motion.div>

          <Marquee />
        </div>
      </section>

      {/* PROBLEM */}
      <SectionCyber eyebrow="problem.txt" title="THE FARMER ECONOMY">
        <div className="grid gap-px bg-white/5 lg:grid-cols-3">
          {[
            { l: "Arbitrum", n: "148,595", d: "Sybils through Nansen → 22% supply stolen" },
            { l: "zkSync", n: "$753K", d: "single farmer · 85 wallets · public extract" },
            { l: "Linea", n: "517K", d: "filter flags · thousands of false-positive complaints" },
            { l: "LayerZero", n: "803K", d: "filtered · zero public evidence per address" },
            { l: "Aptos", n: "40%", d: "of distribution → exchanges within days" },
            { l: "Industry", n: "88%", d: "of airdropped tokens dump < 3 months" },
          ].map((s, i) => (
            <motion.div
              key={s.l}
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative overflow-hidden bg-black p-8 transition-all hover:bg-[#0a0a0a]"
            >
              <div
                className="absolute inset-0 opacity-0 transition group-hover:opacity-100"
                style={{ background: "linear-gradient(135deg, rgba(168,85,247,0.1), transparent 60%)" }}
              />
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">{s.l}</div>
              <div className="mt-4 font-mono text-5xl font-bold text-lime">{s.n}</div>
              <p className="mt-3 text-sm text-zinc-400">{s.d}</p>
            </motion.div>
          ))}
        </div>
        <p className="mt-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">
          // figures from public reporting + dune queries · not sybilshield-measured
        </p>
      </SectionCyber>

      {/* METHODS */}
      <SectionCyber eyebrow="detection_stack" title="// 6 SIGNALS">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[
            { i: "01", t: "FUNDING_SOURCE", d: "Wallets funded by same source within tight time-window. Confidence scales with proximity." },
            { i: "02", t: "BEHAVIORAL_HDBSCAN", d: "Density clustering over 10-dim feature vectors. Scripts surface as tight blobs." },
            { i: "03", t: "GRAPH_LEIDEN", d: "Community detection on the tx graph. Isolated dense subgraphs = farms." },
            { i: "04", t: "TEMPORAL_ENTROPY", d: "Hour/day entropy + autocorrelation. Humans are messy; bots are not." },
            { i: "05", t: "CROSS_CHAIN_LINK", d: "Bridge events deterministically link wallet IDs across 8 chains." },
            { i: "06", t: "ML_ENSEMBLE", d: "LightGBM weighted by label-tier confidence. Honest holdout-only metrics." },
          ].map((m, i) => (
            <motion.div
              key={m.i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="group relative border border-white/10 bg-zinc-950/50 p-6 transition-all hover:border-lime/40 hover:shadow-[0_0_30px_rgba(192,255,0,0.15)]"
            >
              <div className="absolute right-4 top-4 font-mono text-xs text-lime/30 group-hover:text-lime">
                {m.i}
              </div>
              <h3 className="font-mono text-base font-bold tracking-tight text-lime">{m.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{m.d}</p>
              <div className="absolute bottom-0 left-0 h-px w-0 bg-gradient-to-r from-lime to-neon-purple transition-all duration-500 group-hover:w-full" />
            </motion.div>
          ))}
        </div>
      </SectionCyber>

      {/* TRUST */}
      <SectionCyber eyebrow="trust.md" title="// WHY TEAMS CAN TRUST THE SCORE">
        <div className="grid gap-px bg-white/5 md:grid-cols-2 lg:grid-cols-5">
          {[
            { e: "evidence", b: "Every score links to per-address evidence — which methods fired, which features pushed the number." },
            { e: "open source", b: "All six detection methods are MIT-licensed and documented. No vendor lock-in." },
            { e: "sandbox vs prod", b: "Every page distinguishes sandbox state from production state. No theatre." },
            { e: "appeal flow", b: "Public appeals endpoint with 48-hour SLA, built into the protocol, not a UX afterthought." },
            { e: "audit log", b: "Append-only event log. Any flag, appeal, or reversal is reproducible from the public methodology." },
          ].map((t) => (
            <div key={t.e} className="bg-black p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime">{`// ${t.e}`}</div>
              <p className="mt-3 text-sm text-zinc-300">{t.b}</p>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-500">
          <Link href="/methodology" className="hover:text-lime">read the full methodology →</Link>
        </p>
      </SectionCyber>

      {/* EVIDENCE TERMINAL */}
      <SectionCyber eyebrow="terminal.out" title="// EVIDENCE, NOT JUST SCORES">
        <div className="overflow-hidden border border-lime/30 bg-black shadow-[0_0_60px_rgba(192,255,0,0.1)]">
          <div className="flex items-center justify-between border-b border-lime/20 bg-lime/[0.03] px-6 py-3">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <span className="h-2.5 w-2.5 rounded-full bg-lime" />
              <span className="ml-3 font-mono text-xs text-zinc-500">
                sybilshield_inspect — 0xA12b…c4d7
              </span>
            </div>
            <span className="font-mono text-xs text-lime">● analyzed</span>
          </div>
          <div className="grid gap-8 p-8 md:grid-cols-[1fr_2fr]">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">target</div>
              <div className="mt-2 font-mono text-sm text-zinc-300">0xA12b…c4d7</div>
              <div className="mt-10">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500">sybil_score</div>
                <div className="mt-2 font-mono text-7xl font-bold leading-none text-lime drop-shadow-[0_0_30px_rgba(192,255,0,0.4)]">
                  87
                </div>
                <div className="mt-3 inline-flex items-center gap-2 border border-rose-500/40 bg-rose-500/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-rose-300">
                  <span className="neon-pulse h-1.5 w-1.5 rounded-full bg-rose-400" />
                  CLASSIFIED · sybil
                </div>
              </div>
              <div className="mt-8 font-mono text-xs text-zinc-500">
                CLUSTER: <span className="text-neon-purple">F-a8b2c1d4</span> (47 nodes)
              </div>
            </div>
            <div className="space-y-3 font-mono text-sm">
              {[
                { tag: "[shared_funding]", desc: "Funded by 0xABC…123 → also funded 46 others within 1.0h", c: 0.95 },
                { tag: "[behavioral_clone]", desc: "Pattern matches cluster B-17 with 94% similarity", c: 0.89 },
                { tag: "[low_entropy]", desc: "Hour-of-day entropy 0.82 << human baseline (>2.5)", c: 0.70 },
              ].map((e) => (
                <div
                  key={e.tag}
                  className="border-l-2 border-lime/40 bg-white/[0.02] p-4 transition hover:border-lime hover:bg-white/[0.04]"
                >
                  <div className="text-lime">{e.tag}</div>
                  <p className="mt-2 text-xs leading-relaxed text-zinc-300">{e.desc}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <div className="h-0.5 flex-1 bg-white/10">
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${e.c * 100}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-lime shadow-[0_0_8px_#c0ff00]"
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500">{(e.c * 100).toFixed(0)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </SectionCyber>

      {/* COMPARISON */}
      <SectionCyber eyebrow="landscape.csv" title="// VS THE WORLD">
        <div className="overflow-x-auto border border-white/10 bg-black/40">
          <table className="w-full font-mono text-xs">
            <thead className="bg-white/5 text-left text-[10px] uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-6 py-4"></th>
                <th className="px-6 py-4">Trusta</th>
                <th className="px-6 py-4">Nansen</th>
                <th className="px-6 py-4">DIY Dune</th>
                <th className="bg-lime/10 px-6 py-4 text-lime">SybilShield</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[
                ["api_first", "true", "false", "false", "true"],
                ["price/analysis", "$1-3K", "$50-150K", "free+4w", "$2.5-15K"],
                ["evidence", "—", "PDF", "—", "per-addr"],
                ["audit_log", "—", "—", "—", "immutable"],
                ["public_appeal", "—", "—", "—", "live"],
                ["open_source", "—", "—", "—", "MIT"],
                ["turnaround", "hours", "4-8w", "2-4w", "hours"],
              ].map((row) => (
                <tr key={row[0]} className="transition hover:bg-white/[0.02]">
                  <td className="px-6 py-3 text-zinc-300">{row[0]}</td>
                  <td className="px-6 py-3 text-zinc-500">{row[1]}</td>
                  <td className="px-6 py-3 text-zinc-500">{row[2]}</td>
                  <td className="px-6 py-3 text-zinc-500">{row[3]}</td>
                  <td className="bg-lime/5 px-6 py-3 text-lime">{row[4]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </SectionCyber>

      {/* PRICING */}
      <SectionCyber eyebrow="plans.json" title="// PRICING">
        <div className="grid gap-px bg-white/5 md:grid-cols-3">
          {[
            { name: "FREE SANDBOX", price: "$0", suffix: "", desc: "// sandbox", features: ["100 calls/mo", "Evidence format", "Public appeals testing"], cta: { href: "/dashboard", label: "RUN" } },
            { name: "PILOT", price: "From $2,500", suffix: "/ analysis", desc: "// manual onboarding", features: ["Real data ingestion", "Evidence-backed report", "Appeal flow support"], highlight: true, cta: { href: "/pricing", label: "REQUEST PILOT →" } },
            { name: "GROWTH API", price: "—", suffix: "", desc: "// coming soon", features: ["Ongoing scoring", "Webhooks", "Production support"], cta: { href: "/pricing", label: "JOIN WAITLIST →" } },
          ].map((p) => (
            <div
              key={p.name}
              className={`relative flex flex-col bg-black p-8 ${p.highlight ? "bg-gradient-to-b from-lime/[0.05] to-transparent" : ""}`}
            >
              {p.highlight && (
                <span className="absolute -top-3 right-6 bg-lime px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.2em] text-black">
                  POPULAR
                </span>
              )}
              <div className="font-mono text-sm uppercase tracking-[0.2em] text-zinc-500">{p.desc}</div>
              <h3 className="mt-2 font-mono text-2xl font-bold text-lime">{p.name}</h3>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-mono text-5xl font-bold">{p.price}</span>
                <span className="text-sm text-zinc-500">{p.suffix || " "}</span>
              </div>
              <ul className="mt-8 flex-1 space-y-2 text-sm">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2 text-zinc-400">
                    <span className="text-lime">›</span> {f}
                  </li>
                ))}
              </ul>
              {p.cta ? (
                <Link
                  href={p.cta.href}
                  className="mt-8 block border-2 border-lime bg-lime px-4 py-3 text-center font-mono text-sm font-bold uppercase tracking-wider text-black transition hover:bg-transparent hover:text-lime hover:shadow-[0_0_20px_rgba(192,255,0,0.4)]"
                >
                  {p.cta.label}
                </Link>
              ) : (
                <button
                  disabled
                  className="mt-8 block w-full cursor-not-allowed border border-white/10 px-4 py-3 font-mono text-xs uppercase tracking-wider text-zinc-600"
                >
                  // coming soon
                </button>
              )}
            </div>
          ))}
        </div>
      </SectionCyber>

      {/* BUILT FOR */}
      <SectionCyber eyebrow="audience.json" title="// BUILT FOR">
        <div className="grid gap-px bg-white/5 md:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Airdrop teams", d: "Filter coordinated wallets before token distribution." },
            { t: "DAO operators", d: "Review voter sets before controversial proposals." },
            { t: "DeFi incentive programs", d: "Detect farming rings before rewards are paid." },
            { t: "Grant committees", d: "Check whether applicants are connected entities." },
          ].map((a) => (
            <div key={a.t} className="bg-black p-8">
              <h3 className="font-mono text-sm uppercase tracking-[0.15em] text-lime">{a.t}</h3>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400">{a.d}</p>
            </div>
          ))}
        </div>
      </SectionCyber>

      {/* CTA */}
      <section className="relative overflow-hidden border-t border-lime/20">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-lime/[0.05] to-transparent" />
        <div className="mx-auto max-w-4xl px-6 py-32 text-center">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-neon-purple">
              <span className="neon-pulse h-1.5 w-1.5 rounded-full bg-neon-purple shadow-[0_0_10px_#a855f7]" />
              READY
            </div>
            <h2 className="mt-6 font-mono text-5xl font-bold tracking-tight md:text-7xl">
              <span className="text-zinc-600">$&gt;</span> LAUNCH
            </h2>
            <p className="mt-6 text-zinc-400">
              Create a free sandbox account, run a demo analysis, and inspect
              evidence-backed scores.
            </p>
            <Link
              href="/dashboard"
              className="mt-10 inline-block border-2 border-lime bg-lime px-12 py-5 font-mono text-base font-bold uppercase tracking-wider text-black transition hover:bg-transparent hover:text-lime hover:shadow-[0_0_40px_rgba(192,255,0,0.5)]"
            >
              ./START
            </Link>
          </motion.div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

function Glitch({ text }: { text: string }) {
  return (
    <span className="relative inline-block">
      <span className="relative z-10">{text}</span>
      <span
        aria-hidden
        className="absolute inset-0 -z-10 translate-x-[2px] translate-y-[2px] text-neon-purple opacity-40"
      >
        {text}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 -z-20 -translate-x-[2px] -translate-y-[2px] text-lime opacity-40"
      >
        {text}
      </span>
    </span>
  );
}

function CyberBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-black">
      <div className="orb-1 absolute -left-32 top-20 h-[500px] w-[500px] rounded-full bg-lime opacity-[0.07] blur-[150px]" />
      <div className="orb-2 absolute right-0 top-1/3 h-[600px] w-[600px] rounded-full bg-neon-purple opacity-[0.08] blur-[180px]" />
      <div className="orb-3 absolute bottom-0 left-1/3 h-[500px] w-[500px] rounded-full bg-neon-pink opacity-[0.05] blur-[150px]" />
      <div
        className="absolute inset-0 opacity-[0.025]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #c0ff00 1px, transparent 1px), linear-gradient(to bottom, #c0ff00 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
    </div>
  );
}

function Marquee() {
  // Mock telemetry strip — illustrative numbers showing what a production
  // deployment dashboard would look like. Real sandbox traffic is in the
  // single-digit thousands; we don't fake live counters. Labelled clearly
  // below the strip so visitors don't read it as our real telemetry.
  const items = [
    "ANALYSES_RUN: 12,847",
    "ADDRESSES_SCORED: 28.4M",
    "CLUSTERS_DETECTED: 412,099",
    "APPEALS_PROCESSED: 8,231",
    "MODEL_VERSION: v0.5.0-gov-expanded",
    "UPTIME: 99.97%",
  ];
  const doubled = [...items, ...items];
  return (
    <div className="mt-20">
      <div className="overflow-hidden border-y border-lime/20 bg-lime/[0.02] py-4">
        <div className="animate-marquee flex gap-12 whitespace-nowrap font-mono text-xs uppercase tracking-[0.2em] text-lime/70">
          {doubled.map((it, i) => (
            <span key={i} className="shrink-0">
              {it} <span className="ml-12 text-zinc-700">·</span>
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 px-6 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-zinc-600">
        // mock telemetry · illustrative numbers · real sandbox traffic is much smaller — see{" "}
        <a href="/status" className="underline decoration-zinc-700 hover:text-zinc-400">
          /status
        </a>{" "}
        for actuals
      </p>
    </div>
  );
}

function SectionCyber({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-white/10">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="font-mono text-xs uppercase tracking-[0.3em] text-neon-purple">// {eyebrow}</div>
          <h2 className="mt-3 font-mono text-4xl font-bold tracking-tight md:text-6xl">{title}</h2>
        </motion.div>
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}
