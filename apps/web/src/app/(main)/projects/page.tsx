"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { PageHeader, ListShell } from "@/components/ui/PageShell";
import RefreshButton from "@/components/ui/RefreshButton";

type Project = { id: string; title: string; slug: string; docCount: number };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const loadProjects = useCallback(async (query = "") => {
    setError("");
    try {
      const response = await api<{ items: Project[] }>(
        `/api/projects?q=${encodeURIComponent(query)}`,
      );
      setProjects(response.items);
    } catch {
      setError("Couldn't load projects.");
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div>
      <PageHeader
        kicker="Workspace"
        title="Projects"
        description={projects?.length ? `${projects.length} project${projects.length === 1 ? "" : "s"} and counting.` : "Group related documents together."}
        actions={
          <Link href="/new" className="btn-accent inline-flex items-center px-5 py-2.5 text-sm font-semibold">
            <span className="mr-1.5 inline-block text-base font-bold leading-none" aria-hidden>+</span>
            New document
          </Link>
        }
      />
      <div className="mt-6 flex items-center gap-2">
        <input
          className="field max-w-xs"
          placeholder="Search projects…"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            loadProjects(event.target.value);
          }}
          aria-label="Search projects"
          type="search"
        />
        <RefreshButton onRefresh={() => loadProjects(search)} />
      </div>
      <div className="mt-4">
        <ListShell
          items={projects}
          error={error}
          onRetry={() => loadProjects(search)}
          emptyTitle={search ? "No matches" : "No projects yet"}
          emptyHint={search ? "Try a different search." : "Your first document creates your first project."}
          emptyAction={
            <Link href="/new" className="btn-accent px-6 py-2.5 text-sm font-semibold">
              New document
            </Link>
          }
        >
          {(loadedProjects) => (
            <ul className="divide-y divide-[var(--border)] border-y border-[var(--border)]">
              {loadedProjects.map((project, i) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="rowlink flex items-center gap-4 py-4"
                    aria-label={`${project.title}, ${project.docCount} documents`}
                  >
                    <span className="w-8 shrink-0 font-mono text-sm text-[var(--muted)]" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{project.title}</span>
                      <span className="block truncate font-mono text-xs text-[var(--muted)]">{project.slug}</span>
                    </span>
                    <span className="pill shrink-0">
                      {project.docCount} doc{project.docCount === 1 ? "" : "s"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ListShell>
      </div>
    </div>
  );
}
