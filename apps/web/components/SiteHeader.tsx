import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <LogoMark />
          <span className="font-mono text-sm font-bold uppercase tracking-[0.2em]">SYBILSHIELD</span>
        </Link>
        <nav className="hidden gap-6 font-mono text-xs uppercase tracking-[0.2em] text-zinc-500 md:flex">
          <div className="group relative">
            <Link href="/product/airdrops" className="hover:text-lime">product</Link>
            <div className="invisible absolute left-0 top-full mt-2 w-56 border border-white/10 bg-black p-3 opacity-0 transition group-hover:visible group-hover:opacity-100">
              <Link href="/product/airdrops" className="block py-1 hover:text-lime">airdrops</Link>
              <Link href="/product/governance" className="block py-1 hover:text-lime">governance</Link>
              <Link href="/product/defi-farming" className="block py-1 hover:text-lime">defi farming</Link>
              <Link href="/product/dao-treasury" className="block py-1 hover:text-lime">dao treasury</Link>
            </div>
          </div>
          <Link href="/pricing" className="hover:text-lime">pricing</Link>
          <Link href="/methodology" className="hover:text-lime">methods</Link>
          <Link href="/docs" className="hover:text-lime">docs</Link>
          <Link href="/compare" className="hover:text-lime">compare</Link>
          <Link href="/trust" className="hover:text-lime">trust</Link>
          <Link href="/roadmap" className="hover:text-lime">roadmap</Link>
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
          >
            launch
          </Link>
        </div>
      </div>
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
