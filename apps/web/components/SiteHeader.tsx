"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const NAV: { href: string; label: string }[] = [
  { href: "/pricing", label: "pricing" },
  { href: "/methodology", label: "methods" },
  { href: "/docs", label: "docs" },
  { href: "/compare", label: "compare" },
  { href: "/trust", label: "trust" },
  { href: "/roadmap", label: "roadmap" },
];

const PRODUCT: { href: string; label: string }[] = [
  { href: "/product/airdrops", label: "airdrops" },
  { href: "/product/governance", label: "governance" },
  { href: "/product/defi-farming", label: "defi farming" },
  { href: "/product/dao-treasury", label: "dao treasury" },
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);

  // Close on Esc
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while open
  useEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <LogoMark />
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]">SYBILSHIELD</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden gap-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 md:flex">
          <div className="group relative">
            <Link href="/product/airdrops" className="hover:text-lime focus:outline-none focus-visible:text-lime">
              product
            </Link>
            <div className="invisible absolute left-0 top-full mt-2 w-56 border border-white/10 bg-black p-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
              {PRODUCT.map((p) => (
                <Link key={p.href} href={p.href} className="block py-1 hover:text-lime">
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
          {NAV.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-lime focus:outline-none focus-visible:text-lime">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/appeal"
            className="hidden font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 hover:text-lime md:inline"
          >
            appeal
          </Link>
          <Link
            href="/dashboard"
            className="border-2 border-lime bg-lime px-4 py-1.5 font-mono text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:bg-transparent hover:text-lime hover:shadow-[0_0_20px_rgba(192,255,0,0.4)]"
            onClick={() => setOpen(false)}
          >
            launch
          </Link>

          {/* Hamburger — mobile only */}
          <button
            type="button"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
            className="ml-1 inline-flex h-9 w-9 items-center justify-center md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
          >
            <div className="relative h-3.5 w-5">
              <span
                className={`absolute left-0 top-0 h-0.5 w-full bg-lime transition-transform ${
                  open ? "translate-y-1.5 rotate-45" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-1.5 h-0.5 w-full bg-lime transition-opacity ${
                  open ? "opacity-0" : ""
                }`}
              />
              <span
                className={`absolute left-0 top-3 h-0.5 w-full bg-lime transition-transform ${
                  open ? "-translate-y-1.5 -rotate-45" : ""
                }`}
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile overlay panel */}
      {open && (
        <div
          id="mobile-nav"
          className="fixed inset-x-0 top-[57px] bottom-0 z-50 overflow-y-auto bg-black/95 backdrop-blur-xl md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <nav className="flex flex-col gap-1 px-6 py-6 font-mono text-sm uppercase tracking-[0.15em]">
            <details className="group">
              <summary className="cursor-pointer list-none border-b border-white/10 py-3 text-zinc-200">
                <span className="flex items-center justify-between">
                  product
                  <span className="text-lime transition group-open:rotate-45">+</span>
                </span>
              </summary>
              <div className="ml-4 mt-1 flex flex-col gap-1 border-l border-white/10 pl-4 py-2 text-zinc-400">
                {PRODUCT.map((p) => (
                  <Link
                    key={p.href}
                    href={p.href}
                    onClick={() => setOpen(false)}
                    className="py-1 hover:text-lime focus:outline-none focus-visible:text-lime"
                  >
                    {p.label}
                  </Link>
                ))}
              </div>
            </details>
            {NAV.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-white/10 py-3 text-zinc-200 hover:text-lime focus:outline-none focus-visible:text-lime"
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/appeal"
              onClick={() => setOpen(false)}
              className="border-b border-white/10 py-3 text-zinc-200 hover:text-lime focus:outline-none focus-visible:text-lime"
            >
              appeal
            </Link>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="mt-6 inline-flex justify-center border-2 border-lime bg-lime px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-black hover:bg-transparent hover:text-lime"
            >
              launch sandbox →
            </Link>
            <p className="mt-8 text-center text-[10px] uppercase tracking-[0.2em] text-zinc-600">
              // tap outside or press esc to close
            </p>
          </nav>
        </div>
      )}
    </header>
  );
}

export function LogoMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <path d="M4 6 L16 2 L28 6 V18 L16 30 L4 18 Z" stroke="#c0ff00" strokeWidth="2" fill="none" />
      <path
        d="M8 14 L16 6 L24 14 L24 22 L16 26 L8 22 Z"
        stroke="#a855f7"
        strokeWidth="1.5"
        fill="#c0ff00"
        fillOpacity="0.15"
      />
      <circle cx="16" cy="16" r="2" fill="#c0ff00" />
    </svg>
  );
}
