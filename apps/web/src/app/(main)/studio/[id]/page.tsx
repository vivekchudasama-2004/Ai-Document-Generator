"use client";

import { use, useCallback, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { ScoreRing, SectionSkeleton, Toast } from "@/components/ui/ui";
import RefreshButton from "@/components/ui/RefreshButton";
import SectionCard from "@/components/features/SectionCard";
import VersionsCard from "@/components/features/VersionsCard";
import Confetti from "@/components/fx/Confetti";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import type { DocumentDetail } from "@/types";

const STRENGTHS = ["light", "medium", "aggressive"] as const;
type Strength = (typeof STRENGTHS)[number];

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

  async function humanizeAllSections() {
    if (!document) return;
    setBusySectionId("all");
    setNotice("");
    try {
      const result = await api<{ avgHumanBefore: number; avgHumanAfter: number; sectionsUpdated: number }>(
        "/api/humanize/batch",
        {
          method: "POST",
          body: JSON.stringify({ document_id: document.id, strength, humanize_model: document.humanize_model }),
        },
      );
      setNotice(
        `Humanized ${result.sectionsUpdated} sections: ${result.avgHumanBefore}% → ${result.avgHumanAfter}% human.`,
      );
      await loadDocument();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Humanize failed.");
    } finally {
      setBusySectionId(null);
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

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{document.title}</h1>
          <p className="text-sm text-[var(--muted)]">
            {document.type}, {document.status}, {document.humanize_model}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ScoreRing value={document.human_score_avg} />
          <RefreshButton onRefresh={loadDocument} label="Refresh" />
          <button
            className="btn-ghost px-4 py-2 text-sm font-semibold"
            disabled={busySectionId !== null}
            onClick={() => exportDocument("docx")}
          >
            DOCX
          </button>
          <button
            className="btn-accent px-4 py-2 text-sm font-semibold"
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

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
        <nav aria-label="Outline" className="h-fit lg:sticky lg:top-6">
          <div className="flex gap-2 overflow-x-auto pb-1 lg:grid lg:grid-cols-1 lg:overflow-visible lg:rounded-2xl lg:border lg:border-[var(--border)] lg:bg-[var(--surface)] lg:p-3">
          {document.sections.map((section) => (
            <a
              key={section.id}
              href={`#sec-${section.id}`}
              className="rowlink flex shrink-0 items-center justify-between gap-2 rounded-full border border-[var(--border)] px-3 py-2 text-sm lg:rounded-lg lg:border-0"
            >
              <span className="max-w-32 truncate font-medium sm:max-w-none">{section.title}</span>
              <ScoreRing value={section.human_score} size={30} />
            </a>
          ))}
          </div>
          <button
            className="btn-accent mt-3 w-full py-2 text-sm font-semibold"
            disabled={busySectionId !== null}
            onClick={humanizeAllSections}
          >
            {busySectionId === "all" ? "Humanizing…" : "Humanize all"}
          </button>
        </nav>

        <div className="space-y-5">
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

        <aside className="paper-card h-fit p-4 lg:sticky lg:top-6" aria-label="Humanize console">
          <ErrorBoundary label="humanize console">
          <h3 className="font-display text-lg font-bold">Humanize console</h3>
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
            <p id="strength-label" className="text-sm font-semibold text-[var(--muted)]">
              Rewrite strength
            </p>
            <div className="mt-1.5 grid grid-cols-3 gap-1 rounded-xl border border-[var(--border)] p-1" role="group" aria-labelledby="strength-label">
              {STRENGTHS.map((level) => (
                <button
                  key={level}
                  type="button"
                  aria-pressed={strength === level}
                  onClick={() => setStrength(level)}
                  className={`rounded-lg px-2 py-2 text-xs font-bold capitalize transition-colors ${
                    strength === level ? "bg-[var(--accent)] text-white" : "text-[var(--muted)]"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Writing model</dt>
              <dd className="font-mono text-xs">{modelShortName(document.generation_model)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Humanizer</dt>
              <dd className="font-mono text-xs">{modelShortName(document.humanize_model)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-[var(--muted)]">Status</dt>
              <dd className="font-semibold">{document.status}</dd>
            </div>
          </dl>
          <VersionsCard versions={versions} busy={busySectionId !== null} onRestore={restoreVersion} />
          </ErrorBoundary>
        </aside>
      </div>
    </div>
  );
}
