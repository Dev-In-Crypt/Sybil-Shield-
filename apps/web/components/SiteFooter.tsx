import Link from "next/link";
import { LogoMark } from "./SiteHeader";

export function SiteFooter() {
  return (
    <footer className="border-t border-white/10 bg-black/50">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 md:grid-cols-5">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2">
              <LogoMark />
              <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]">SYBILSHIELD</span>
            </div>
            <p className="mt-4 max-w-xs font-mono text-xs text-zinc-500">
              // open-source Sybil-detection engine. MIT licensed.
            </p>
          </div>
          {[
            { t: "/product", l: [["access", "/pricing"], ["docs", "/docs"], ["roadmap", "/roadmap"], ["status", "/status"]] },
            { t: "/public", l: [["methods", "/methodology"], ["appeal", "/appeal"], ["security", "/security"]] },
            { t: "/co", l: [["about", "/about"], ["blog", "/blog"], ["contact", "mailto:support@sybilshield.org"]] },
          ].map((c) => (
            <div key={c.t}>
              <div className="font-mono text-xs uppercase tracking-[0.2em] text-zinc-500">{c.t}</div>
              <ul className="mt-3 space-y-2 font-mono text-xs text-zinc-400">
                {c.l.map(([label, href]) => (
                  <li key={label}>
                    <Link href={href} className="hover:text-lime">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-12 border-t border-white/10 pt-6 font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-700">
          // scores are probabilistic // results may contain false positives // appeal flow mandatory for public filter lists
        </p>
      </div>
    </footer>
  );
}
