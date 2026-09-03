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
      <p className="mt-1 text-[var(--muted)]">Your account, in one place.</p>
      <ErrorBoundary label="profile">
        <section className="paper-card mt-6 p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Account</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">Email</dt>
              <dd className="min-w-0 break-all font-mono text-xs">{user.email}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">Role</dt>
              <dd className="font-semibold capitalize">{user.role}</dd>
            </div>
          </dl>
        </section>
        <section className="paper-card mt-4 p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Display name</h2>
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
              Save
            </button>
          </form>
          <FieldError message={nameError} />
        </section>
        <section className="paper-card mt-4 p-5 sm:p-6">
          <h2 className="font-display text-lg font-bold">Change password</h2>
          <form onSubmit={savePassword} className="mt-3 space-y-3">
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
            <button className="btn-ghost w-full font-semibold sm:w-auto sm:px-6" disabled={busy}>
              Change password
            </button>
          </form>
        </section>
        {notice ? <div className="mt-4"><Toast kind="success" message={notice} /></div> : null}
        {failed ? <div className="mt-4"><Toast kind="error" message={failed} /></div> : null}
      </ErrorBoundary>
    </div>
  );
}
