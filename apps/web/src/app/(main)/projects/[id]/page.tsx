"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";

type Detail = {
  id: string; title: string; idea: string | null;
  documents: { id: string; title: string; type: string; status: string }[];
};

export default function ProjectDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<Detail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<Detail>(`/api/projects/${id}`).then(setDoc).catch(() => setError("Project not found."));
  }, [id]);

  if (error) return <Toast kind="error" message={error} />;
  if (!doc) return <SectionSkeleton />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">{doc.title}</h1>
      {doc.idea ? <p className="mt-1 text-[var(--muted)]">{doc.idea}</p> : null}
      <h2 className="font-display mt-8 text-xl font-bold">Documents</h2>
      <ul className="mt-3 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white">
        {doc.documents.map((d) => (
          <li key={d.id}>
            <Link href={`/studio/${d.id}`} className="rowlink flex items-center justify-between px-5 py-4">
              <span className="font-semibold">{d.title}</span>
              <span className="text-sm text-[var(--muted)]">{d.type} · {d.status}</span>
            </Link>
          </li>
        ))}
      </ul>
      {!doc.documents.length ? <p className="mt-3 text-sm text-[var(--muted)]">No documents yet.</p> : null}
    </div>
  );
}
