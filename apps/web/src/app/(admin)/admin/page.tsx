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
      <h1 className="font-display text-3xl font-bold">Admin</h1>
      <section className="paper-card mt-6 p-5">
        <h2 className="font-display text-lg font-bold">Usage</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          {String(stats.users)} users, {String(stats.docs)} documents
        </p>
      </section>
      <section className="paper-card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Users</h2>
        <ErrorBoundary label="user list">
        {notice ? <div className="mt-3"><Toast kind="success" message={notice} /></div> : null}
        <ul className="mt-3 divide-y divide-[var(--border)]">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="font-semibold">{u.display_name ?? u.email}</p>
                <p className="break-all font-mono text-xs text-[var(--muted)]">{u.email}, {u.role}</p>
              </div>
              <select aria-label={`Role for ${u.email}`} className="field max-w-40" value={u.role}
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
