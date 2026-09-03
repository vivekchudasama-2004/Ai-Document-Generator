"use client";

import MermaidBlock from "@/components/features/MermaidBlock";
import DiffView from "@/components/features/DiffView";
import { ScoreRing } from "@/components/ui/ui";
import type { Section } from "@/types";

/** Splits ```mermaid fences from prose; diagrams render, code never executes. */
function SectionBody({ markdown }: { markdown: string }) {
  const diagrams: string[] = [];
  const prose = markdown.replace(/```mermaid([\s\S]*?)```/g, (_, code: string) => {
    diagrams.push(code.trim());
    return "";
  });
  return (
    <div>
      <p className="whitespace-pre-wrap leading-relaxed">{prose}</p>
      {diagrams.map((diagram, index) => (
        <MermaidBlock key={index} code={diagram} />
      ))}
    </div>
  );
}

export type SectionCardProps = {
  section: Section;
  actionsDisabled: boolean;
  isBusy: boolean;
  isEditing: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onHumanize: () => void;
  diffText: string | null;
  onToggleDiff: () => void;
};

/** One studio section: paper sheet, score ring, edit/humanize/diff actions. */
export default function SectionCard({
  section,
  actionsDisabled,
  isBusy,
  isEditing,
  draft,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onHumanize,
  diffText,
  onToggleDiff,
}: SectionCardProps) {
  return (
    <article id={`sec-${section.id}`} className="paper-sheet p-6 md:p-8">
      <div className="flex items-start justify-between gap-3">
        <h2 className="font-display text-2xl font-bold">{section.title}</h2>
        <ScoreRing value={section.human_score} />
      </div>
      <p className="mt-1 text-xs text-[var(--muted)]">
        {section.word_count} words · v{section.iteration}
      </p>
      <div className="mt-4 text-[15px]">
        {isEditing ? (
          <textarea
            className="field min-h-40 py-3"
            rows={8}
            value={draft}
            onChange={(event) => onDraftChange(event.target.value)}
            aria-label={`Edit ${section.title}`}
          />
        ) : (
          <SectionBody markdown={section.content_md} />
        )}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {isEditing ? (
          <>
            <button
              className="btn-accent px-4 py-2 text-sm font-semibold"
              disabled={actionsDisabled}
              onClick={onSaveEdit}
            >
              Save & rescore
            </button>
            <button className="btn-ghost px-4 py-2 text-sm" onClick={onCancelEdit}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button className="btn-ghost px-4 py-2 text-sm font-semibold" onClick={onStartEdit}>
              Edit
            </button>
            <button
              className="btn-accent px-4 py-2 text-sm font-semibold"
              disabled={actionsDisabled}
              onClick={onHumanize}
            >
              {isBusy ? "Rewriting…" : "Humanize"}
            </button>
            <button
              className="btn-ghost px-4 py-2 text-sm font-semibold"
              disabled={actionsDisabled}
              onClick={onToggleDiff}
            >
              {diffText ? "Hide diff" : "Diff"}
            </button>
          </>
        )}
      </div>
      {diffText ? <DiffView unifiedDiff={diffText} /> : null}
    </article>
  );
}
