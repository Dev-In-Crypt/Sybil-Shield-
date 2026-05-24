export function SandboxBanner() {
  return (
    <div className="border-b border-lime/20 bg-lime/[0.04] px-6 py-2 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-lime/80">
      <span className="font-bold text-lime">// public beta</span> · running on synthetic on-chain data ·{" "}
      <a href="/status" className="underline decoration-lime/30 hover:text-lime">
        status
      </a>
    </div>
  );
}
