"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { PageHeader, ListShell } from "@/components/ui/PageShell";
import RefreshButton from "@/components/ui/RefreshButton";
import ErrorBoundary from "@/components/ui/ErrorBoundary";

type Project = { id: string; title: string; slug: string; docCount: number };
type WorkspaceStats = { docs: number; exports: number };

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stats, setStats] = useState<WorkspaceStats | null>(null);
  const [error, setError] = useState("");

  // Refetch everything: wired to RefreshButton and the error-state retry.
  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const [projectList, documentList, exportList] = await Promise.all([
        api<{ items: Project[] }>("/api/projects"),
        api<{ total: number }>("/api/documents?limit=1"),
        api<{ total: number }>("/api/exports?limit=1"),
      ]);
      setProjects(projectList.items);
      setStats({ docs: documentList.total ?? 0, exports: exportList.total ?? 0 });
    } catch {
      setError("Couldn't load the dashboard. Check the API is running.");
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const figures: [string, number, string][] = [
    ["Projects", projects?.length ?? 0, "/projects"],
    ["Documents", stats?.docs ?? 0, "/projects"],
    ["Exports", stats?.exports ?? 0, "/exports"],
  ];

  return (
    <div>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <RefreshButton onRefresh={loadDashboard} />
            <Link href="/new" className="btn-accent inline-flex items-center px-5 py-2.5 text-sm font-semibold">
              <span className="mr-1 inline-block text-base font-bold leading-none" aria-hidden>+</span>
              New document
            </Link>
          </>
        }
      />

      <ErrorBoundary label="workspace stats">
        <div
          className="mt-6 flex divide-x divide-[var(--border)] border-y border-[var(--border)]"
          aria-label="Workspace stats"
        >
          {figures.map(([label, value, href]) => (
            <Link key={label} href={href} className="rowlink min-w-0 flex-1 px-4 py-4 first:pl-0 sm:px-6">
              <p className="font-display text-3xl font-bold leading-none">{value}</p>
              <p className="mt-1 text-sm text-[var(--muted)]">{label}</p>
            </Link>
          ))}
        </div>
      </ErrorBoundary>

      <h2 className="font-display mt-8 text-xl font-bold">Recent projects</h2>
      <div className="mt-3">
        <ErrorBoundary label="project list">
        <ListShell
          items={projects}
          error={error}
          onRetry={loadDashboard}
          emptyTitle="A blank page, full of promise"
          emptyHint="Start with one of the tried examples — an e-commerce RDD, an AI SaaS PRD, or a technical design."
          emptyAction={
            <Link href="/new" className="btn-accent px-7 py-3 font-semibold">
              Draft your first doc
            </Link>
          }
        >
          {(loadedProjects) => (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {loadedProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="rowlink flex items-center justify-between gap-3 py-4"
                  >
                    <span className="min-w-0 truncate font-semibold">{project.title}</span>
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
