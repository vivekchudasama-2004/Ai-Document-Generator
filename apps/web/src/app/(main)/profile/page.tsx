"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError, api } from "@/lib/api/client";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { FieldError, Toast } from "@/components/ui/ui";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [notice, setNotice] = useState("");
  const [failed, setFailed] = useState("");
  const [nameError, setNameError] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user) return null;
  const displayName = name ?? user.display_name ?? "";
  const initial = (displayName || user.email).trim().charAt(0).toUpperCase();

  async function saveName(e: React.FormEvent) {
    e.preventDefault();
    if (displayName.length > 100) {
      setNameError("Keep it under 100 characters.");
      return;
    }
    setBusy(true);
    setFailed("");
    try {
      await api("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ display_name: displayName.trim() || null }),
      });
      setName(null);
      setNameError("");
      await refresh();
      setNotice("Profile updated.");
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) {
      setFailed("New password needs at least 8 characters.");
      return;
    }
    setBusy(true);
    setFailed("");
    try {
      await api("/api/auth/me", {
        method: "PUT",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      setCurrent("");
      setNext("");
      setNotice("Password changed. Use it next time you log in.");
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : "Password change failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4">
        <span className="font-display flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-container)] text-2xl font-bold text-[var(--on-accent-container)]" aria-hidden>
          {initial}
        </span>
        <div className="min-w-0">
          <h1 className="font-display truncate text-3xl font-bold">{displayName || "Profile"}</h1>
          <p className="mt-0.5 truncate text-sm text-[var(--muted)]">
            <span className="font-mono text-xs">{user.email}</span> · {user.role}
          </p>
        </div>
      </div>
      <ErrorBoundary label="profile">
        <div className="paper-card mt-6 divide-y divide-[var(--border)] p-5 sm:p-6">
          <section className="pb-6" aria-labelledby="name-h">
            <h2 id="name-h" className="text-base font-semibold">Display name</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">Shown across the workspace. Anything under 100 characters.</p>
            <form onSubmit={saveName} className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                className="field flex-1"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                aria-label="Display name"
                maxLength={100}
              />
              <button className="btn-accent shrink-0 px-6 py-2.5 font-semibold" disabled={busy}>
                Save name
              </button>
            </form>
            <FieldError message={nameError} />
          </section>
          <section className="pt-6" aria-labelledby="pw-h">
            <h2 id="pw-h" className="text-base font-semibold">Change password</h2>
            <p className="mt-0.5 text-sm text-[var(--muted)]">You'll log in with the new one next time.</p>
            <form onSubmit={savePassword} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="min-w-0">
                <label className="text-sm font-semibold" htmlFor="current">Current password</label>
                <input id="current" type="password" autoComplete="current-password"
                  className="field mt-1.5" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div className="min-w-0">
                <label className="text-sm font-semibold" htmlFor="next">New password</label>
                <input id="next" type="password" autoComplete="new-password"
                  className="field mt-1.5" value={next} onChange={(e) => setNext(e.target.value)} placeholder="8+ characters" />
              </div>
              <div className="sm:col-span-2">
                <button className="btn-ghost w-full font-semibold sm:w-auto sm:px-6" disabled={busy}>
                  Change password
                </button>
              </div>
            </form>
          </section>
        </div>
        {notice ? <div className="mt-4"><Toast kind="success" message={notice} /></div> : null}
        {failed ? <div className="mt-4"><Toast kind="error" message={failed} /></div> : null}
      </ErrorBoundary>
    </div>
  );
}
