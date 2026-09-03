"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ApiError } from "@/lib/api/client";
import { FieldError, Toast } from "@/components/ui/ui";

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
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="font-display text-2xl font-bold">DocuForge</p>
      <h1 className="font-display mt-6 text-4xl font-bold">Start your first doc</h1>
      <p className="mt-2 text-[var(--muted)]">Free to begin. Ninety seconds to a draft.</p>
      <form onSubmit={submit} className="paper-card mt-8 space-y-4 p-6" noValidate>
        <div>
          <label className="text-sm font-semibold" htmlFor="name">Display name (optional)</label>
          <input id="name" className="field mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="email">Email</label>
          <input id="email" type="email" autoComplete="email" className="field mt-1"
            value={email} onChange={(e) => setEmail(e.target.value)} />
          <FieldError message={errors.email} />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete="new-password" className="field mt-1"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <FieldError message={errors.password} />
        </div>
        {failed ? <Toast kind="error" message={failed} /> : null}
        <button className="btn-accent w-full font-semibold" disabled={busy}>
          {busy ? "Creating…" : "Create account"}
        </button>
        <p className="text-sm text-[var(--muted)]">
          Have an account? <Link href="/login" className="underline">Log in</Link>
        </p>
      </form>
    </main>
  );
}
