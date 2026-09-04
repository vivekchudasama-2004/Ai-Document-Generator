"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";
import AuthShell from "@/components/layout/AuthShell";

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
        <input id="email" type="email" autoComplete="email" className="field mt-1.5"
          value={email} onChange={(e) => setEmail(e.target.value)} />
        <FieldError message={errors.email} />
      </div>
      <div>
        <div className="flex items-center justify-between gap-2">
          <label className="text-sm font-semibold" htmlFor="password">Password</label>
          <Link href="/forgot-password" className="nav-underline text-sm font-medium text-[var(--accent-ink)]">
            Forgot password?
          </Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" className="field mt-1.5"
          value={password} onChange={(e) => setPassword(e.target.value)} />
        <FieldError message={errors.password} />
      </div>
      {failed ? <Toast kind="error" message={failed} /> : null}
      <button className="btn-accent w-full py-3 font-semibold" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
      <div className="divider" aria-hidden>
        <span>new here</span>
      </div>
      <Link href="/signup" className="btn-ghost block w-full py-3 text-center text-sm font-semibold">
        Create an account
      </Link>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" lede="Your drafts kept every word. Pick up exactly where you left off.">
      <Suspense><LoginForm /></Suspense>
    </AuthShell>
  );
}
