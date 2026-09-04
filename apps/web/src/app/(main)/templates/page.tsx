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

  const tuned = items.filter((t) => t.mvp).length;

  return (
    <div>
      <p className="kicker">Templates</p>
      <h1 className="font-display mt-2 text-balance text-3xl font-bold sm:text-4xl">Twelve ways to start</h1>
      <p className="mt-2 max-w-[60ch] text-[var(--muted)]">
        {tuned} tuned for the MVP, the rest work today — each with its own section outline and diagrams.
      </p>
      <ul className="mt-8 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {items.map((t, i) => (
          <li key={t.type} className="flex flex-col gap-3 py-5 sm:flex-row sm:items-center sm:gap-6">
            <span className="hidden w-8 shrink-0 font-mono text-sm text-[var(--muted)] sm:block" aria-hidden>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-semibold">
                {t.title}
                {t.mvp ? (
                  <span className="bg-good-tint rounded-full px-2.5 py-0.5 text-xs font-semibold text-[var(--good)]">
                    Tuned
                  </span>
                ) : null}
              </p>
              <p className="mt-1 max-w-[62ch] text-sm leading-relaxed text-[var(--muted)]">{t.description}</p>
              <p className="mt-1.5 font-mono text-xs text-[var(--muted)]">
                {t.sections.length} sections · {t.sections.slice(0, 3).join(" · ")}
                {t.sections.length > 3 ? " · …" : ""}
              </p>
            </div>
            <Link
              href={`/new?type=${t.type}`}
              className="btn-ghost shrink-0 px-5 py-2.5 text-center text-sm font-semibold"
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
