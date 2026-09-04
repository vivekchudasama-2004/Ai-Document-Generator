"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

type AdminUser = { id: string; email: string; display_name: string | null; role: string; created_at: string };
type TokenUser = { user_id: string; email: string; display_name: string | null; tokens: number };
type Audit = { actor_id: string; target_id: string; action: string; old_role: string | null; new_role: string | null; created_at: string };
type AdminStats = {
  users: number; docs: number; tokens_total: number;
  tokens_by_model: Record<string, number>; tokens_per_user: TokenUser[];
  docs_by_type: Record<string, number>; recent_audits: Audit[];
};

const fmt = (n: number) => n.toLocaleString("en-US");

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      Promise.all([api<{ items: AdminUser[] }>("/api/admin/users"), api<AdminStats>("/api/admin/stats")])
        .then(([u, s]) => {
          setUsers(u.items);
          setStats(s);
        })
        .catch(() => setError("Couldn't load admin data."));
    }
  }, [loading, user]);

  if (loading) return <SectionSkeleton />;
  if (user?.role !== "admin") return <Toast kind="error" message="Admins only. This page is role-gated." />;
  if (error) return <Toast kind="error" message={error} />;
  if (!users || !stats) return <SectionSkeleton />;

  const tokensById = new Map(stats.tokens_per_user.map((t) => [t.user_id, t.tokens]));

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
      <h1 className="h-page mt-2">Workspace oversight</h1>
      <p className="mt-2 max-w-[56ch] text-[var(--muted)]">Role-gated. Every change here is audit-logged.</p>

      <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-6 sm:gap-6" aria-label="Usage stats">
        {[
          ["Users", fmt(stats.users)],
          ["Documents", fmt(stats.docs)],
          ["Tokens used", fmt(stats.tokens_total)],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="sr-only">{label}</dt>
            <dd className="figure truncate text-3xl sm:text-5xl">{value}</dd>
            <dd className="mt-1.5 text-xs text-[var(--muted)] sm:text-sm">{label}</dd>
          </div>
        ))}
      </dl>

      {Object.keys(stats.tokens_by_model).length ? (
        <section className="paper-card mt-6 p-5 sm:p-6" aria-labelledby="models-h">
          <h2 id="models-h" className="font-display text-lg font-bold">Tokens by model</h2>
          <ul className="mt-3 space-y-2.5">
            {Object.entries(stats.tokens_by_model)
              .sort(([, a], [, b]) => b - a)
              .map(([model, total]) => (
                <li key={model} className="flex min-w-0 items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{model}</span>
                  <span className="meter w-24 shrink-0 sm:w-40" aria-hidden>
                    <span style={{ width: `${Math.min(100, (total / Math.max(1, stats.tokens_total)) * 100)}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right font-mono text-xs text-[var(--muted)]">{fmt(total)}</span>
                </li>
              ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {Object.keys(stats.docs_by_type).length ? (
          <section className="paper-card p-5 sm:p-6" aria-labelledby="types-h">
            <h2 id="types-h" className="font-display text-lg font-bold">Documents by type</h2>
            <ul className="mt-3 space-y-2">
              {Object.entries(stats.docs_by_type)
                .sort(([, a], [, b]) => b - a)
                .map(([type, total]) => (
                  <li key={type} className="flex min-w-0 items-center gap-3">
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{type}</span>
                    <span className="meter w-24 shrink-0 sm:w-32" aria-hidden>
                      <span style={{ width: `${Math.min(100, (total / Math.max(1, stats.docs)) * 100)}%` }} />
                    </span>
                    <span className="w-14 shrink-0 text-right font-mono text-xs text-[var(--muted)]">{fmt(total)}</span>
                  </li>
                ))}
            </ul>
          </section>
        ) : null}

        <section className="paper-card p-5 sm:p-6" aria-labelledby="audit-h">
          <h2 id="audit-h" className="font-display text-lg font-bold">Recent changes</h2>
          {stats.recent_audits.length ? (
            <ul className="mt-3 space-y-2.5">
              {stats.recent_audits.map((audit, i) => (
                <li key={`${audit.created_at}-${i}`} className="min-w-0 text-xs leading-relaxed">
                  <p className="truncate font-mono text-[var(--muted)]">{audit.action}</p>
                  <p className="truncate text-[var(--muted)]">
                    {new Date(audit.created_at).toLocaleString()}
                    {audit.old_role || audit.new_role
                      ? ` · ${audit.old_role ?? "?"} to ${audit.new_role ?? "?"}`
                      : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-[var(--muted)]">No admin changes yet. Role edits land here.</p>
          )}
        </section>
      </div>

      <section className="paper-card mt-6 p-5 sm:p-6" aria-labelledby="users-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="users-h" className="font-display text-lg font-bold">Users</h2>
          <p className="font-mono text-xs text-[var(--muted)]">{users.length} total</p>
        </div>
        <ErrorBoundary label="user list">
        {notice ? <div className="mt-3"><Toast kind="success" message={notice} /></div> : null}
        <ul className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{u.display_name ?? u.email}</p>
                <p className="mt-0.5 break-all font-mono text-xs text-[var(--muted)]">
                  {u.email} · {u.role} · since {new Date(u.created_at).toLocaleDateString()}
                </p>
                <p className="mt-1 font-mono text-xs text-[var(--muted)]">
                  {fmt(tokensById.get(u.id) ?? 0)} tokens used
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
