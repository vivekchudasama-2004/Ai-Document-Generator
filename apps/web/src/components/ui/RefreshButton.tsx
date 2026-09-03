"use client";

import { useState } from "react";

/** Manual refresh control: re-runs the loader, spins while busy. */
export default function RefreshButton({ onRefresh, label = "Refresh" }: { onRefresh: () => Promise<unknown>; label?: string }) {
  const [spinning, setSpinning] = useState(false);

  async function handleClick() {
    if (spinning) return;
    setSpinning(true);
    try {
      await onRefresh();
    } finally {
      setSpinning(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={spinning}
      aria-label={spinning ? "Refreshing…" : label}
      title={spinning ? "Refreshing…" : label}
      className="btn-ghost flex min-h-11 items-center gap-2 px-3 text-sm font-semibold"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={spinning ? "animate-spin" : ""}
      >
        <path d="M21 12a9 9 0 1 1-2.6-6.4" />
        <path d="M21 3v6h-6" />
      </svg>
      <span className="hidden sm:inline">{spinning ? "Refreshing…" : label}</span>
    </button>
  );
}
