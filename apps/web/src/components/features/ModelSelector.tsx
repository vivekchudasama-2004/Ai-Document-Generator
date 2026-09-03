"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";

export type ModelInfo = {
  id: string;
  label: string;
  role: string;
  cost: string;
  available: boolean;
  default: boolean;
};

export type ModelChoice = { generation: string; humanize: string };

const AUTO_VALUE = "auto";

/**
 * Model picker (opencode-style): Auto default, and ONLY models your key
 * can actually call. When NVIDIA reachability is unknown (offline/mock),
 * the static catalog stands in with a note.
 */
export default function ModelSelector({
  value,
  onChange,
}: {
  value: ModelChoice;
  onChange: (v: ModelChoice) => void;
}) {
  const [catalog, setCatalog] = useState<ModelInfo[]>([]);
  const [enabledExtra, setEnabledExtra] = useState<ModelInfo[]>([]);
  const [liveIds, setLiveIds] = useState<string[] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ defaults: { generation: string; humanize: string }; models: ModelInfo[] }>(
        "/api/meta/models",
      ),
      api<{ items: ModelInfo[] }>("/api/models/enabled"),
      api<{ live: boolean; models: { id: string }[] }>("/api/models/available").catch(() => ({
        live: false,
        models: [],
      })),
    ])
      .then(([meta, enabled, available]) => {
        const known = new Set(meta.models.map((model) => model.id));
        setCatalog(meta.models);
        setEnabledExtra(
          enabled.items
            .filter((model) => !known.has(model.id))
            .map((model) => ({
              id: model.id,
              label: model.id.split("/").pop()?.replace(/-/g, " ") ?? model.id,
              role: "both",
              cost: "custom",
              available: true,
              default: false,
            })),
        );
        // Live list wins: drop anything your key cannot call right now.
        setLiveIds(available.live ? available.models.map((model) => model.id) : null);
        if (!available.live) {
          setNote("Live availability unknown — showing the full catalog.");
        }
        onChange({
          generation: value.generation || AUTO_VALUE,
          humanize: value.humanize || AUTO_VALUE,
        });
      })
      .catch(() => {
        setNote("Model list unavailable — Auto will be used.");
        onChange({ generation: AUTO_VALUE, humanize: AUTO_VALUE });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // OpenCode-style rule: unavailable models are removed, never greyed out.
  const reachable = (model: ModelInfo) =>
    model.available && (liveIds === null || liveIds.includes(model.id));

  const generationPool = [...catalog, ...enabledExtra].filter(
    (model) => (model.role === "generate" || model.role === "both") && reachable(model),
  );
  const humanizePool = [...catalog, ...enabledExtra].filter(
    (model) => (model.role === "humanize" || model.role === "both") && reachable(model),
  );

  const pick = (
    label: string,
    options: ModelInfo[],
    current: string,
    field: keyof ModelChoice,
    autoHint: string,
  ) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <select
        className="field mt-1"
        value={current || AUTO_VALUE}
        onChange={(event) => onChange({ ...value, [field]: event.target.value })}
      >
        <option value={AUTO_VALUE}>Auto (recommended) — {autoHint}</option>
        {options.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label} · {model.cost}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {pick("Writing model", generationPool, value.generation, "generation", "cheapest fit")}
        {pick("Humanizing model", humanizePool, value.humanize, "humanize", "8B default")}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          {liveIds === null
            ? (note || "Auto reads your brief and picks the cheapest capable model.")
            : `${liveIds.length} models reachable on your key right now.`}
        </p>
        <Link href="/settings#models" className="text-xs font-semibold underline underline-offset-2">
          Manage models
        </Link>
      </div>
    </div>
  );
}
