"use client";

import { useTheme } from "@/contexts/ThemeContext";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      aria-pressed={dark}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="btn-ghost flex min-h-11 items-center justify-center gap-2 px-3 text-sm font-semibold"
    >
      {dark ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8Z" />
        </svg>
      )}
      <span className="hidden sm:inline">{dark ? "Light" : "Dark"}</span>
    </button>
  );
}

export function ScoreRing({ value, size = 44 }: { value: number | null; size?: number }) {
  const v = value ?? 0;
  const color = value == null ? "var(--muted)" : v >= 90 ? "var(--good)" : v >= 70 ? "var(--warn)" : "var(--bad)";
  const r = 15.5;
  const c = 2 * Math.PI * r;
  return (
    <span
      className="inline-flex items-center gap-2"
      title={value == null ? "Not scored yet" : `${v}% human`}
      role="img"
      aria-label={value == null ? "Not scored" : `${v} percent human`}
    >
      <svg width={size} height={size} viewBox="0 0 36 36" aria-hidden>
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--border)" strokeWidth="4" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (c * Math.min(100, v)) / 100}
          className="score-ring"
          transform="rotate(-90 18 18)"
        />
      </svg>
      <span className="text-sm font-semibold">{value == null ? "—" : `${v}%`}</span>
    </span>
  );
}

export function SectionSkeleton() {
  return (
    <div className="paper-card space-y-3 p-5" aria-busy="true" aria-label="Section loading">
      <div className="skeleton h-5 w-1/3" />
      <div className="skeleton h-3 w-full" />
      <div className="skeleton h-3 w-11/12" />
      <div className="skeleton h-3 w-4/5" />
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint: string;
  action: React.ReactNode;
}) {
  return (
    <div className="paper-card mx-auto max-w-xl p-10 text-center">
      <div className="font-display mx-auto text-5xl" aria-hidden>
        ✎
      </div>
      <h2 className="font-display mt-4 text-2xl font-bold">{title}</h2>
      <p className="mt-2 text-[var(--muted)]">{hint}</p>
      <div className="mt-6">{action}</div>
    </div>
  );
}

export function Toast({ kind, message }: { kind: "error" | "success"; message: string }) {
  const border = kind === "error" ? "var(--bad)" : "var(--good)";
  return (
    <p role="alert" className="toast paper-card border-l-4 p-4 text-sm" style={{ borderLeftColor: border }}>
      {message}
    </p>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="mt-1 text-sm text-[var(--bad)]">
      {message}
    </p>
  );
}
