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
      <h1 className="font-display text-3xl font-bold">Profile</h1>
      <p className="mt-1 text-[var(--muted)]">
        Signed in as <span className="font-mono text-xs">{user.email}</span>, {user.role} account.
      </p>
      <ErrorBoundary label="profile">
        <div className="paper-card mt-6 divide-y divide-[var(--border)] p-5 sm:p-6">
          <section className="pb-6" aria-labelledby="name-h">
            <h2 id="name-h" className="text-base font-semibold">Display name</h2>
            <form onSubmit={saveName} className="mt-3 flex flex-col gap-3 sm:flex-row">
              <input
                className="field flex-1"
                value={displayName}
                onChange={(e) => setName(e.target.value)}
                placeholder="What should we call you?"
                aria-label="Display name"
                maxLength={100}
              />
              <button className="btn-accent px-6 font-semibold" disabled={busy}>
                Save name
              </button>
            </form>
            <FieldError message={nameError} />
          </section>
          <section className="pt-6" aria-labelledby="pw-h">
            <h2 id="pw-h" className="text-base font-semibold">Change password</h2>
            <form onSubmit={savePassword} className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-sm font-semibold" htmlFor="current">Current password</label>
                <input id="current" type="password" autoComplete="current-password"
                  className="field mt-1" value={current} onChange={(e) => setCurrent(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="next">New password</label>
                <input id="next" type="password" autoComplete="new-password"
                  className="field mt-1" value={next} onChange={(e) => setNext(e.target.value)} />
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
