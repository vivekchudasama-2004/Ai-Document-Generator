"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { EmptyState, SectionSkeleton, Toast } from "@/components/ui/ui";

type Project = { id: string; title: string; slug: string; docCount: number };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [q, setQ] = useState("");
  const [error, setError] = useState("");

  async function load(query = "") {
    try {
      const r = await api<{ items: Project[] }>(`/api/projects?q=${encodeURIComponent(query)}`);
      setProjects(r.items);
    } catch {
      setError("Couldn't load projects.");
    }
  }

  useEffect(() => {
    load();
  }, []);

  if (error) return <Toast kind="error" message={error} />;
  if (!projects) return <SectionSkeleton />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-bold">Projects</h1>
        <input className="field max-w-xs" placeholder="Search projects…" value={q}
          onChange={(e) => { setQ(e.target.value); load(e.target.value); }} aria-label="Search projects" />
      </div>
      {!projects.length ? (
        <div className="mt-6">
          <EmptyState title={q ? "No matches" : "No projects yet"}
            hint={q ? "Try a different search." : "Projects group related documents together."}
            action={<Link href="/new" className="btn-accent px-6 py-2.5 text-sm font-semibold">New document</Link>} />
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white">
          {projects.map((p) => (
            <li key={p.id}>
              <Link href={`/projects/${p.id}`} className="rowlink flex items-center justify-between px-5 py-4">
                <span className="font-semibold">{p.title}</span>
                <span className="text-sm text-[var(--muted)]">{p.docCount} docs</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
