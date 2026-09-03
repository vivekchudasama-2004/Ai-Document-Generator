"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { EmptyState, SectionSkeleton, Toast } from "@/components/ui/ui";

type Project = { id: string; title: string; slug: string; docCount: number };

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: Project[] }>("/api/projects")
      .then((r) => setProjects(r.items))
      .catch(() => setError("Couldn't load projects. Check the API is running."));
  }, []);

  if (error) return <div className="max-w-xl"><Toast kind="error" message={error} /></div>;
  if (!projects) return <div className="grid gap-4 md:grid-cols-3"><SectionSkeleton /><SectionSkeleton /><SectionSkeleton /></div>;

  if (!projects.length)
    return (
      <EmptyState
        title="A blank page, full of promise"
        hint="Start with one of the three tried examples — an e-commerce RDD, an AI SaaS PRD, or a technical design."
        action={<Link href="/new" className="btn-accent px-7 py-3 font-semibold">Draft your first doc</Link>}
      />
    );

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">Dashboard</h1>
        <Link href="/new" className="btn-accent px-5 py-2.5 text-sm font-semibold">+ New document</Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {projects.map((p) => (
          <Link key={p.id} href={`/projects/${p.id}`} className="paper-card rowlink block p-5">
            <h2 className="font-display text-xl font-bold">{p.title}</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">{p.docCount} document{p.docCount === 1 ? "" : "s"}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
