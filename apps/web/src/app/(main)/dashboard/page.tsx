"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api/client";
import { PageHeader, ListShell } from "@/components/ui/PageShell";
import RefreshButton from "@/components/ui/RefreshButton";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

type Project = { id: string; title: string; slug: string; docCount: number };
type WorkspaceStats = { projects: number; docs: number; exports: number };

const EXAMPLES = [
  { label: "E-commerce RDD", title: "E-commerce platform RDD", idea: "A marketplace for independent bookstores with shared inventory and one-day delivery." },
  { label: "AI SaaS PRD", title: "AI invoicing SaaS PRD", idea: "An AI assistant that drafts, sends, and chases invoices for freelancers." },
  { label: "Technical design", title: "Realtime sync design", idea: "Offline-first document sync across web and mobile with conflict resolution." },
];

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [error, setError] = useState("");

  // Two cheap calls: project rows for recents, COUNT-only stats for figures.
  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const [projectList, totals] = await Promise.all([
        api<{ items: Project[] }>("/api/projects"),
        api<{ projects: number; documents: number; exports: number }>("/api/stats"),
      ]);
      setProjects(projectList.items);
      setStats({ projects: totals.projects, docs: totals.documents, exports: totals.exports });
    } catch {
      setError("Couldn't load the dashboard. Check the API is running.");
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const firstName = user?.display_name?.split(" ")[0] ?? null;
  const figures: [string, number, string][] = [
    ["Projects", stats?.projects ?? 0, "/projects"],
    ["Documents", stats?.docs ?? 0, "/projects"],
    ["Exports", stats?.exports ?? 0, "/exports"],
  ];

  return (
    <div>
      <PageHeader
        title={firstName ? `Good to see you, ${firstName}` : "Dashboard"}
        description="Everything you're writing, and where it stands."
        actions={
          <>
            <RefreshButton onRefresh={loadDashboard} />
            <Link href="/new" className="btn-accent inline-flex items-center px-5 py-2.5 text-sm font-semibold">
              <span className="mr-1.5 inline-block text-base font-bold leading-none" aria-hidden>+</span>
              New document
            </Link>
          </>
        }
      />

      <ErrorBoundary label="workspace stats">
        <dl
          className="mt-8 grid grid-cols-3 gap-3 border-t border-[var(--border)] pt-6 sm:gap-6"
          aria-label="Workspace stats"
        >
          {figures.map(([label, value, href]) => (
            <div key={label} className="min-w-0">
              <dt className="sr-only">{label}</dt>
              <dd>
                <Link href={href} className="figure rowlink inline-block px-1 text-3xl sm:text-5xl">
                  {value}
                </Link>
              </dd>
              <dd className="mt-1.5 text-xs text-[var(--muted)] sm:text-sm">{label}</dd>
            </div>
          ))}
        </dl>
      </ErrorBoundary>

      <div className="mt-10 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-bold">Recent projects</h2>
        <Link href="/projects" className="nav-underline shrink-0 text-sm font-semibold text-[var(--accent-ink)]">
          View all
        </Link>
      </div>
      <div className="mt-3">
        <ErrorBoundary label="project list">
        <ListShell
          items={projects}
          error={error}
          onRetry={loadDashboard}
          emptyTitle="A blank page, full of promise"
          emptyHint="Start with one of the tried examples — an e-commerce RDD, an AI SaaS PRD, or a technical design."
          emptyAction={
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <Link
                  key={ex.label}
                  href={`/new?title=${encodeURIComponent(ex.title)}&idea=${encodeURIComponent(ex.idea)}`}
                  className="btn-ghost px-6 py-2.5 text-sm font-semibold"
                >
                  Try the {ex.label.toLowerCase()}
                </Link>
              ))}
            </div>
          }
        >
          {(loadedProjects) => (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {loadedProjects.slice(0, 5).map((project, i) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="rowlink flex items-center gap-4 py-4"
                  >
                    <span className="w-8 shrink-0 font-mono text-sm text-[var(--muted)]" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold">{project.title}</span>
                    <span className="shrink-0 text-sm text-[var(--muted)]">
                      {project.docCount} document{project.docCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ListShell>
        </ErrorBoundary>
      </div>
    </div>
  );
}
