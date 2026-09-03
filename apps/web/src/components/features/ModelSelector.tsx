"use client";

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

export default function ModelSelector({
  value,
  onChange,
}: {
  value: ModelChoice;
  onChange: (v: ModelChoice) => void;
}) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ defaults: { generation: string; humanize: string }; models: ModelInfo[] }>("/api/meta/models")
      .then((m) => {
        setModels(m.models);
        onChange({
          generation: value.generation || m.defaults.generation,
          humanize: value.humanize || m.defaults.humanize,
        });
      })
      .catch(() => setError("Model list unavailable — defaults will be used."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const gens = models.filter((m) => m.role === "generate" || m.role === "both");
  const hums = models.filter((m) => m.role === "humanize" || m.role === "both");

  const pick = (label: string, options: ModelInfo[], current: string, key: keyof ModelChoice) => (
    <label className="block">
      <span className="text-sm font-semibold">{label}</span>
      <select
        className="field mt-1"
        value={current}
        onChange={(e) => onChange({ ...value, [key]: e.target.value })}
      >
        {current ? null : <option value="">Default</option>}
        {options.map((m) => (
          <option key={m.id} value={m.id} disabled={!m.available}>
            {m.label} · {m.cost}{m.available ? "" : " (unavailable)"}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {pick("Writing model", gens.length ? gens : [], value.generation, "generation")}
      {pick("Humanizing model", hums.length ? hums : [], value.humanize, "humanize")}
      {error ? <p className="text-sm text-[var(--warn)] md:col-span-2">{error}</p> : null}
    </div>
  );
}
