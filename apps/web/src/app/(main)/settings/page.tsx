"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";
import ManageModelsModal from "@/components/features/ModelModal";

type ModelsPayload = {
  defaults: Record<string, string>;
  models: { id: string; label: string; role: string; cost: string; available: boolean }[];
  detector: { mode: string; analyzer: string; demo_mode: boolean; sapling: boolean };
};

export default function SettingsPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [models, setModels] = useState<ModelsPayload | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api("/api/health"), api("/api/meta/models")])
      .then(([h, m]) => {
        setHealth(h as Record<string, unknown>);
        setModels(m as ModelsPayload);
      })
      .catch(() => setError("Couldn't reach the API. Is it running on :8000?"));
  }, []);

  if (error) return <Toast kind="error" message={error} />;
  if (!health || !models) return <SectionSkeleton />;

  const shortName = (modelId: string) => modelId.split("/").pop();
  const available = models.models.filter((m) => m.available).length;
  const envRows: [string, string, boolean][] = [
    ["Version", String(health.version), true],
    ["Detector", String(health.detector ?? models.detector.analyzer), true],
    ["Mode", models.detector.mode, true],
    ["Sapling blend", models.detector.sapling ? "on" : "off", models.detector.sapling],
    ["Writing service", health.nimReady ? "reachable" : "offline", Boolean(health.nimReady)],
    ["Database", health.db ? "connected" : "missing", Boolean(health.db)],
  ];

  return (
    <div className="max-w-2xl">
      <p className="kicker">Settings</p>
      <h1 className="font-display mt-2 text-balance text-3xl font-bold sm:text-4xl">How your workspace runs</h1>
      <p className="mt-2 text-[var(--muted)]">
        {shortName(models.defaults.generation)} writes · {shortName(models.defaults.humanize)} humanizes · {available} of {models.models.length} models up.
      </p>
      {models.detector.demo_mode ? (
        <div className="mt-4">
          <Toast kind="error" message="Demo mode is on: scores are estimates, not real detector verdicts." />
        </div>
      ) : null}

      <section className="paper-card mt-6 p-5 sm:p-6" aria-labelledby="env-h">
        <h2 id="env-h" className="font-display text-lg font-bold">Environment</h2>
        <dl className="mt-3 divide-y divide-[var(--border)] border-t border-[var(--border)]">
          {envRows.map(([k, v, ok]) => (
            <div key={k} className="flex items-center justify-between gap-3 py-3">
              <dt className="text-sm text-[var(--muted)]">{k}</dt>
              <dd className="flex min-w-0 items-center gap-2">
                <span className={`dot ${ok ? "dot-good" : "dot-ember"}`} aria-hidden />
                <span className="truncate font-mono text-xs">{v}</span>
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <h2 className="font-display mt-10 text-xl font-bold">Model catalog</h2>
      <ul className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {models.models.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3.5">
            <span
              className={`dot ${m.available ? "dot-good" : "dot-ember"} shrink-0`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs font-semibold">{m.id}</p>
              <p className="mt-0.5 text-xs text-[var(--muted)]">
                {m.label} · {m.role} · {m.cost}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">
              {m.available ? "Available" : "Off"}
            </span>
          </li>
        ))}
      </ul>

      <h2 id="models" className="font-display mt-10 scroll-mt-20 text-xl font-bold">Manage models</h2>
      <div className="paper-card mt-3 flex flex-wrap items-center justify-between gap-3 p-5 sm:p-6">
        <p className="max-w-[44ch] text-sm leading-relaxed text-[var(--muted)]">
          Toggle which of your key&apos;s models appear in the pickers. Opens as a dialog, right where you are.
        </p>
        <ManageModelsModal />
      </div>

      <p className="mt-8 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
        House rules: 150 words a page (±5) · human target 95%+ · three humanize passes max.
      </p>
    </div>
  );
}
