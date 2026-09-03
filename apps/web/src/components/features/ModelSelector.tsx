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

function describeEnabled(id: string): ModelInfo {
  return {
    id,
    label: id.split("/").pop()?.replace(/-/g, " ") ?? id,
    role: "both",
    cost: "custom",
    available: true,
    default: false,
  };
}

export default function ModelSelector({
  value,
  onChange,
}: {
  value: ModelChoice;
  onChange: (v: ModelChoice) => void;
}) {
  const [catalog, setCatalog] = useState<ModelInfo[]>([]);
  const [enabledExtra, setEnabledExtra] = useState<ModelInfo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api<{ defaults: { generation: string; humanize: string }; models: ModelInfo[] }>(
        "/api/meta/models",
      ),
      api<{ items: ModelInfo[] }>("/api/models/enabled"),
    ])
      .then(([meta, enabled]) => {
        setCatalog(meta.models);
        const known = new Set(meta.models.map((model) => model.id));
        setEnabledExtra(
          enabled.items.filter((model) => !known.has(model.id)).map((model) => describeEnabled(model.id)),
        );
        onChange({
          generation: value.generation || AUTO_VALUE,
          humanize: value.humanize || AUTO_VALUE,
        });
      })
      .catch(() => {
        setError("Model list unavailable — Auto will be used.");
        onChange({ generation: AUTO_VALUE, humanize: AUTO_VALUE });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generationPool = [...catalog, ...enabledExtra].filter(
    (model) => model.role === "generate" || model.role === "both",
  );
  const humanizePool = [...catalog, ...enabledExtra].filter(
    (model) => model.role === "humanize" || model.role === "both",
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
          <option key={model.id} value={model.id} disabled={!model.available}>
            {model.label} · {model.cost}
            {model.available ? "" : " (unavailable)"}
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
          Auto reads your brief and picks the cheapest capable model.
        </p>
        <Link href="/settings#models" className="text-xs font-semibold underline underline-offset-2">
          Manage models
        </Link>
      </div>
      {error ? <p className="mt-1 text-sm text-[var(--warn)]">{error}</p> : null}
    </div>
  );
}
