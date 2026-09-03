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
        title="Projects"
        actions={
          <>
            <input
              className="field max-w-xs"
              placeholder="Search projects…"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                loadProjects(event.target.value);
              }}
              aria-label="Search projects"
            />
            <RefreshButton onRefresh={() => loadProjects(search)} />
          </>
        }
      />
      <div className="mt-6">
        <ListShell
          items={projects}
          error={error}
          onRetry={() => loadProjects(search)}
          emptyTitle={search ? "No matches" : "No projects yet"}
          emptyHint={search ? "Try a different search." : "Projects group related documents together."}
          emptyAction={
            <Link href="/new" className="btn-accent px-6 py-2.5 text-sm font-semibold">
              New document
            </Link>
          }
        >
          {(loadedProjects) => (
            <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-surface">
              {loadedProjects.map((project) => (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="rowlink flex items-center justify-between px-5 py-4"
                  >
                    <span className="font-semibold">{project.title}</span>
                    <span className="text-sm text-[var(--muted)]">{project.docCount} docs</span>
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
