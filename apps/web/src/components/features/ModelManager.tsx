"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Toast } from "@/components/ui/ui";

type LiveModel = { id: string; label: string; role: string; cost: string };

/**
 * Manage models (opencode-style): live NVIDIA list for this server key,
 * toggle which ones join your personal picker. Stored per user.
 */
export default function ModelManager() {
  const [live, setLive] = useState(false);
  const [hint, setHint] = useState("");
  const [models, setModels] = useState<LiveModel[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const [available, mine] = await Promise.all([
        api<{ live: boolean; models: LiveModel[]; hint?: string }>("/api/models/available"),
        api<{ items: { id: string }[] }>("/api/models/enabled"),
      ]);
      setLive(available.live);
      setModels(available.models);
      setHint(available.hint ?? "");
      setEnabled(new Set(mine.items.map((model) => model.id)));
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Couldn't load models.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(modelId: string) {
    const next = !enabled.has(modelId);
    try {
      await api("/api/models/enabled", {
        method: "POST",
        body: JSON.stringify({ model_id: modelId, enabled: next }),
      });
      setEnabled((previous) => {
        const updated = new Set(previous);
        if (next) updated.add(modelId);
        else updated.delete(modelId);
        return updated;
      });
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Update failed.");
    }
  }

  const visible = models.filter((model) =>
    model.id.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--muted)]">
          {live
            ? `${models.length} models on your NVIDIA key. Toggle the ones you want in your picker.`
            : hint || "Live list unavailable."}
        </p>
        <input
          className="field"
          style={{ maxWidth: "220px" }}
          placeholder="Filter models…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label="Filter models"
        />
      </div>
      {notice ? (
        <div className="mt-3">
          <Toast kind="error" message={notice} />
        </div>
      ) : null}
      {loading ? (
        <p className="mt-4 text-sm text-[var(--muted)]">Checking NVIDIA…</p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
          {visible.map((model) => {
            const on = enabled.has(model.id);
            return (
              <li
                key={model.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold">{model.id}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {model.label} · {model.role} · {model.cost}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? "Remove" : "Add"} ${model.id}`}
                  onClick={() => toggle(model.id)}
                  className={`flex min-h-11 items-center justify-center rounded-full border px-4 text-xs font-bold transition-colors ${
                    on
                      ? "border-transparent bg-[var(--accent)] text-white"
                      : "border-[var(--border)]"
                  }`}
                  style={{ minWidth: "76px" }}
                >
                  {on ? "Added" : "Add"}
                </button>
              </li>
            );
          })}
          {!visible.length ? (
            <li className="text-sm text-[var(--muted)]">No models match that filter.</li>
          ) : null}
        </ul>
      )}
    </div>
  );
}
