"use client";

import Link from "next/link";
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
type Health = { version: string; nimReady: boolean; db: boolean; detector?: string };
type DetectStatus = { analyzer?: string; mode?: string };
type RagStatus = { configured?: boolean; model?: string; sections_embedded?: number; sections_total?: number };
type Available = { live: boolean; models: { id: string }[] };

const fmt = (n: number) => n.toLocaleString("en-US");
const initials = (name: string) =>
  name.split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "?";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const [users, setUsers] = useState<AdminUser[] | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [detect, setDetect] = useState<DetectStatus | null>(null);
  const [rag, setRag] = useState<RagStatus | null>(null);
  const [available, setAvailable] = useState<Available | null>(null);
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
      // System strip: best-effort, never blocks the page.
      api<Health>("/api/health").then(setHealth).catch(() => undefined);
      api<DetectStatus>("/api/detect/status").then(setDetect).catch(() => undefined);
      api<RagStatus>("/api/rag/status").then(setRag).catch(() => undefined);
      api<Available>("/api/models/available").then(setAvailable).catch(() => undefined);
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
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition-colors hover:text-[var(--ink)]"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
          <path d="M10 3 5 8l5 5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to dashboard
      </Link>
      <p className="kicker mt-4">Admin</p>
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

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="paper-card p-5 sm:p-6" aria-labelledby="sys-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="sys-h" className="font-display text-lg font-bold">System</h2>
            <p className="font-mono text-xs text-[var(--muted)]">v{health?.version ?? "…"}</p>
          </div>
          <dl className="mt-4 divide-y divide-[var(--border)] border-t border-[var(--border)]">
            {[
              ["Database", health ? (health.db ? "connected" : "missing") : "…", health ? health.db : true],
              ["Writing service", health ? (health.nimReady ? "reachable" : "offline") : "…", health ? health.nimReady : true],
              ["Live models", available ? (available.live ? `${available.models.length} on key` : "keyless / mock") : "…", true],
              ["Detector", detect ? `${detect.analyzer ?? "?"} · ${detect.mode ?? ""}` : "…", true],
              ["Retrieval", rag ? (rag.configured ? `${rag.sections_embedded ?? 0}/${rag.sections_total ?? 0} embedded` : "off") : "…", rag ? Boolean(rag.configured) : true],
            ].map(([k, v, ok]) => (
              <div key={k as string} className="flex items-center justify-between gap-3 py-2.5">
                <dt className="text-sm text-[var(--muted)]">{k}</dt>
                <dd className="flex min-w-0 items-center gap-2">
                  <span className={`dot ${ok ? "dot-good" : "dot-ember"}`} aria-hidden />
                  <span className="truncate font-mono text-xs">{v}</span>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="panel-ink flex flex-col justify-between gap-5 p-6 sm:p-8" aria-labelledby="act-h">
          <div>
            <h2 id="act-h" className="font-display text-lg font-bold">Quick actions</h2>
            <p className="mt-1 text-sm opacity-80">The three things admins reach for, one tap away.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Link
              href="/new"
              className="rounded-full bg-[var(--signal)] px-5 py-3 text-center text-sm font-bold text-[#141816] transition-transform hover:-translate-y-px active:scale-[0.98]"
            >
              New document
            </Link>
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/templates"
                className="rounded-full border border-white/40 px-4 py-2.5 text-center text-sm font-semibold text-inherit transition-colors hover:bg-white/10"
              >
                Templates
              </Link>
              <Link
                href="/settings"
                className="rounded-full border border-white/40 px-4 py-2.5 text-center text-sm font-semibold text-inherit transition-colors hover:bg-white/10"
              >
                Settings
              </Link>
            </div>
          </div>
        </section>
      </div>

      <section className="paper-card mt-4 p-5 sm:p-6" aria-labelledby="models-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="models-h" className="font-display text-lg font-bold">Tokens by model</h2>
          <p className="font-mono text-xs text-[var(--muted)]">{fmt(stats.tokens_total)} total</p>
        </div>
        {Object.keys(stats.tokens_by_model).length ? (
          <ul className="mt-4 space-y-3">
            {Object.entries(stats.tokens_by_model)
              .sort(([, a], [, b]) => b - a)
              .map(([model, total]) => (
                <li key={model} className="flex min-w-0 items-center gap-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-xs">{model}</span>
                  <span className="meter w-24 shrink-0 sm:w-48" aria-hidden>
                    <span style={{ width: `${Math.min(100, (total / Math.max(1, stats.tokens_total)) * 100)}%` }} />
                  </span>
                  <span className="w-20 shrink-0 text-right font-mono text-xs text-[var(--muted)]">{fmt(total)}</span>
                </li>
              ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">
            Nothing spent yet. Generate a document and per-model spend lands here.{" "}
            <Link href="/new" className="font-semibold text-[var(--accent-ink)] underline underline-offset-2">
              Start one
            </Link>
          </p>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="paper-card p-5 sm:p-6" aria-labelledby="types-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="types-h" className="font-display text-lg font-bold">Documents by type</h2>
            <p className="font-mono text-xs text-[var(--muted)]">{fmt(stats.docs)} total</p>
          </div>
          {Object.keys(stats.docs_by_type).length ? (
            <ul className="mt-4 space-y-3">
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
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">No documents yet. The mix by template appears here.</p>
          )}
        </section>

        <section className="paper-card p-5 sm:p-6" aria-labelledby="audit-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="audit-h" className="font-display text-lg font-bold">Recent changes</h2>
            <p className="font-mono text-xs text-[var(--muted)]">audit log</p>
          </div>
          {stats.recent_audits.length ? (
            <ul className="mt-4 space-y-3">
              {stats.recent_audits.map((audit, i) => (
                <li key={`${audit.created_at}-${i}`} className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 shrink-0 rounded-full bg-[var(--surface-variant)] px-2.5 py-1 font-mono text-[11px] font-semibold">
                    {audit.action}
                  </span>
                  <span className="min-w-0 flex-1 truncate pt-1 text-xs text-[var(--muted)]">
                    {new Date(audit.created_at).toLocaleString()}
                    {audit.old_role || audit.new_role
                      ? ` · ${audit.old_role ?? "?"} to ${audit.new_role ?? "?"}`
                      : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">No admin changes yet. Role edits land here.</p>
          )}
        </section>
      </div>

      <section className="paper-card mt-4 p-5 sm:p-6" aria-labelledby="users-h">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="users-h" className="font-display text-lg font-bold">Users</h2>
          <p className="font-mono text-xs text-[var(--muted)]">{users.length} total</p>
        </div>
        <ErrorBoundary label="user list">
        {notice ? <div className="mt-3"><Toast kind="success" message={notice} /></div> : null}
        <ul className="mt-2 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {users.map((u) => (
            <li key={u.id} className="flex flex-wrap items-center gap-3 py-4">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-container)] font-mono text-sm font-bold text-[var(--on-accent-container)]"
                aria-hidden
              >
                {initials(u.display_name ?? u.email)}
              </span>
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
