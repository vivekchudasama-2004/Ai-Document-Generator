"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setError("Enter a valid email.");
      return;
    }
    setError("");
    await api("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
    setSent(true);
  }

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <h1 className="font-display text-4xl font-bold">Reset password</h1>
      <div className="paper-card mt-8 space-y-4 p-6">
        {sent ? (
          <Toast kind="success" message="If that email exists, a 15-minute reset link is on its way." />
        ) : (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <label className="text-sm font-semibold" htmlFor="email">Email</label>
              <input id="email" type="email" className="field mt-1"
                value={email} onChange={(e) => setEmail(e.target.value)} />
              <FieldError message={error || undefined} />
            </div>
            <button className="btn-accent w-full font-semibold">Send reset link</button>
          </form>
        )}
        <p className="text-sm text-[var(--muted)]">
          <Link href="/login" className="underline">Back to login</Link>
        </p>
      </div>
    </main>
  );
}
