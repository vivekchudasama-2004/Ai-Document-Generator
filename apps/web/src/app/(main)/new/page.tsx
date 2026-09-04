"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
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

const VALID_TYPES = new Set(TYPES.map((t) => t.id));

function Wizard() {
  const router = useRouter();
  const params = useSearchParams();
  const [title, setTitle] = useState(params.get("title") ?? "");
  const [idea, setIdea] = useState(params.get("idea") ?? "");
  const initialType = params.get("type");
  const [docType, setDocType] = useState<DocType>(
    initialType && VALID_TYPES.has(initialType as DocType) ? (initialType as DocType) : "rdd",
  );
  const [tone, setTone] = useState("formal");
  const [depth, setDepth] = useState("detailed");
  const [models, setModels] = useState({ generation: "", humanize: "" });
  const [errors, setErrors] = useState<{ title?: string; idea?: string }>({});
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState("");
  const [failedCode, setFailedCode] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<string[]>([]);

  const FALLBACK_WRITER = "nvidia/llama-3.1-nemotron-70b-instruct";

  async function run(generationOverride?: string) {
    const errs: typeof errors = {};
    if (!title.trim()) errs.title = "Give the document a title.";
    if (idea.trim().length < 4) errs.idea = "Describe the idea in a line or two.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    setFailed("");
    setFailedCode(undefined);
    setProgress([]);
    let docId = "";
    try {
      await apiStream(
        "/api/generate/stream",
        {
          title, idea, doc_type: docType, tone, depth,
          generation_model: generationOverride ?? (models.generation || undefined),
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
      setFailedCode(err instanceof ApiError ? err.code : undefined);
      setBusy(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    run();
  }

  function retryWith70b() {
    setModels((m) => ({ ...m, generation: FALLBACK_WRITER }));
    run(FALLBACK_WRITER);
  }

  return (
    <form onSubmit={submit} className="mt-8 space-y-10" noValidate>
      <section aria-labelledby="brief-h">
        <p className="kicker">01 · The brief</p>
        <h2 id="brief-h" className="font-display mt-2 text-2xl font-bold">What are we writing?</h2>
        <div className="paper-card mt-4 space-y-5 p-5 sm:p-6">
          <div>
            <label className="text-sm font-semibold" htmlFor="title">Title</label>
            <input id="title" className="field mt-1.5" value={title}
              onChange={(e) => setTitle(e.target.value)} placeholder="E-commerce platform RDD" />
            <FieldError message={errors.title} />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="idea">The idea</label>
            <textarea id="idea" rows={4} className="field mt-1.5 py-3" value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="A marketplace for independent bookstores with shared inventory…" />
            <FieldError message={errors.idea} />
          </div>
        </div>
      </section>

      <section aria-labelledby="shape-h">
        <p className="kicker">02 · The shape</p>
        <h2 id="shape-h" className="font-display mt-2 text-2xl font-bold">What kind of document?</h2>
        <div className="mt-4 grid gap-2" role="radiogroup" aria-label="Document type">
          {TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={docType === t.id}
              onClick={() => setDocType(t.id)}
              className={`flex items-baseline gap-4 border-b border-[var(--border)] py-4 text-left transition-colors ${
                docType === t.id ? "border-[var(--accent)]" : ""
              }`}
            >
              <span className={`nchip shrink-0 ${docType === t.id ? "" : "opacity-50"}`} aria-hidden>
                {docType === t.id ? "●" : "○"}
              </span>
              <span className="min-w-0">
                <span className="block text-base font-semibold">{t.label}</span>
                <span className="block text-sm text-[var(--muted)]">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block min-w-0">
            <span className="text-sm font-semibold">Tone</span>
            <select className="field mt-1.5" value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="formal">Formal</option>
              <option value="startup">Startup</option>
              <option value="enterprise">Enterprise</option>
            </select>
          </label>
          <label className="block min-w-0">
            <span className="text-sm font-semibold">Depth</span>
            <select className="field mt-1.5" value={depth} onChange={(e) => setDepth(e.target.value)}>
              <option value="detailed">Detailed</option>
              <option value="brief">Brief</option>
            </select>
          </label>
        </div>
      </section>

      <section aria-labelledby="models-h">
        <p className="kicker">03 · The minds</p>
        <h2 id="models-h" className="font-display mt-2 text-2xl font-bold">Which models?</h2>
        <div className="paper-card mt-4 p-5 sm:p-6">
          <ErrorBoundary label="model picker">
            <ModelSelector value={models} onChange={setModels} />
          </ErrorBoundary>
        </div>
      </section>

      {failed ? <Toast kind="error" message={failed} /> : null}
      {failedCode === "MODEL_UNAVAILABLE" ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5" role="note">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            The default writer is overloaded right now — your key itself works
            (the model list loaded). The Nemotron 70B usually answers when the flagship doesn&apos;t.
          </p>
          <button
            type="button"
            onClick={retryWith70b}
            disabled={busy}
            className="btn-accent mt-3 px-5 py-2.5 text-sm font-semibold disabled:opacity-50"
          >
            Retry with Nemotron 70B
          </button>
        </div>
      ) : null}
      {failedCode === "MODEL_NO_ACCESS" ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-5" role="note">
          <p className="text-sm leading-relaxed text-[var(--muted)]">
            No model answered — your NVIDIA key can list models but can&apos;t invoke
            them (account not subscribed, or the ids retired). Accept the model terms
            on your NVIDIA account, or open Manage models below and add your own
            OpenRouter or Groq key instead.
          </p>
        </div>
      ) : null}
      {busy ? (
        <div className="space-y-2" aria-live="polite">
          <SectionSkeleton />
          {progress.map((p) => <p key={p} className="text-sm text-[var(--muted)]">✓ {p}</p>)}
        </div>
      ) : null}
      <button className="btn-accent w-full py-3.5 text-base font-semibold" disabled={busy}>
        {busy ? "Drafting…" : "Generate document"}
      </button>
    </form>
  );
}

export default function NewDocPage() {
  return (
    <div className="max-w-2xl">
      <p className="kicker">New document</p>
      <h1 className="font-display mt-2 text-balance text-3xl font-bold sm:text-4xl">From idea to draft in about a minute</h1>
      <p className="mt-2 max-w-[52ch] text-[var(--muted)]">Three short decisions. Sections arrive scored, ready to humanize.</p>
      <ErrorBoundary label="document wizard">
        <Suspense><Wizard /></Suspense>
      </ErrorBoundary>
    </div>
  );
}
