"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { PageHeader, ListShell } from "@/components/ui/PageShell";
import RefreshButton from "@/components/ui/RefreshButton";
import StatCard from "@/components/ui/StatCard";
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

  return (
    <div>
      <PageHeader
        title="Dashboard"
        actions={
          <>
            <RefreshButton onRefresh={loadDashboard} />
            <Link href="/new" className="btn-accent px-5 py-2.5 text-sm font-semibold">
              + New document
            </Link>
          </>
        }
      />

      {stats ? (
        <ErrorBoundary label="workspace stats">
          <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-label="Workspace stats">
          <StatCard label="Projects" value={projects?.length ?? 0} href="/projects" />
          <StatCard label="Documents" value={stats.docs} href="/projects" />
          <StatCard label="Exports" value={stats.exports} href="/exports" />
        </div>
        </ErrorBoundary>
      ) : null}

      <div className="mt-6">
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
            <div className="grid gap-4 md:grid-cols-3">
              {loadedProjects.map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className="paper-card rowlink lift block p-5"
                >
                  <h2 className="font-display text-xl font-bold">{project.title}</h2>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    {project.docCount} document{project.docCount === 1 ? "" : "s"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </ListShell>
        </ErrorBoundary>
      </div>
    </div>
  );
}
