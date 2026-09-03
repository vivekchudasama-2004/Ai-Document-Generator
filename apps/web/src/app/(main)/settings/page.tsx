"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";
import ModelManager from "@/components/features/ModelManager";

export default function SettingsPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [models, setModels] = useState<{
    defaults: Record<string, string>;
    models: { id: string; label: string; role: string; cost: string; available: boolean }[];
    detector: { mode: string; analyzer: string; demo_mode: boolean; sapling: boolean };
  } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/health"), api("/api/meta/models")])
      .then(([h, m]) => {
        setHealth(h as Record<string, unknown>);
        setModels(m as typeof models);
      })
      .catch(() => setError("Couldn't reach the API. Is it running on :8000?"));
  }, []);

  if (error) return <Toast kind="error" message={error} />;
  if (!health || !models) return <SectionSkeleton />;

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      {models.detector.demo_mode ? (
        <div className="mt-4">
          <Toast kind="error" message="Demo mode is on: scores are estimates, not real detector verdicts." />
        </div>
      ) : null}
      <section className="paper-card mt-6 p-5">
        <h2 className="font-display text-lg font-bold">Environment</h2>
        <dl className="mt-3 space-y-2 text-sm">
          {Object.entries({ version: health.version, detector: health.detector, nimReady: health.nimReady, db: health.db }).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3">
              <dt className="text-[var(--muted)]">{k}</dt>
              <dd className="font-mono text-xs">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section className="paper-card mt-4 p-5">
        <h2 className="font-display text-lg font-bold">Model catalog</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Defaults: {models.defaults.generation} (write) · {models.defaults.humanize} (humanize)
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {models.models.map((m) => (
            <li key={m.id} className="flex items-center justify-between gap-3 rounded-lg border border-[var(--border)] px-3 py-2">
              <span className="font-mono text-xs">{m.id}</span>
              <span className="text-[var(--muted)]">{m.role} · {m.cost} · {m.available ? "available" : "off"}</span>
            </li>
          ))}
        </ul>
      </section>
      <section id="models" className="paper-card mt-4 scroll-mt-20 p-5">
        <h2 className="font-display text-lg font-bold">Manage models</h2>
        <div className="mt-3">
          <ModelManager />
        </div>
      </section>
      <section className="paper-card mt-4 p-5 text-sm text-[var(--muted)]">
        House rules: 150 words a page (±5), human target 95%+, three humanize passes max.
      </section>
    </div>
  );
}
