"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/new", label: "New document" },
  { href: "/projects", label: "Projects" },
  { href: "/templates", label: "Templates" },
  { href: "/exports", label: "Exports" },
  { href: "/settings", label: "Settings" },
];

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const path = usePathname();

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-16"><div className="skeleton h-8 w-1/3" /></main>;
  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-6 py-6">
      <aside className="paper-card hidden w-56 shrink-0 flex-col gap-1 p-4 md:flex" aria-label="Primary">
        <p className="font-display px-2 text-xl font-bold">DocuForge</p>
        <nav className="mt-4 flex flex-col gap-1">
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
        <div className="mt-auto border-t border-[var(--border)] pt-4 text-sm">
          <p className="truncate font-semibold">{user.display_name ?? user.email}</p>
          <p className="text-[var(--muted)]">{user.role}</p>
          <button onClick={logout} className="btn-ghost mt-3 w-full text-sm">Log out</button>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
