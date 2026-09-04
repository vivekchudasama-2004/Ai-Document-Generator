"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";

function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const next = useSearchParams().get("next") ?? "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failed, setFailed] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "Enter a valid email.";
    if (!password) errs.password = "Enter your password.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFailed("");
    try {
      await login(email, password);
      router.push(next);
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : "Login failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label className="text-sm font-semibold" htmlFor="email">Email</label>
        <input id="email" type="email" autoComplete="email" className="field mt-1"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <FieldError message={errors.email} />
      </div>
      <div>
        <div className="flex items-center justify-between">
          <label className="text-sm font-semibold" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="text-sm font-medium text-[var(--accent-ink)] hover:underline">
            Forgot password?
          </Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" className="field mt-1"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <FieldError message={errors.password} />
      </div>
      {failed ? <Toast kind="error" message={failed} /> : null}
      <button className="btn-accent w-full font-semibold" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
      <div className="divider" aria-hidden>
        <span>new here</span>
      </div>
      <Link href="/signup" className="btn-ghost block w-full py-2.5 text-center text-sm font-semibold">
        Create an account
      </Link>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto max-w-md px-5 py-10 sm:px-6 sm:py-16">
      <p className="font-display text-2xl font-bold">DocuForge</p>
      <h1 className="font-display mt-6 text-4xl font-bold leading-tight sm:text-5xl">
        Welcome back
      </h1>
      <p className="mt-2 text-[var(--muted)]">Your drafts kept every word.</p>
      <div className="paper-card mt-6 p-5 sm:mt-8 sm:p-6">
        <Suspense><LoginForm /></Suspense>
      </div>
    </main>
  );
}
