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
    <div className="min-w-0">
      <p className="whitespace-pre-wrap break-words leading-relaxed">{prose}</p>
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
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
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
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  diffText,
  onToggleDiff,
}: SectionCardProps) {
  return (
    <article id={`sec-${section.id}`} className="paper-sheet min-w-0 p-5 sm:p-6 md:p-8">
      <h2 className="font-display text-xl font-bold sm:text-2xl">{section.title}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <ScoreRing value={section.human_score} />
        <p className="text-xs text-[var(--muted)]">
          {section.word_count} words · v{section.iteration}
        </p>
      </div>
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
      <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <button className="btn-ghost px-3.5 py-2 text-[13px] font-semibold" onClick={onStartEdit}>
              Edit
            </button>
            <button
              className="btn-accent px-3.5 py-2 text-[13px] font-semibold"
              disabled={actionsDisabled}
              onClick={onHumanize}
            >
              {isBusy ? "Rewriting…" : "Humanize"}
            </button>
            <button
              className="btn-ghost px-3.5 py-2 text-[13px] font-semibold"
              disabled={actionsDisabled}
              onClick={onToggleDiff}
            >
              {diffText ? "Hide diff" : "Diff"}
            </button>
            <span className="ml-auto flex gap-1" role="group" aria-label={`Reorder ${section.title}`}>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-base font-bold transition-colors hover:border-[var(--ink)] disabled:opacity-40"
                disabled={actionsDisabled || isFirst}
                onClick={onMoveUp}
                aria-label={`Move ${section.title} up`}
                title="Move up"
              >
                ↑
              </button>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border)] text-base font-bold transition-colors hover:border-[var(--ink)] disabled:opacity-40"
                disabled={actionsDisabled || isLast}
                onClick={onMoveDown}
                aria-label={`Move ${section.title} down`}
                title="Move down"
              >
                ↓
              </button>
            </span>
          </>
        )}
      </div>
      {diffText ? <DiffView unifiedDiff={diffText} /> : null}
    </article>
  );
}
