"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { api } from "@/lib/api/client";
import { ApiError } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";

function ResetForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [failed, setFailed] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      setError("At least 8 characters.");
      return;
    }
    setError("");
    setFailed("");
    try {
      await api("/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      setDone(true);
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : "Reset failed.");
    }
  }

  if (!token) return <Toast kind="error" message="This link is missing its token. Request a fresh one." />;
  if (done)
    return (
      <Toast kind="success" message="Password updated. You can log in now." />
    );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="text-sm font-semibold" htmlFor="password">New password</label>
        <input id="password" type="password" autoComplete="new-password" className="field mt-1"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <FieldError message={error || undefined} />
      </div>
      {failed ? <Toast kind="error" message={failed} /> : null}
      <button className="btn-accent w-full font-semibold">Set new password</button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl font-bold">Choose a new password</h1>
      <div className="paper-card mt-8 space-y-4 p-6">
        <Suspense><ResetForm /></Suspense>
        <p className="text-sm text-[var(--muted)]">
          <Link href="/login" className="underline">Back to login</Link>
        </p>
      </div>
    </main>
  );
}
