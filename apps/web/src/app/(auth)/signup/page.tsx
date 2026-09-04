"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";
import AuthShell from "@/components/layout/AuthShell";

export default function SignupPage() {
  const { signup } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failed, setFailed] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errs.email = "Enter a valid email.";
    if (password.length < 8) errs.password = "At least 8 characters.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFailed("");
    try {
      await signup(email, password, name || undefined);
      router.push("/dashboard");
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : "Signup failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Start your first doc" lede="Free to begin. Ninety seconds from a one-line idea to a scored draft.">
      <form onSubmit={submit} className="space-y-4" noValidate>
        <div>
          <label className="text-sm font-semibold" htmlFor="name">Display name <span className="font-normal text-[var(--muted)]">(optional)</span></label>
          <input id="name" autoComplete="name" className="field mt-1.5" value={name}
            onChange={(e) => setName(e.target.value)} placeholder="What should we call you?" />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="field mt-1.5"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <FieldError message={errors.email} />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" className="field mt-1.5"
            value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8+ characters" />
          <FieldError message={errors.password} />
        </div>
        {failed ? <Toast kind="error" message={failed} /> : null}
        <button className="btn-accent w-full py-3 font-semibold" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <div className="divider" aria-hidden>
          <span>have an account</span>
        </div>
        <Link href="/login" className="btn-ghost block w-full py-3 text-center text-sm font-semibold">
          Log in
        </Link>
      </form>
    </AuthShell>
  );
}
