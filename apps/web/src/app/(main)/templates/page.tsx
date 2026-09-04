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
  if (!items) return <div className="space-y-3"><SectionSkeleton /><SectionSkeleton /><SectionSkeleton /></div>;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold">Templates</h1>
      <p className="mt-1 text-[var(--muted)]">Twelve document types. Three tuned for the MVP, the rest work today.</p>
      <ul className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {items.map((t) => (
          <li key={t.type} className="flex flex-col gap-2 py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {t.title}
                {t.mvp ? (
                  <span className="bg-good-tint rounded-full px-2.5 py-0.5 text-xs font-semibold text-[var(--good)]">
                    Tuned
                  </span>
                ) : null}
              </p>
              <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">{t.description}</p>
              <p className="mt-1 font-mono text-xs text-[var(--muted)]">{t.sections.length} sections</p>
            </div>
            <Link
              href={`/new?type=${t.type}`}
              className="btn-ghost shrink-0 px-5 py-2 text-sm font-semibold"
              aria-label={`Start a ${t.title} document`}
            >
              Use template
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
