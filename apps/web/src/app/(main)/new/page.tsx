"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ModelSelector from "@/components/features/ModelSelector";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { apiStream, ApiError } from "@/lib/api/client";
import { FieldError, SectionSkeleton, Toast } from "@/components/ui/ui";
import type { DocType } from "@/types";

const TYPES: { id: DocType; label: string; hint: string }[] = [
  { id: "rdd", label: "RDD", hint: "Requirements & Design" },
  { id: "prd", label: "PRD", hint: "Product Requirements" },
  { id: "technical_design", label: "Technical Design", hint: "Components & interfaces" },
];

export default function NewDocPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [idea, setIdea] = useState("");
  const [docType, setDocType] = useState<DocType>("rdd");
  const [tone, setTone] = useState("formal");
  const [depth, setDepth] = useState("detailed");
  const [models, setModels] = useState({ generation: "", humanize: "" });
  const [errors, setErrors] = useState<{ title?: string; idea?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [progress, setProgress] = useState<string[]>([]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = "Give the document a title.";
    if (idea.trim().length < 4) errs.idea = "Describe the idea in a line or two.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFailed("");
    setProgress([]);
    let docId = "";
    try {
      await apiStream(
        "/api/generate/stream",
        {
          title, idea, doc_type: docType, tone, depth,
          generation_model: models.generation || undefined,
          humanize_model: models.humanize || undefined,
        },
        (event, data) => {
          if (event === "section.start" && typeof data.documentId === "string") docId = data.documentId;
          if (event === "done" && typeof data.sectionTitle === "string")
            setProgress((p) => [...p, data.sectionTitle as string]);
        },
      );
      if (!docId) throw new Error("Generation returned no document.");
      router.push(`/studio/${docId}`);
    } catch (err) {
      setFailed(err instanceof ApiError || err instanceof Error ? err.message : "Generation failed.");
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-3xl font-bold">New document</h1>
      <p className="mt-1 text-[var(--muted)]">Idea → drafted, scored sections in about a minute.</p>
      <ErrorBoundary label="document wizard">
      <form onSubmit={submit} className="paper-card mt-6 space-y-5 p-5 sm:p-6" noValidate>
        <div>
          <label className="text-sm font-semibold" htmlFor="title">Title</label>
          <input id="title" className="field mt-1" value={title}
            onChange={(e) => setTitle(e.target.value)} placeholder="E-commerce platform RDD" />
          <FieldError message={errors.title} />
        </div>
        <div>
          <label className="text-sm font-semibold" htmlFor="idea">The idea</label>
          <textarea id="idea" rows={3} className="field mt-1 py-3" value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="A marketplace for independent bookstores with shared inventory…" />
          <FieldError message={errors.idea} />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block min-w-0">
            <span className="text-sm font-semibold">Type</span>
            <select className="field mt-1 truncate" value={docType} onChange={(e) => setDocType(e.target.value as DocType)}>
              {TYPES.map((t) => <option key={t.id} value={t.id} title={`${t.label} — ${t.hint}`}>{t.label} — {t.hint}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Tone</span>
            <select className="field mt-1" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="formal">Formal</option>
              <option value="startup">Startup</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-semibold">Depth</span>
            <select className="field mt-1" value={depth} onChange={(e) => setDepth(e.target.value)}>
              <option value="detailed">Detailed</option>
              <option value="brief">Brief</option>
            </select>
          </label>
        </div>
        <ModelSelector value={models} onChange={setModels} />
        {failed ? <Toast kind="error" message={failed} /> : null}
        {busy ? (
          <div className="space-y-2" aria-live="polite">
            <SectionSkeleton />
            {progress.map((p) => <p key={p} className="text-sm text-[var(--muted)]">✓ {p}</p>)}
          </div>
        ) : null}
        <button className="btn-accent w-full font-semibold" disabled={busy}>
          {busy ? "Drafting…" : "Generate document"}
        </button>
      </form>
      </ErrorBoundary>
    </div>
  );
}
