"use client";

import Link from "next/link";

/** Bento stat card used on the dashboard. */
export default function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const body = (
    <>
      <p className="font-display text-3xl font-bold">{value}</p>
      <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
    </>
  );
  if (href) {
    return (
      <Link href={href} className="paper-card lift block p-5" aria-label={`${label}: ${value}`}>
        {body}
      </Link>
    );
  }
  return (
    <div className="paper-card p-5">
      {body}
    </div>
  );
}
