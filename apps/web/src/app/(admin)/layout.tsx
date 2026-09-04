"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import Sidebar, { MobileBar } from "@/components/layout/Sidebar";

/** Same shell as (main): sidebar + contained width, so /admin never touches the viewport edges. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading) return <main className="mx-auto max-w-5xl px-6 py-16"><div className="skeleton h-8 w-1/3" /></main>;
  if (!user) return null;

  return (
    <>
      <MobileBar />
      <div className="mx-auto flex min-h-screen max-w-6xl gap-6 px-4 py-6 sm:px-6">
        <Sidebar />
        <main className="min-w-0 flex-1">
          <ErrorBoundary key={path} label="page">
            <div key={path} className="page-enter">
              {children}
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </>
  );
}
