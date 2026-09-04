"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { Toast } from "@/components/ui/ui";

type LiveModel = { id: string; label: string; role: string; cost: string };
type SavedKey = {
  id: string; provider: string; label: string; masked_key: string;
  base_url: string | null; created_at: string;
};

/**
 * Manage models (opencode-style): live NVIDIA list for this server key,
 * toggle which ones join your personal picker. Stored per user.
 * Plus BYOK: save your own OpenRouter / Groq / custom keys (encrypted
 * server-side, shown masked here) and enable provider model ids.
 */
export default function ModelManager() {
  const [live, setLive] = useState(false);
  const [hint, setHint] = useState("");
  const [models, setModels] = useState<LiveModel[]>([]);
  const [enabled, setEnabled] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const [savedKeys, setSavedKeys] = useState<SavedKey[]>([]);
  const [provider, setProvider] = useState("openrouter");
  const [keyLabel, setKeyLabel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [savingKey, setSavingKey] = useState(false);
  const [customModel, setCustomModel] = useState("");

  async function load() {
    setLoading(true);
    setNotice("");
    try {
      const [available, mine, keys] = await Promise.all([
        api<{ live: boolean; models: LiveModel[]; hint?: string }>("/api/models/available"),
        api<{ items: { id: string }[] }>("/api/models/enabled"),
        api<{ items: SavedKey[] }>("/api/models/keys"),
      ]);
      setLive(available.live);
      setModels(available.models);
      setHint(available.hint ?? "");
      setEnabled(new Set(mine.items.map((model) => model.id)));
      setSavedKeys(keys.items);
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

  async function saveKey() {
    if (!apiKey.trim() || savingKey) return;
    setSavingKey(true);
    setNotice("");
    try {
      await api("/api/models/keys", {
        method: "POST",
        body: JSON.stringify({
          provider,
          label: keyLabel.trim(),
          api_key: apiKey.trim(),
          base_url: provider === "custom" ? baseUrl.trim() : undefined,
        }),
      });
      setApiKey("");
      setBaseUrl("");
      setKeyLabel("");
      const keys = await api<{ items: SavedKey[] }>("/api/models/keys");
      setSavedKeys(keys.items);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Couldn't save that key.");
    } finally {
      setSavingKey(false);
    }
  }

  async function deleteKey(id: string) {
    try {
      await api(`/api/models/keys/${id}`, { method: "DELETE" });
      setSavedKeys((keys) => keys.filter((key) => key.id !== id));
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Couldn't delete that key.");
    }
  }

  async function addCustomModel() {
    const id = customModel.trim();
    if (!id) return;
    try {
      await api("/api/models/enabled", {
        method: "POST",
        body: JSON.stringify({ model_id: id, enabled: true }),
      });
      setEnabled((previous) => new Set(previous).add(id));
      setCustomModel("");
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : "Couldn't add that model.");
    }
  }

  const liveIds = new Set(models.map((model) => model.id));
  const customEnabled = [...enabled].filter((id) => !liveIds.has(id));
  const visible = models.filter((model) =>
    `${model.id} ${model.label}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <p className="max-w-[38ch] text-sm text-[var(--muted)]">
          {live
            ? `${models.length} models on your NVIDIA key. Toggle the ones you want in your picker.`
            : hint || "Live list unavailable."}
        </p>
        <label className="block w-full sm:w-64">
          <span className="text-xs font-semibold text-[var(--muted)]">Filter</span>
          <span className="relative mt-1 block">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"
              aria-hidden
            >
              <circle cx="7" cy="7" r="4.5" />
              <path d="m10.5 10.5 3 3" strokeLinecap="round" />
            </svg>
            <input
              className="field pl-9"
              placeholder="Search by id or name…"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter models"
            />
          </span>
        </label>
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
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate font-mono text-xs font-semibold">{model.id}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {model.label}, {model.role}, {model.cost}
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${on ? "Remove" : "Add"} ${model.id}`}
                  onClick={() => toggle(model.id)}
                  className={`flex min-h-11 shrink-0 items-center justify-center rounded-full border px-4 text-xs font-bold transition-colors ${
                    on
                      ? "border-transparent bg-[var(--accent)] text-white hover:brightness-110"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--ink)]"
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

      <section className="mt-6 border-t border-[var(--border)] pt-5" aria-labelledby="byok-h">
        <h3 id="byok-h" className="text-sm font-bold">Your provider keys</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          OpenRouter, Groq, or any OpenAI-compatible endpoint. Keys are encrypted
          on the server and shown masked here — plaintext is never stored or returned.
        </p>
        {savedKeys.length ? (
          <ul className="mt-3 space-y-2">
            {savedKeys.map((key) => (
              <li
                key={key.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold">
                    {key.provider}{key.label ? ` · ${key.label}` : ""}
                  </p>
                  <p className="truncate font-mono text-xs text-[var(--muted)]">
                    {key.masked_key}{key.base_url ? ` · ${key.base_url}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => deleteKey(key.id)}
                  aria-label={`Delete ${key.provider} key`}
                  className="shrink-0 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--ink)] transition-colors hover:border-red-400 hover:text-red-500"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr]">
          <label className="block">
            <span className="text-xs font-semibold text-[var(--muted)]">Provider</span>
            <select
              className="field mt-1"
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
            >
              <option value="openrouter">OpenRouter</option>
              <option value="groq">Groq</option>
              <option value="custom">Custom endpoint</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-[var(--muted)]">Label (optional)</span>
            <input
              className="field mt-1"
              placeholder="e.g. personal"
              value={keyLabel}
              onChange={(event) => setKeyLabel(event.target.value)}
            />
          </label>
        </div>
        {provider === "custom" ? (
          <label className="mt-2 block">
            <span className="text-xs font-semibold text-[var(--muted)]">Base URL (https, public host)</span>
            <input
              className="field mt-1 font-mono"
              placeholder="https://llm.example.com/v1"
              value={baseUrl}
              onChange={(event) => setBaseUrl(event.target.value)}
              inputMode="url"
            />
          </label>
        ) : null}
        <label className="mt-2 block">
          <span className="text-xs font-semibold text-[var(--muted)]">API key</span>
          <input
            className="field mt-1 font-mono"
            type="password"
            placeholder="Paste key — saved encrypted"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
          />
        </label>
        <button
          type="button"
          onClick={saveKey}
          disabled={!apiKey.trim() || savingKey}
          className="mt-3 rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-bold text-white transition-opacity disabled:opacity-50"
        >
          {savingKey ? "Saving…" : "Save key"}
        </button>

        <h3 className="mt-5 text-sm font-bold">Your provider models</h3>
        <p className="mt-1 text-xs leading-relaxed text-[var(--muted)]">
          Enable ids like <span className="font-mono">groq/llama-3.1-8b-instant</span> or{" "}
          <span className="font-mono">custom/personal/my-model</span> — they join your
          pickers once the matching key above exists.
        </p>
        {customEnabled.length ? (
          <ul className="mt-2 space-y-2">
            {customEnabled.map((id) => (
              <li
                key={id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
              >
                <p className="min-w-0 flex-1 truncate font-mono text-xs font-semibold">{id}</p>
                <button
                  type="button"
                  onClick={() => toggle(id)}
                  aria-label={`Remove ${id}`}
                  className="shrink-0 rounded-full border border-[var(--border)] px-4 py-2 text-xs font-bold text-[var(--ink)] transition-colors hover:border-red-400 hover:text-red-500"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="mt-2 flex gap-2">
          <input
            className="field font-mono"
            placeholder="groq/llama-3.1-8b-instant"
            value={customModel}
            onChange={(event) => setCustomModel(event.target.value)}
            aria-label="Provider model id"
          />
          <button
            type="button"
            onClick={addCustomModel}
            disabled={!customModel.trim()}
            className="shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-bold text-[var(--ink)] transition-colors hover:border-[var(--ink)] disabled:opacity-50"
          >
            Add
          </button>
        </div>
      </section>
    </div>
  );
}
