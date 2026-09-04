"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";

type Detail = {
  id: string; title: string; idea: string | null;
  documents: { id: string; title: string; type: string; status: string }[];
};

export default function ProjectDetail({ params }: { params: { id: string } }) {
  const { id } = params;
  const [doc, setDoc] = useState<Detail | null>(null);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    api<Detail>(`/api/projects/${id}`).then(setDoc).catch(() => setError("Project not found."));
  }, [id]);

  if (error) return <Toast kind="error" message={error} />;
  if (!doc) return <SectionSkeleton />;

  const query = search.trim().toLowerCase();
  const visibleDocs = query
    ? doc.documents.filter((d) => `${d.title} ${d.type} ${d.status}`.toLowerCase().includes(query))
    : doc.documents;

  return (
    <div>
      <p className="kicker">Project</p>
      <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display min-w-0 max-w-[22ch] text-balance text-3xl font-bold sm:text-4xl">{doc.title}</h1>
        <Link href="/new" className="btn-accent shrink-0 px-5 py-2.5 text-sm font-semibold">
          New document
        </Link>
      </div>
      {doc.idea ? <p className="mt-2 max-w-[62ch] leading-relaxed text-[var(--muted)]">{doc.idea}</p> : null}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">
          Documents <span className="font-mono text-sm font-medium text-[var(--muted)]">{visibleDocs.length}{query ? ` of ${doc.documents.length}` : ""}</span>
        </h2>
        {doc.documents.length > 3 ? (
          <input
            className="field max-w-52"
            type="search"
            placeholder="Search documents…"
            aria-label="Search documents in this project"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        ) : null}
      </div>
      {visibleDocs.length ? (
        <ul className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {visibleDocs.map((d, i) => (
            <li key={d.id}>
              <Link href={`/studio/${d.id}`} className="rowlink flex items-center gap-4 py-4">
                <span className="w-8 shrink-0 font-mono text-sm text-[var(--muted)]" aria-hidden>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{d.title}</span>
                <span className="pill hidden shrink-0 sm:inline-flex">{d.type}</span>
                <span className="shrink-0 text-sm capitalize text-[var(--muted)]">{d.status}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : query ? (
        <p className="mt-3 border-y border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
          No documents match “{search.trim()}”.
        </p>
      ) : (
        <p className="mt-3 border-y border-[var(--border)] py-8 text-center text-sm text-[var(--muted)]">
          No documents yet — your next draft lands here.
        </p>
      )}
    </div>
  );
}
