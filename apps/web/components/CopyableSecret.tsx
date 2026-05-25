"use client";

import { useState } from "react";

interface Props {
  value: string;
  className?: string;
}

export function CopyableSecret({ value, className }: Props) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* swallow — older browsers */
    }
  }
  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <code className="flex-1 break-all rounded bg-zinc-950 p-3 font-mono text-sm">{value}</code>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 rounded border border-emerald-700/50 bg-emerald-900/20 px-3 py-2 text-xs font-medium text-emerald-300 hover:bg-emerald-900/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        aria-label="Copy to clipboard"
      >
        {copied ? "✓ copied" : "copy"}
      </button>
    </div>
  );
}
