"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Sidebar from "@/components/layout/Sidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();

  // Vercel/Next convention: navigation as an effect, never in render.
  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-16"><div className="skeleton h-8 w-1/3" /></main>;
  if (!user) return null;

  return (
    <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-6 py-6">
      <Sidebar />
      <main className="min-w-0 flex-1">
        {/* Page-level isolation: a crashing page shows a fallback, never a blank screen. */}
        <ErrorBoundary key={path} label="page">
          {/* Fresh route = gentle entrance (disabled under reduced motion). */}
          <div key={path} className="page-enter">
            {children}
          </div>
        </ErrorBoundary>
      </main>
    </div>
  );
}
