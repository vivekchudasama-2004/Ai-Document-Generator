import Link from "next/link";
import { ThemeToggle } from "@/components/ui/ui";

const STEPS = [
  { n: "01", t: "Describe the idea", d: "One or two lines. Pick a type — RDD, PRD, technical design — plus tone and the AI models that will write it." },
  { n: "02", t: "Watch it de-robot itself", d: "Every section is scored for humanness. Weak ones are rewritten up to three times — each version kept with a diff." },
  { n: "03", t: "Export print-ready pages", d: "Exactly 150 words a page, cover, contents, headers and footers. PDF or DOCX in one click." },
];

export default function Landing() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="flex items-center justify-between">
        <p className="font-display text-2xl font-bold">DocuForge</p>
        <nav className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="btn-ghost px-5 py-2 text-sm font-semibold">
            Log in
          </Link>
          <Link href="/signup" className="btn-accent px-5 py-2 text-sm font-semibold">
            Start writing
          </Link>
        </nav>
      </header>

      <section className="mt-16 max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-ink)]">
          Generate → Detect → Humanize
        </p>
        <h1 className="font-display mt-4 text-5xl font-bold leading-[1.05] md:text-6xl">
          Idea in. Human-feeling document out.
        </h1>
        <p className="mt-5 max-w-xl text-lg text-[var(--muted)]">
          Client-ready RDDs, PRDs and design docs with architecture diagrams and
          strict 150-words-a-page typesetting — rewritten until they read human.
        </p>
        <div className="mt-8 flex gap-3">
          <Link href="/signup" className="btn-accent px-7 py-3 font-semibold">
            Draft your first doc
          </Link>
          <Link href="/login" className="btn-ghost px-7 py-3 font-semibold">
            Open the studio
          </Link>
        </div>
      </section>

      <section className="mt-16 grid gap-4 md:grid-cols-3">
        {STEPS.map((s) => (
          <article key={s.n} className="paper-card p-6">
            <p className="font-mono text-sm text-[var(--accent-ink)]">{s.n}</p>
            <h2 className="font-display mt-2 text-xl font-bold">{s.t}</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{s.d}</p>
          </article>
        ))}
      </section>

      <section className="paper-sheet mx-auto mt-12 max-w-3xl p-8 md:p-10">
        <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">
          Fresh from the studio
        </p>
        <h3 className="font-display mt-2 text-3xl font-bold">E-commerce platform RDD</h3>
        <p className="mt-3 leading-relaxed text-[var(--muted)]">
          Twenty-two pages, four diagrams, every section scoring above 95% human —
          drafted, de-roboted and exported before the coffee cooled.
        </p>
      </section>

      <footer className="mt-16 border-t border-[var(--border)] pt-6 text-sm text-[var(--muted)]">
        DocuForge Humanized — open stack, your models, your words.
      </footer>
    </main>
  );
}
