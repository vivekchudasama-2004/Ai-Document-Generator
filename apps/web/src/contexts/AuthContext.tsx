"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, setToken } from "@/lib/api/client";

export type User = { id: string; email: string; display_name: string | null; role: string };

const PUBLIC_PAGES = ["/", "/login", "/signup", "/forgot-password", "/reset-password"];

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, display_name?: string) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Public pages never need a session: don't probe /me, don't bounce to /login.
    if (PUBLIC_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))) {
      setUser(null);
      setLoading(false);
      return;
    }
    api<User>("/api/auth/me")
      .then((u) => setUser(u))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [pathname]);

  const login = useCallback(async (email: string, password: string) => {
    const pair = await api<{ access_token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    setToken(pair.access_token);
    setUser(await api<User>("/api/auth/me"));
  }, []);

  const signup = useCallback(async (email: string, password: string, display_name?: string) => {
    const pair = await api<{ access_token: string }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, display_name }),
    });
    setToken(pair.access_token);
    setUser(await api<User>("/api/auth/me"));
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  return <Ctx.Provider value={{ user, loading, login, signup, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
