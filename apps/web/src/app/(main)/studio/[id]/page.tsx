"use client";

import { use, useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { ScoreRing, SectionSkeleton, Toast } from "@/components/ui/ui";
import RefreshButton from "@/components/ui/RefreshButton";
import SectionCard from "@/components/features/SectionCard";
import VersionsCard from "@/components/features/VersionsCard";
import Confetti from "@/components/fx/Confetti";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { DocumentDetail } from "@/types";

const STRENGTHS = [
  { id: "light", hint: "Gentle polish" },
  { id: "medium", hint: "Balanced rewrite" },
  { id: "aggressive", hint: "Deep rework" },
] as const;
type Strength = (typeof STRENGTHS)[number]["id"];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type VersionEntry = { version_no: number; created_at: string };

export default function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: documentId } = use(params);
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState("");
  const [busySectionId, setBusySectionId] = useState<string | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [draftText, setDraftText] = useState("");
  const [notice, setNotice] = useState("");
  const [diffsBySection, setDiffsBySection] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<VersionEntry[]>([]);
  const [strength, setStrength] = useState<Strength>("medium");
  const [batchProgress, setBatchProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [modelCatalog, setModelCatalog] = useState<{ id: string; label: string }[]>([]);
  const stopBatch = useRef(false);

  // Reload document + snapshots. stable reference so RefreshButton can call it.
  const loadDocument = useCallback(async () => {
    const [fetchedDoc, fetchedVersions] = await Promise.all([
      api<DocumentDetail>(`/api/documents/${documentId}`),
      api<{ items: VersionEntry[] }>(`/api/documents/${documentId}/versions`),
    ]);
    setDocument(fetchedDoc);
    setVersions(fetchedVersions.items);
  }, [documentId]);

  useEffect(() => {
    loadDocument().catch(() => setError("Couldn't open this document."));
  }, [loadDocument]);

  // Model catalog for the per-document override (once per studio visit).
  useEffect(() => {
    api<{ models: { id: string; label: string }[] }>("/api/meta/models")
      .then((m) => setModelCatalog(m.models.map((x) => ({ id: x.id, label: x.label }))))
      .catch(() => undefined);
  }, []);

  async function humanizeSection(sectionId: string) {
    setBusySectionId(sectionId);
    setNotice("");
    try {
      await api("/api/humanize", {
        method: "POST",
        body: JSON.stringify({ section_id: sectionId, strength, humanize_model: document?.humanize_model }),
      });
      setNotice("Section rewritten — new version saved.");
      await loadDocument();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Humanize failed.");
    } finally {
      setBusySectionId(null);
    }
  }

  // Sequential pass: one section per request, so a 12-section doc can never
  // trip Vercel's 60s maxDuration the way the old single batch call could.
  // Progress is shown live; Stop halts after the in-flight section.
  async function humanizeAllSections() {
    if (!document || batchProgress) return;
    const targets = document.sections.filter((s) => (s.human_score ?? 0) < 95);
    if (!targets.length) {
      setNotice("Every section is already above 95% — nothing to do.");
      return;
    }
    const before = document.human_score_avg ?? 0;
    stopBatch.current = false;
    setNotice("");
    setBatchProgress({ done: 0, total: targets.length, label: targets[0].title });
    let ok = 0;
    for (const section of targets) {
      if (stopBatch.current) break;
      setBusySectionId(section.id);
      setBatchProgress({ done: ok, total: targets.length, label: section.title });
      try {
        await api("/api/humanize", {
          method: "POST",
          body: JSON.stringify({ section_id: section.id, strength, humanize_model: document.humanize_model }),
        });
        ok += 1;
        setBatchProgress({ done: ok, total: targets.length, label: section.title });
      } catch {
        // Keep going — the summary names the shortfall.
      }
    }
    setBusySectionId(null);
    let after: number | null = null;
    if (ok > 0) {
      try {
        after = (await api<DocumentDetail>(`/api/documents/${documentId}`)).human_score_avg;
      } catch {
        after = null;
      }
    }
    setBatchProgress(null);
    await loadDocument();
    if (stopBatch.current) {
      setNotice(`Stopped after ${ok} of ${targets.length} sections.`);
    } else if (ok === targets.length) {
      setNotice(`Humanized ${ok} sections${after != null ? `: ${before}% → ${after}% human` : "."}`);
    } else {
      setNotice(`Humanized ${ok} of ${targets.length} sections — retry the rest individually.`);
    }
  }

  async function saveModelOverride(field: "generation_model" | "humanize_model", value: string) {
    if (!document) return;
    try {
      const updated = await api<{ generation_model: string; humanize_model: string }>(
        `/api/documents/${documentId}`,
        { method: "PUT", body: JSON.stringify({ [field]: value }) },
      );
      setDocument({ ...document, ...updated });
      setNotice(`Model updated — future runs use ${modelShortName(updated[field])}.`);
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Model update failed.");
    }
  }

  async function saveSectionEdit(sectionId: string) {
    setBusySectionId(sectionId);
    try {
      await api(`/api/sections/${sectionId}`, {
        method: "PUT",
        body: JSON.stringify({ content_md: draftText }),
      });
      setEditingSectionId(null);
      await loadDocument();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setBusySectionId(null);
    }
  }

  async function moveSection(sectionId: string, direction: "up" | "down") {
    setBusySectionId(sectionId);
    try {
      await api(`/api/sections/${sectionId}/move`, {
        method: "POST",
        body: JSON.stringify({ direction }),
      });
      await loadDocument();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Move failed.");
    } finally {
      setBusySectionId(null);
    }
  }

  async function toggleSectionDiff(sectionId: string) {
    if (diffsBySection[sectionId]) {
      setDiffsBySection((previous) => {
        const next = { ...previous };
        delete next[sectionId];
        return next;
      });
      return;
    }
    try {
      const result = await api<{ diff_unified: string }>("/api/humanize/compare", {
        method: "POST",
        body: JSON.stringify({ section_id: sectionId }),
      });
      setDiffsBySection((previous) => ({
        ...previous,
        [sectionId]: result.diff_unified || "(no changes yet — humanize this section first)",
      }));
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Diff failed.");
    }
  }

  async function restoreVersion(versionNo: number) {
    setBusySectionId(`restore-${versionNo}`);
    try {
      await api(`/api/documents/${documentId}/restore/${versionNo}`, { method: "POST" });
      setNotice(`Restored version ${versionNo}.`);
      await loadDocument();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Restore failed.");
    } finally {
      setBusySectionId(null);
    }
  }

  async function exportDocument(format: "pdf" | "docx") {
    setBusySectionId(`export-${format}`);
    try {
      const result = await api<{ exportId: string }>(`/api/export/${format}`, {
        method: "POST",
        body: JSON.stringify({ documentId }),
      });
      window.open(`${API_BASE}/api/exports/${result.exportId}/download`, "_blank");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Export failed.");
    } finally {
      setBusySectionId(null);
    }
  }

  if (error) return <Toast kind="error" message={error} />;
  if (!document) {
    return (
      <div className="space-y-3">
        <SectionSkeleton />
        <SectionSkeleton />
      </div>
    );
  }

  const noticeKind =
    notice.includes("failed") || notice.includes("Couldn't") ? "error" : "success";
  const modelShortName = (modelId: string) => modelId.split("/").pop();
  const weakCount = document.sections.filter((s) => (s.human_score ?? 0) < 95).length;

  return (
    <div>
      <header>
        <p className="kicker">{document.type} · {document.status}</p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display min-w-0 max-w-[20ch] text-balance text-3xl font-bold sm:text-4xl">
            {document.title}
          </h1>
          <div className="flex shrink-0 items-center gap-3">
            <ScoreRing value={document.human_score_avg} size={52} />
            <div className="font-mono text-xs leading-relaxed text-[var(--muted)]">
              <p>{document.sections.length} sections</p>
              <p>{weakCount} below 95%</p>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2 border-y border-[var(--border)] py-3">
          <RefreshButton onRefresh={loadDocument} label="Refresh" />
          <span className="mx-1 hidden h-5 w-px bg-[var(--border)] sm:block" aria-hidden />
          <button
            className="btn-ghost px-4 py-2 text-sm font-semibold"
            disabled={busySectionId !== null}
            onClick={() => exportDocument("docx")}
          >
            DOCX
          </button>
          <button
            className="btn-accent px-5 py-2 text-sm font-semibold"
            disabled={busySectionId !== null}
            onClick={() => exportDocument("pdf")}
          >
            Export PDF
          </button>
        </div>
      </header>
      {notice ? (
        <div className="mt-4 max-w-xl">
          <Toast kind={noticeKind} message={notice} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-8 lg:grid-cols-[230px_minmax(0,1fr)_250px]">
        <nav aria-label="Outline" className="h-fit min-w-0 lg:sticky lg:top-6">
          <p className="kicker mb-2">Outline</p>
          <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-1 lg:overflow-visible lg:rounded-2xl lg:border lg:border-[var(--border)] lg:bg-[var(--surface)] lg:p-2">
          {document.sections.map((section, i) => (
            <a
              key={section.id}
              href={`#sec-${section.id}`}
              className="rowlink flex shrink-0 items-center gap-2.5 rounded-full border border-[var(--border)] px-3 py-2 text-sm lg:rounded-xl lg:border-0"
            >
              <span className="font-mono text-xs text-[var(--muted)]" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="max-w-32 truncate font-medium sm:max-w-none">{section.title}</span>
              <ScoreRing value={section.human_score} size={30} />
            </a>
          ))}
          </div>
          {batchProgress ? (
            <div className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4" aria-live="polite">
              <p className="text-sm font-semibold">
                Humanizing {Math.min(batchProgress.done + 1, batchProgress.total)} of {batchProgress.total}
              </p>
              <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{batchProgress.label}</p>
              <div className="meter mt-2" aria-hidden>
                <span style={{ width: `${(batchProgress.done / batchProgress.total) * 100}%` }} />
              </div>
              <button
                type="button"
                className="btn-ghost mt-3 w-full py-2 text-sm font-semibold"
                onClick={() => { stopBatch.current = true; }}
              >
                Stop after this section
              </button>
            </div>
          ) : (
            <button
              className="btn-accent mt-3 w-full py-2.5 text-sm font-semibold"
              disabled={busySectionId !== null || weakCount === 0}
              onClick={humanizeAllSections}
            >
              {weakCount ? `Humanize ${weakCount} weak` : "All sections clear"}
            </button>
          )}
        </nav>

        <div className="min-w-0 space-y-5">
          {document.sections.map((section, index) => (
            // One bad section must never kill the studio: each card is isolated.
            <ErrorBoundary key={section.id} label={`“${section.title}” section`}>
              <SectionCard
                section={section}
              actionsDisabled={busySectionId !== null}
              isBusy={busySectionId === section.id}
              isEditing={editingSectionId === section.id}
              draft={draftText}
              onDraftChange={setDraftText}
              onStartEdit={() => {
                setEditingSectionId(section.id);
                setDraftText(section.content_md);
              }}
              onCancelEdit={() => setEditingSectionId(null)}
              onSaveEdit={() => saveSectionEdit(section.id)}
              onHumanize={() => humanizeSection(section.id)}
              onMoveUp={() => moveSection(section.id, "up")}
              onMoveDown={() => moveSection(section.id, "down")}
              isFirst={index === 0}
              isLast={index === document.sections.length - 1}
              diffText={diffsBySection[section.id] ?? null}
              onToggleDiff={() => toggleSectionDiff(section.id)}
            />
            </ErrorBoundary>
          ))}
        </div>

        <aside className="paper-card h-fit min-w-0 p-5 lg:sticky lg:top-6" aria-label="Humanize console">
          <ErrorBoundary label="humanize console">
          <p className="kicker">Console</p>
          <h2 className="font-display mt-1.5 text-lg font-bold">Humanize console</h2>
          <div className="mt-3 flex items-center gap-3">
            <ScoreRing value={document.human_score_avg} size={56} />
            <p className="text-sm text-[var(--muted)]">
              Average across {document.sections.length} sections. Target 95%+.
            </p>
          </div>
          {(document.human_score_avg ?? 0) >= 95 ? (
            <p className="confetti-line" role="status">
              <Confetti />
              Reads fully human.
            </p>
          ) : null}
          <div className="mt-4">
            <p id="strength-label" className="text-sm font-semibold">
              Rewrite strength
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-2xl border border-[var(--border)] p-1" role="group" aria-labelledby="strength-label">
              {STRENGTHS.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  aria-pressed={strength === level.id}
                  title={level.hint}
                  onClick={() => setStrength(level.id)}
                  className={`rounded-xl px-2 py-2 text-xs font-bold capitalize transition-colors ${
                    strength === level.id ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  {level.id}
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-xs text-[var(--muted)]">
              {STRENGTHS.find((s) => s.id === strength)?.hint}
            </p>
          </div>
          <div className="mt-4 space-y-3 border-t border-[var(--border)] pt-4">
            {(["generation_model", "humanize_model"] as const).map((field) => {
              const current = document[field];
              const ids = modelCatalog.map((m) => m.id);
              const options = ids.includes(current) ? ids : [current, ...ids];
              return (
                <label key={field} className="block min-w-0">
                  <span className="text-sm text-[var(--muted)]">
                    {field === "generation_model" ? "Writing model" : "Humanizer"}
                  </span>
                  <select
                    className="field mt-1 truncate font-mono text-xs"
                    value={options.includes("auto") || current !== "auto" ? current : "auto"}
                    onChange={(e) => saveModelOverride(field, e.target.value)}
                    aria-label={field === "generation_model" ? "Writing model for this document" : "Humanizer model for this document"}
                  >
                    <option value="auto">Auto (recommended)</option>
                    {options.filter((id) => id !== "auto").map((id) => (
                      <option key={id} value={id} title={id}>
                        {modelCatalog.find((m) => m.id === id)?.label ?? modelShortName(id)}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
            <div className="flex justify-between gap-2 text-sm">
              <span className="text-[var(--muted)]">Status</span>
              <span className="font-semibold capitalize">{document.status}</span>
            </div>
          </div>
          <VersionsCard versions={versions} busy={busySectionId !== null} onRestore={restoreVersion} />
          </ErrorBoundary>
        </aside>
      </div>
    </div>
  );
}
