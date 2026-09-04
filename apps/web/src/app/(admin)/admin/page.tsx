"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

type AdminUser = { id: string; email: string; display_name: string | null; role: string; created_at: string };

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      Promise.all([api<{ items: AdminUser[] }>("/api/admin/users"), api("/api/admin/stats")])
        .then(([u, s]) => {
          setUsers(u.items);
          setStats(s as Record<string, unknown>);
        })
        .catch(() => setError("Couldn't load admin data."));
    }
  }, [loading, user]);

  if (loading) return <SectionSkeleton />;
  if (user?.role !== "admin") return <Toast kind="error" message="Admins only. This page is role-gated." />;
  if (error) return <Toast kind="error" message={error} />;
  if (!users || !stats) return <SectionSkeleton />;

  async function setRole(id: string, role: string) {
    setNotice("");
    try {
      await api(`/api/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
      setUsers((u) => (u ?? []).map((x) => (x.id === id ? { ...x, role } : x)));
      setNotice(`Role updated to ${role}.`);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Update failed.");
    }
  }

  return (
    <div>
      <p className="kicker">Admin</p>
      <h1 className="font-display mt-2 text-balance text-3xl font-bold sm:text-4xl">Workspace oversight</h1>
      <p className="mt-2 text-[var(--muted)]">Role-gated. Every change here is audit-logged.</p>

      <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-6 sm:gap-6" aria-label="Usage stats">
        {[
          ["Users", String(stats.users ?? 0)],
          ["Documents", String(stats.docs ?? 0)],
          ["Tokens", String((stats as { tokens_by_model?: unknown }).tokens_by_model ? "tracked" : "—")],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="sr-only">{label}</dt>
            <dd className="figure truncate text-3xl sm:text-5xl">{value}</dd>
            <dd className="mt-1.5 text-xs text-[var(--muted)] sm:text-sm">{label}</dd>
          </div>
        ))}
      </dl>

      <section className="paper-card mt-8 p-5 sm:p-6" aria-labelledby="users-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="users-h" className="font-display text-lg font-bold">Users</h2>
          <p className="font-mono text-xs text-[var(--muted)]">{users.length} total</p>
        </div>
        <ErrorBoundary label="user list">
        {notice ? <div className="mt-3"><Toast kind="success" message={notice} /></div> : null}
        <ul className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.display_name ?? u.email}</p>
                <p className="mt-0.5 break-all font-mono text-xs text-[var(--muted)]">
                  {u.email} · {u.role} · since {new Date(u.created_at).toLocaleDateString()}
                </p>
              </div>
              <select aria-label={`Role for ${u.email}`} className="field w-32 shrink-0" value={u.role}
                onChange={(e) => setRole(u.id, e.target.value)}>
                <option value="user">user</option>
                <option value="admin">admin</option>
              </select>
            </li>
          ))}
        </ul>
        </ErrorBoundary>
      </section>
    </div>
  );
}
