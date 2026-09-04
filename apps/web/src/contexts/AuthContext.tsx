"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { api, setToken } from "@/lib/api/client";

export type User = { id: string; email: string; display_name: string | null; role: string };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, display_name?: string) => Promise<void>;
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    // Every page probes the session (public ones too, without redirect): the
    // landing header adapts for signed-in users, and the 7-day refresh cookie
    // keeps them signed in across reloads until they log out.
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

  const refresh = useCallback(async () => {
    setUser(await api<User>("/api/auth/me"));
  }, []);

  const logout = useCallback(async () => {
    await api("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    setUser(null);
    window.location.href = "/login";
  }, []);

  return <Ctx.Provider value={{ user, loading, login, signup, refresh, logout }}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth outside provider");
  return ctx;
}
