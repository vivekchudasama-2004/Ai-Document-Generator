"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";
import AuthShell from "@/components/layout/AuthShell";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [failed, setFailed] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("At least 8 characters.");
      return;
    }
    setError("");
    setFailed("");
    setBusy(true);
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  }

  if (!token)
    return (
      <div className="space-y-4">
        <Toast kind="error" message="This link is missing its token. Request a fresh one." />
        <Link href="/forgot-password" className="btn-accent block w-full py-3 text-center font-semibold">
          Get a new link
        </Link>
      </div>
    );
  if (done)
    return (
      <div className="space-y-4">
        <Toast kind="success" message="Password updated. You can log in now." />
        <Link href="/login" className="btn-accent block w-full py-3 text-center font-semibold">
          Log in
        </Link>
      </div>
    );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="text-sm font-semibold" htmlFor="password">New password</label>
        <input id="password" type="password" autoComplete="new-password" className="field mt-1.5"
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" />
        <FieldError message={error || undefined} />
      </div>
      {failed ? <Toast kind="error" message={failed} /> : null}
      <button className="btn-accent w-full py-3 font-semibold" disabled={busy}>
        {busy ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <AuthShell title="Choose a new password" lede="Almost there. One strong password and you're back in.">
      <Suspense><ResetForm /></Suspense>
      <p className="mt-4 text-center text-sm text-[var(--muted)]">
        <Link href="/login" className="nav-underline">Back to login</Link>
      </p>
    </AuthShell>
  );
}
