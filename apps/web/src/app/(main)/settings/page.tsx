"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { SectionSkeleton, Toast } from "@/components/ui/ui";
import ModelManager from "@/components/features/ModelManager";

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

  const envRows: [string, string][] = [
    ["Version", String(health.version)],
    ["Detector", String(health.detector ?? models.detector.analyzer)],
    ["Mode", models.detector.mode],
    ["Sapling blend", models.detector.sapling ? "on" : "off"],
    ["Writing service", health.nimReady ? "reachable" : "offline"],
    ["Database", health.db ? "connected" : "missing"],
  ];

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-[var(--muted)]">
        Defaults: {models.defaults.generation} writes, {models.defaults.humanize} humanizes.
      </p>
      {models.detector.demo_mode ? (
        <div className="mt-4">
          <Toast kind="error" message="Demo mode is on: scores are estimates, not real detector verdicts." />
        </div>
      ) : null}

      <h2 className="font-display mt-8 text-xl font-bold">Environment</h2>
      <dl className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {envRows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-3 py-3">
            <dt className="text-sm text-[var(--muted)]">{k}</dt>
            <dd className="font-mono text-xs">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="font-display mt-8 text-xl font-bold">Model catalog</h2>
      <ul className="mt-3 divide-y divide-[var(--border)] border-y border-[var(--border)]">
        {models.models.map((m) => (
          <li key={m.id} className="flex items-center gap-3 py-3">
            <span
              className={`dot ${m.available ? "dot-good" : "dot-ember"} shrink-0`}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-mono text-xs font-semibold">{m.id}</p>
              <p className="text-xs text-[var(--muted)]">
                {m.label}, {m.role}, {m.cost}
              </p>
            </div>
            <span className="shrink-0 text-xs font-semibold text-[var(--muted)]">
              {m.available ? "Available" : "Off"}
            </span>
          </li>
        ))}
      </ul>

      <h2 id="models" className="font-display mt-8 scroll-mt-20 text-xl font-bold">Manage models</h2>
      <div className="mt-3">
        <ModelManager />
      </div>

      <p className="mt-8 border-t border-[var(--border)] pt-4 text-sm text-[var(--muted)]">
        House rules: 150 words a page (±5), human target 95%+, three humanize passes max.
      </p>
    </div>
  );
}
