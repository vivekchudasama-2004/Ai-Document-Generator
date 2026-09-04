"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";
import AuthShell from "@/components/layout/AuthShell";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
      setSent(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Reset password" lede="A 15-minute link, sent to your inbox. It works once, then it's gone.">
      {sent ? (
        <div className="space-y-4">
          <Toast kind="success" message="If that email exists, a reset link is on its way." />
          <Link href="/login" className="btn-ghost block w-full py-3 text-center text-sm font-semibold">
            Back to login
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <label className="text-sm font-semibold" htmlFor="email">Email</label>
            <input id="email" type="email" autoComplete="email" className="field mt-1.5"
              value={email} onChange={(e) => setEmail(e.target.value)} />
            <FieldError message={error || undefined} />
          </div>
          <button className="btn-accent w-full py-3 font-semibold" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <p className="text-center text-sm text-[var(--muted)]">
            <Link href="/login" className="nav-underline">Back to login</Link>
          </p>
        </form>
      )}
    </AuthShell>
  );
}
