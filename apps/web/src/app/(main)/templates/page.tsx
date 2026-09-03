"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";

type Template = { type: string; title: string; description: string; mvp: boolean; sections: string[] };

export default function TemplatesPage() {
  const [items, setItems] = useState<Template[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ items: Template[] }>("/api/templates")
      .then((r) => setItems(r.items))
      .catch(() => setError("Couldn't load templates."));
  }, []);

  if (error) return <Toast kind="error" message={error} />;
  if (!items) return <div className="grid gap-4 md:grid-cols-3"><SectionSkeleton /><SectionSkeleton /><SectionSkeleton /></div>;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Templates</h1>
      <p className="mt-1 text-[var(--muted)]">Twelve document types. Three tuned for the MVP — the rest work today, refined next.</p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {items.map((t) => (
          <article key={t.type} className="paper-card flex flex-col p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold">{t.title}</h2>
              {t.mvp ? <span className="bg-good-tint rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--good)]">MVP</span> : null}
            </div>
            <p className="mt-1 text-sm text-[var(--muted)]">{t.description}</p>
            <p className="mt-3 text-xs text-[var(--muted)]">{t.sections.length} sections</p>
            <Link href={`/new?type=${t.type}`} className="btn-ghost mt-4 px-4 py-2 text-center text-sm font-semibold">
              Use template
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
