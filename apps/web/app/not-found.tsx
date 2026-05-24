import Link from "next/link";
import { SandboxBanner } from "../components/SandboxBanner";
import { SiteFooter } from "../components/SiteFooter";
import { SiteHeader } from "../components/SiteHeader";

export const metadata = { title: "404 · SybilShield" };

export default function NotFound() {
  return (
    <>
      <SandboxBanner />
      <SiteHeader />
      <main className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center px-6 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-widest text-emerald-400">
          // 404 · not_found
        </p>
        <h1 className="mt-6 font-mono text-7xl font-bold leading-none tracking-tight md:text-9xl">
          0x404
        </h1>
        <p className="mt-8 max-w-md text-lg text-zinc-400">
          This address wasn&apos;t part of any analysis we ran.
          <br />
          Or you mistyped a URL.
        </p>
        <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="border-2 border-lime bg-lime px-5 py-3 font-mono text-xs font-bold uppercase tracking-[0.15em] text-black transition hover:bg-transparent hover:text-lime"
          >
            ← back to home
          </Link>
          <Link
            href="/docs"
            className="border border-white/20 px-5 py-3 font-mono text-xs uppercase tracking-[0.15em] text-zinc-300 transition hover:border-lime hover:text-lime"
          >
            read docs
          </Link>
          <Link
            href="/appeal"
            className="border border-white/20 px-5 py-3 font-mono text-xs uppercase tracking-[0.15em] text-zinc-300 transition hover:border-lime hover:text-lime"
          >
            submit appeal
          </Link>
        </div>
        <p className="mt-16 font-mono text-[11px] uppercase tracking-[0.2em] text-zinc-600">
          // bug? <a className="text-emerald-400 hover:underline" href="mailto:support@sybilshield.org">support@sybilshield.org</a>
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
