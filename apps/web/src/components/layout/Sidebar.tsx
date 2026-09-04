"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ThemeToggle } from "@/components/ui/ui";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New document" },
  { href: "/projects", label: "Projects" },
  { href: "/templates", label: "Templates" },
  { href: "/exports", label: "Exports" },
];

function initialOf(name: string) {
  const clean = name.trim();
  return clean ? clean.charAt(0).toUpperCase() : "?";
}

/**
 * Avatar button → account menu. `align` decides whether the menu opens
 * upward (desktop sidebar footer) or downward (mobile top bar).
 */
export function AccountMenu({ align = "up" }: { align?: "up" | "down" }) {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const name = user.display_name ?? user.email;
  const menu = (
    <div
      role="menu"
      aria-label="Account"
      className={`absolute right-0 z-30 w-56 overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] py-1.5 shadow-none ${
        align === "up" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]"
      }`}
    >
      <p className="px-4 pb-1.5 pt-2.5">
        <span className="block truncate text-sm font-semibold">{name}</span>
        <span className="block truncate font-mono text-xs text-[var(--muted)]">
          {user.email} · {user.role}
        </span>
      </p>
      <div className="border-t border-[var(--border)] pt-1.5">
        {[
          { href: "/profile", label: "Profile" },
          { href: "/settings", label: "Settings" },
          ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            role="menuitem"
            onClick={() => setOpen(false)}
            className="rowlink block px-4 py-2.5 text-sm font-medium"
          >
            {item.label}
          </Link>
        ))}
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            setOpen(false);
            logout();
          }}
          className="rowlink block w-full px-4 py-2.5 text-left text-sm font-medium"
        >
          Log out
        </button>
      </div>
    </div>
  );

  return (
    <div className="relative">
      {open ? (
        <button
          aria-hidden
          tabIndex={-1}
          className="fixed inset-0 z-20 cursor-default"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        className="flex w-full items-center gap-3 rounded-2xl border border-transparent p-2 text-left transition-colors hover:border-[var(--border)]"
      >
        <span
          className="font-display flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-container)] text-lg font-bold text-[var(--on-accent-container)]"
          aria-hidden
        >
          {initialOf(name)}
        </span>
        <span className="hidden min-w-0 flex-1 md:block">
          <span className="block truncate text-sm font-semibold">{name}</span>
          <span className="block text-xs capitalize text-[var(--muted)]">{user.role}</span>
        </span>
        <svg
          className={`hidden h-4 w-4 shrink-0 text-[var(--muted)] transition-transform md:block ${open ? "rotate-180" : ""}`}
          viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden
        >
          <path d="m4 6 4 4 4-4" />
        </svg>
      </button>
      {open ? menu : null}
    </div>
  );
}

/** Desktop sidebar: wordmark, section nav, theme, account. */
export default function Sidebar() {
  const { user } = useAuth();
  const path = usePathname();
  if (!user) return null;

  return (
    <aside className="paper-card sticky top-6 hidden max-h-[calc(100dvh-3rem)] w-64 shrink-0 flex-col gap-1 self-start overflow-y-auto p-5 md:flex" aria-label="Primary">
      <Link href="/dashboard" className="font-display px-2 text-[1.7rem] font-bold tracking-tight">
        DocuForge
      </Link>
      <p className="kicker px-2 pb-2 pt-5">Workspace</p>
      <nav className="flex flex-col gap-1">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            aria-current={path === n.href ? "page" : undefined}
            className={`navlink${path === n.href ? " navlink-active" : ""}`}
          >
            {n.label}
          </Link>
        ))}
        {user.role === "admin" ? (
          <Link href="/admin" className={`navlink${path === "/admin" ? " navlink-active" : ""}`}>
            Admin
          </Link>
        ) : null}
      </nav>
      <div className="mt-auto border-t border-[var(--border)] pt-4">
        <div className="px-1 pb-3">
          <ThemeToggle />
        </div>
        <div className="rounded-2xl bg-[var(--surface-variant)] p-1.5">
          <AccountMenu align="up" />
        </div>
      </div>
    </aside>
  );
}

/** Mobile top bar: the app had no navigation at all below md — this fixes that. */
export function MobileBar() {
  const { user } = useAuth();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  if (!user) return null;

  const links = [
    ...NAV,
    ...(user.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <div className="sticky top-0 z-20 border-b border-[var(--border)] bg-[var(--surface)] md:hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <Link href="/dashboard" className="font-display text-[1.35rem] font-bold tracking-tight" onClick={() => setOpen(false)}>
          DocuForge
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close navigation" : "Open navigation"}
            className="btn-ghost flex h-11 w-11 items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              {open ? <path d="M5 5l10 10M15 5L5 15" /> : <path d="M3 6h14M3 10h14M3 14h14" />}
            </svg>
          </button>
        </div>
      </div>
      {open ? (
        <nav className="border-t border-[var(--border)] px-4 py-2" aria-label="Primary">
          {links.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              onClick={() => setOpen(false)}
              aria-current={path === n.href ? "page" : undefined}
              className={`navlink block${path === n.href ? " navlink-active" : ""}`}
            >
              {n.label}
            </Link>
          ))}
          <div className="border-t border-[var(--border)] py-2">
            <AccountMenu align="down" />
          </div>
        </nav>
      ) : null}
    </div>
  );
}
