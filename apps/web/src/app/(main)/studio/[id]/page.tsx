"use client";

import { use, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api/client";
import { ScoreRing, SectionSkeleton, Toast } from "@/components/ui/ui";
import MermaidBlock from "@/components/features/MermaidBlock";
import type { DocumentDetail, Section } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function CodeBlock({ text }: { text: string }) {
  const mermaid: string[] = [];
  const prose = text.replace(/```mermaid([\s\S]*?)```/g, (_, code) => {
    mermaid.push(code.trim());
    return "";
  });
  return (
    <div>
      <p className="whitespace-pre-wrap leading-relaxed">{prose}</p>
      {mermaid.map((m, i) => (
        <MermaidBlock key={i} code={m} />
      ))}
    </div>
  );
}

export default function StudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [doc, setDoc] = useState<DocumentDetail | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [notice, setNotice] = useState("");
  const [diffs, setDiffs] = useState<Record<string, string>>({});
  const [versions, setVersions] = useState<{ version_no: number; created_at: string }[]>([]);

  async function toggleDiff(sectionId: string) {
    if (diffs[sectionId]) {
      setDiffs((d) => {
        const next = { ...d };
        delete next[sectionId];
        return next;
      });
      return;
    }
    try {
      const r = await api<{ diff_unified: string }>("/api/humanize/compare", {
        method: "POST",
        body: JSON.stringify({ section_id: sectionId }),
      });
      setDiffs((d) => ({
        ...d,
        [sectionId]: r.diff_unified || "(no changes yet — humanize this section first)",
      }));
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Diff failed.");
    }
  }

  async function restoreVersion(versionNo: number) {
    setBusy(`restore-${versionNo}`);
    try {
      await api(`/api/documents/${id}/restore/${versionNo}`, { method: "POST" });
      setNotice(`Restored version ${versionNo}.`);
      await load();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Restore failed.");
    } finally {
      setBusy(null);
    }
  }

  async function load() {
    try {
      setDoc(await api<DocumentDetail>(`/api/documents/${id}`));
      const v = await api<{ items: { version_no: number; created_at: string }[] }>(
        `/api/documents/${id}/versions`,
      );
      setVersions(v.items);
    } catch {
      setError("Couldn't open this document.");
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function humanize(sectionId: string, all = false) {
    setBusy(sectionId);
    setNotice("");
    try {
      if (all && doc) {
        const r = await api<{ avgHumanBefore: number; avgHumanAfter: number; sectionsUpdated: number }>(
          "/api/humanize/batch",
          { method: "POST", body: JSON.stringify({ document_id: doc.id, humanize_model: doc.humanize_model }) },
        );
        setNotice(`Humanized ${r.sectionsUpdated} sections: ${r.avgHumanBefore}% → ${r.avgHumanAfter}% human.`);
      } else {
        await api("/api/humanize", {
          method: "POST",
          body: JSON.stringify({ section_id: sectionId, humanize_model: doc?.humanize_model }),
        });
        setNotice("Section rewritten — new version saved.");
      }
      await load();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Humanize failed.");
    } finally {
      setBusy(null);
    }
  }

  async function saveEdit(section: Section) {
    setBusy(section.id);
    try {
      await api(`/api/sections/${section.id}`, {
        method: "PUT",
        body: JSON.stringify({ content_md: draft }),
      });
      setEditing(null);
      await load();
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setBusy(null);
    }
  }

  async function exportDoc(format: "pdf" | "docx") {
    setBusy(`export-${format}`);
    try {
      const r = await api<{ exportId: string }>(`/api/export/${format}`, {
        method: "POST",
        body: JSON.stringify({ documentId: id }),
      });
      window.open(`${API_BASE}/api/exports/${r.exportId}/download`, "_blank");
    } catch (err) {
      setNotice(err instanceof ApiError ? err.message : "Export failed.");
    } finally {
      setBusy(null);
    }
  }

  if (error) return <Toast kind="error" message={error} />;
  if (!doc) return <div className="space-y-3"><SectionSkeleton /><SectionSkeleton /></div>;

  return (
    <div>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">{doc.title}</h1>
          <p className="text-sm text-[var(--muted)]">{doc.type} · {doc.status} · {doc.humanize_model}</p>
        </div>
        <div className="flex items-center gap-3">
          <ScoreRing value={doc.human_score_avg} />
          <button className="btn-ghost px-4 py-2 text-sm font-semibold" disabled={busy !== null}
            onClick={() => exportDoc("docx")}>DOCX</button>
          <button className="btn-accent px-4 py-2 text-sm font-semibold" disabled={busy !== null}
            onClick={() => exportDoc("pdf")}>Export PDF</button>
        </div>
      </header>
      {notice ? <div className="mt-4 max-w-xl"><Toast kind={notice.includes("failed") || notice.includes("Couldn't") ? "error" : "success"} message={notice} /></div> : null}

      <div className="mt-6 grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_240px]">
        <nav aria-label="Outline" className="paper-card h-fit p-3 lg:sticky lg:top-6">
          {doc.sections.map((s) => (
            <a key={s.id} href={`#sec-${s.id}`}
              className="rowlink flex items-center justify-between gap-2 rounded-lg px-2 py-2 text-sm">
              <span className="truncate font-medium">{s.title}</span>
              <ScoreRing value={s.human_score} size={30} />
            </a>
          ))}
          <button className="btn-accent mt-3 w-full py-2 text-sm font-semibold"
            disabled={busy !== null} onClick={() => humanize("all", true)}>
            {busy === "all" ? "Humanizing…" : "Humanize all"}
          </button>
        </nav>

        <div className="space-y-5">
          {doc.sections.map((s) => (
            <article key={s.id} id={`sec-${s.id}`} className="paper-sheet p-6 md:p-8">
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-display text-2xl font-bold">{s.title}</h2>
                <ScoreRing value={s.human_score} />
              </div>
              <p className="mt-1 text-xs text-[var(--muted)]">{s.word_count} words · v{s.iteration}</p>
              <div className="mt-4 text-[15px]">
                {editing === s.id ? (
                  <textarea className="field min-h-40 py-3" rows={8} value={draft}
                    onChange={(e) => setDraft(e.target.value)} />
                ) : (
                  <CodeBlock text={s.content_md} />
                )}
              </div>
              <div className="mt-4 flex gap-2">
                {editing === s.id ? (
                  <>
                    <button className="btn-accent px-4 py-2 text-sm font-semibold" disabled={busy !== null}
                      onClick={() => saveEdit(s)}>Save & rescore</button>
                    <button className="btn-ghost px-4 py-2 text-sm" onClick={() => setEditing(null)}>Cancel</button>
                  </>
                ) : (
                  <>
                    <button className="btn-ghost px-4 py-2 text-sm font-semibold"
                      onClick={() => { setEditing(s.id); setDraft(s.content_md); }}>Edit</button>
                    <button className="btn-accent px-4 py-2 text-sm font-semibold" disabled={busy !== null}
                      onClick={() => humanize(s.id)}>
                      {busy === s.id ? "Rewriting…" : "Humanize"}
                    </button>
                    <button className="btn-ghost px-4 py-2 text-sm font-semibold" disabled={busy !== null}
                      onClick={() => toggleDiff(s.id)}>
                      {diffs[s.id] ? "Hide diff" : "Diff"}
                    </button>
                  </>
                )}
              </div>
              {diffs[s.id] ? (
                <pre className="bg-code mt-3 overflow-x-auto rounded-lg p-4 font-mono text-xs">{diffs[s.id]}</pre>
              ) : null}
            </article>
          ))}
        </div>

        <aside className="paper-card h-fit p-4 lg:sticky lg:top-6" aria-label="Humanize console">
          <h3 className="font-display text-lg font-bold">Humanize console</h3>
          <div className="mt-3 flex items-center gap-3">
            <ScoreRing value={doc.human_score_avg} size={56} />
            <p className="text-sm text-[var(--muted)]">Average across {doc.sections.length} sections. Target 95%+.</p>
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Writing model</dt><dd className="font-mono text-xs">{doc.generation_model.split("/").pop()}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Humanizer</dt><dd className="font-mono text-xs">{doc.humanize_model.split("/").pop()}</dd></div>
            <div className="flex justify-between"><dt className="text-[var(--muted)]">Status</dt><dd className="font-semibold">{doc.status}</dd></div>
          </dl>
          <div className="mt-4 border-t border-[var(--border)] pt-3">
            <h4 className="text-sm font-bold">Versions</h4>
            {!versions.length ? (
              <p className="mt-1 text-sm text-[var(--muted)]">No snapshots yet.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {versions.map((v) => (
                  <li key={v.version_no} className="flex items-center justify-between text-sm">
                    <span>v{v.version_no}</span>
                    <button
                      className="btn-ghost px-3 py-1 text-xs font-semibold"
                      disabled={busy !== null}
                      onClick={() => restoreVersion(v.version_no)}
                    >
                      Restore
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
