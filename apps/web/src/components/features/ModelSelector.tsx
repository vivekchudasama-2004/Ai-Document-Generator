"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import ManageModelsModal from "@/components/features/ModelModal";

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

  // Reloadable: the Manage-models modal closes without unmounting us,
  // so enabled ids must refresh on close (not just on first mount).
  const load = useCallback(async () => {
    const [meta, enabled, available] = await Promise.all([
      api<{ defaults: { generation: string; humanize: string }; models: ModelInfo[] }>(
        "/api/meta/models",
      ),
      api<{ items: ModelInfo[] }>("/api/models/enabled"),
      api<{ live: boolean; models: { id: string }[] }>("/api/models/available").catch(() => ({
        live: false,
        models: [],
      })),
    ]);
    const known = new Set(meta.models.map((model) => model.id));
    setCatalog(meta.models);
    setEnabledExtra(
      enabled.items
        .filter((model) => !known.has(model.id))
        .map((model) => ({ ...model, available: true, default: false })),
    );
    // Live list wins: anything your key can't call right now is removed
    // from the picker entirely (opencode-style — never greyed out).
    setLiveIds(available.live ? available.models.map((model) => model.id) : null);
    if (!available.live) {
      setNote("Live check off (no NVIDIA key on the server) — showing the catalog.");
    }
  }, []);

  useEffect(() => {
    load()
      .then(() => {
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
  }, [load]);

  // Union, not intersection: the curated catalog is always pickable (the
  // server validates on use and auto-falls back). The live list only marks
  // reachability — intersecting nuked the curated ids whenever NVIDIA
  // renames builds, leaving Auto as the sole option.
  const deduped = (() => {
    const seen = new Set<string>();
    return [...catalog, ...enabledExtra].filter((model) =>
      seen.has(model.id) ? false : (seen.add(model.id), true),
    );
  })();

  const generationPool = deduped.filter(
    (model) => model.role === "generate" || model.role === "both",
  );
  const humanizePool = deduped.filter(
    (model) => model.role === "humanize" || model.role === "both",
  );

  // Reachable first: when the live list is known, models your key can call
  // right now (plus your own BYOK keys, which the live list can't see) sort
  // above the unreachable ones — no more scrolling past dead options.
  const byokId = (id: string) => id.startsWith("groq/") || id.startsWith("openrouter/") || id.startsWith("custom/");
  const reachableFirst = (models: ModelInfo[]) =>
    liveIds === null
      ? models
      : [...models].sort((a, b) => {
          const ra = liveIds.includes(a.id) || byokId(a.id) ? 0 : 1;
          const rb = liveIds.includes(b.id) || byokId(b.id) ? 0 : 1;
          return ra - rb;
        });

  const liveSuffix = (model: ModelInfo) =>
    liveIds !== null && !liveIds.includes(model.id) && !byokId(model.id)
      ? " · unreachable now"
      : "";

  const pick = (
    label: string,
    options: ModelInfo[],
    current: string,
    field: keyof ModelChoice,
  ) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <select
        className="field mt-1"
        value={current || AUTO_VALUE}
        onChange={(event) => onChange({ ...value, [field]: event.target.value })}
      >
        <option value={AUTO_VALUE}>Auto (recommended)</option>
        {options.map((model) => (
          <option key={model.id} value={model.id} title={model.id}>
            {model.label}, {model.cost}
            {liveSuffix(model)}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div>
      <div className="grid gap-3 md:grid-cols-2">
        {pick("Writing model", reachableFirst(generationPool), value.generation, "generation")}
        {pick("Humanizing model", reachableFirst(humanizePool), value.humanize, "humanize")}
      </div>
      <div className="mt-2 flex items-center justify-between gap-3">
        <p className="text-xs text-[var(--muted)]">
          {liveIds === null
            ? (note || "Auto reads your brief and picks the cheapest capable model.")
            : `${liveIds.length} models reachable on your key right now.`}
        </p>
        <ManageModelsModal onChanged={() => load().catch(() => {})} />
      </div>
    </div>
  );
}
