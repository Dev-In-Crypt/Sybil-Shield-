"use client";

import { useState } from "react";

interface Props {
  prompt: string;          // e.g. "Are you sure?"
  cta: string;             // e.g. "Rotate"
  onConfirm: () => void | Promise<void>;
  variant?: "danger" | "default";
  className?: string;
  triggerClass?: string;
  triggerLabel?: string;   // default = cta
}

export function InlineConfirm({
  prompt,
  cta,
  onConfirm,
  variant = "default",
  className,
  triggerClass,
  triggerLabel,
}: Props) {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);

  const ctaColor =
    variant === "danger"
      ? "bg-red-700 hover:bg-red-600 text-white"
      : "bg-emerald-600 hover:bg-emerald-500 text-white";

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        className={
          triggerClass ??
          "rounded border border-zinc-700 px-3 py-1.5 text-sm hover:border-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
        }
      >
        {triggerLabel ?? cta}
      </button>
    );
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <span className="text-sm text-zinc-300">{prompt}</span>
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await onConfirm();
          } finally {
            setBusy(false);
            setArmed(false);
          }
        }}
        className={`rounded px-3 py-1.5 text-sm font-medium ${ctaColor} disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime`}
      >
        {busy ? "…" : cta}
      </button>
      <button
        type="button"
        onClick={() => setArmed(false)}
        className="rounded border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        Cancel
      </button>
    </div>
  );
}
