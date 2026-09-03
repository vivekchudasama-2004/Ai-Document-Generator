"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { EmptyState, SectionSkeleton, Toast } from "@/components/ui/ui";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type Export = { id: string; format: string; secure_url: string | null; pages: number | null; created_at: string };

export default function ExportsPage() {
  const [items, setItems] = useState<Export[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: Export[] }>("/api/exports")
      .then((r) => setItems(r.items))
      .catch(() => setError("Couldn't load exports."));
  }, []);

  if (error) return <Toast kind="error" message={error} />;
  if (!items) return <SectionSkeleton />;
  if (!items.length)
    return (
      <EmptyState title="Nothing exported yet"
        hint="Finish a document in the studio, hit Export PDF, and it will land here."
        action={<span className="text-sm text-[var(--muted)]">Your download shelf is ready.</span>} />
    );

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Exports</h1>
      <ul className="mt-6 divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-white">
        {items.map((e) => (
          <li key={e.id} className="flex items-center justify-between gap-3 px-5 py-4">
            <div>
              <p className="font-semibold uppercase">{e.format}</p>
              <p className="text-sm text-[var(--muted)]">
                {e.pages ? `${e.pages} pages · ` : ""}{new Date(e.created_at).toLocaleString()}
              </p>
            </div>
            <a className="btn-ghost px-4 py-2 text-sm font-semibold"
              href={e.secure_url ?? `${API_BASE}/api/exports/${e.id}/download`}
              target="_blank" rel="noreferrer">
              Download
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
