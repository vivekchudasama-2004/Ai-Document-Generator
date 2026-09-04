"use client";

import Link from "next/link";
import { ScoreRing, ThemeToggle } from "@/components/ui/ui";

const FEATURES = [
  {
    title: "A loop, not a prompt",
    body: "Draft, score each section, rewrite the weak ones. Every pass is versioned with a diff.",
  },
  {
    title: "Scores that explain themselves",
    body: "Rhythm, voice, and diction. Each badge lists its top reasons.",
  },
  {
    title: "150 words a page",
    body: "Sentence-aware pagination with a cover, contents, headers and footers.",
  },
  {
    title: "Your models, your call",
    body: "Auto picks the cheapest capable writer, or pin your own per document.",
  },
  {
    title: "Private by design",
    body: "JWT on every endpoint, user and admin roles, opaque IDs.",
  },
];

const STEPS = [
  { n: 1, t: "Describe the idea", d: "A line or two. Pick a type, tone, and depth." },
  { n: 2, t: "Watch it de-robot itself", d: "Sections arrive scored. Humanize the weak ones." },
  { n: 3, t: "Export print-ready pages", d: "150 words a page, diagrams intact, PDF or DOCX." },
];

export default function Landing() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "DocuForge",
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            description:
              "Generate client-ready RDDs, PRDs, and design docs with human-feeling prose and 150-words-a-page typesetting.",
          }),
        }}
      />
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <p className="font-display text-xl">DocuForge</p>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Sections">
            <a href="#how" className="nav-underline">How it works</a>
            <a href="#features" className="nav-underline">Features</a>
            <a href="#sample" className="nav-underline">Sample</a>
          </nav>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
            <ThemeToggle />
            <Link href="/login" className="nav-underline hidden px-2 py-2 text-sm font-semibold sm:block">
              Log in
            </Link>
            <Link href="/signup" className="btn-accent px-4 py-2 text-sm font-semibold sm:px-5">
              Start writing
            </Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-10 pt-10 sm:px-6 md:grid-cols-2 md:gap-10 md:pt-16">
        <div>
          <p className="text-sm font-semibold text-[var(--accent-ink)]">
            Generate, detect, humanize
          </p>
          <h1 className="font-display mt-3 text-balance text-[2.75rem] font-bold leading-[1.02] sm:text-6xl md:text-[4.25rem]">
            Idea in. Human-feeling document out.
          </h1>
          <p className="mt-4 max-w-xl text-pretty text-base leading-relaxed text-[var(--muted)]">
            Client-ready RDDs, PRDs and design docs, with diagrams and
            150-words-a-page typesetting, rewritten until they read human.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="btn-accent justify-center px-7 py-3 font-semibold">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
              </svg>
              Draft your first doc
            </Link>
            <Link href="/login" className="btn-ghost justify-center px-7 py-3 font-semibold">
              Open the studio
            </Link>
          </div>
          <dl className="mt-8 grid max-w-md grid-cols-3 gap-3">
            {[
              ["90s", "idea to draft"],
              ["95%+", "human target"],
              ["150", "words a page"],
            ].map(([v, l]) => (
              <div key={l} className="min-w-0">
                <dt className="sr-only">{l}</dt>
                <dd className="font-display text-[1.6rem] font-bold leading-none sm:text-4xl">{v}</dd>
                <dd className="mt-1 text-xs text-[var(--muted)] sm:text-sm">{l}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The one bold moment: the loop as an inverse panel with oversized numerals. */}
        <figure
          className="panel-ink p-6 sm:p-8"
          aria-label="One section improving from 72 to 98 percent human across two passes"
        >
          <figcaption className="text-sm font-semibold opacity-80">One section, two passes</figcaption>
          <p className="font-display mt-2 text-6xl font-bold leading-none sm:text-7xl" aria-hidden>
            72<span className="opacity-40">→</span>98
          </p>
          <div className="mt-5 flex min-w-0 items-center gap-4">
            <ScoreRing value={72} size={56} />
            <div className="min-w-0 flex-1 space-y-2" aria-hidden>
              {[["Rhythm", "92%"], ["Voice", "88%"], ["Diction", "95%"]].map(([label, width]) => (
                <div key={label} className="flex min-w-0 items-center gap-3">
                  <span className="w-16 shrink-0 font-mono text-[11px] opacity-70">{label}</span>
                  <div className="meter min-w-0 flex-1">
                    <span style={{ width }} />
                  </div>
                </div>
              ))}
            </div>
            <ScoreRing value={98} size={56} />
          </div>
          <p className="mt-4 text-sm opacity-70">
            Draft, score, rewrite. Only improvements are kept, each with a diff.
          </p>
        </figure>
      </section>

      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12 sm:px-6 md:py-16">
        <h2 className="font-display max-w-xl text-balance text-3xl font-bold leading-tight sm:text-4xl">
          Everything a client-ready doc needs
        </h2>
        <ul className="mt-6 divide-y divide-[var(--border)] border-y border-[var(--border)]">
          {FEATURES.map((f) => (
            <li key={f.title} className="grid gap-1 py-5 sm:grid-cols-[200px_minmax(0,1fr)] sm:gap-6">
              <h3 className="text-base font-semibold">{f.title}</h3>
              <p className="max-w-[60ch] text-sm leading-relaxed text-[var(--muted)]">{f.body}</p>
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-[var(--accent-container)] p-6 text-[var(--on-accent-container)] sm:flex-row sm:items-center sm:justify-between">
          <p className="font-display text-2xl font-bold">Twelve templates. Three minutes.</p>
          <Link href="/signup" className="btn-accent shrink-0 px-6 py-3 font-semibold">
            Start free
          </Link>
        </div>
      </section>

      <section id="how" className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 md:py-16">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">Ninety seconds, three moves</h2>
          <ol className="mt-8 grid gap-8 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="flex gap-4">
                <span className="nchip h-fit shrink-0" aria-hidden>{s.n}</span>
                <div>
                  <h3 className="text-lg font-semibold">{s.t}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="sample" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12 sm:px-6 md:py-16">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">E-commerce platform RDD</h2>
            <p className="mt-3 max-w-[52ch] leading-relaxed text-[var(--muted)]">
              Twenty-two pages, four diagrams, every section above 95% human.
              Drafted, de-roboted and exported before the coffee cooled.
            </p>
            <Link href="/signup" className="btn-accent mt-6 inline-flex px-6 py-3 font-semibold">
              Make one like it
            </Link>
          </div>
          <div className="paper-card p-6 sm:p-8">
            <p className="text-sm font-semibold">Export report</p>
            <ul className="mt-4 divide-y divide-[var(--border)]">
              {[
                ["Executive Summary", 98],
                ["Architecture", 97],
                ["Requirements", 96],
                ["Risks", 99],
              ].map(([t, v]) => (
                <li key={t as string} className="flex items-center justify-between gap-3 py-3">
                  <span className="text-sm font-medium">{t}</span>
                  <ScoreRing value={v as number} size={40} />
                </li>
              ))}
            </ul>
            <p className="mt-2 font-mono text-xs text-[var(--muted)]">22 pages · 150 words each · PDF + DOCX</p>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-6">
          <p className="font-display text-lg font-bold">DocuForge</p>
          <p className="text-sm text-[var(--muted)]">Open stack, your models, your words.</p>
          <nav className="flex gap-5 text-sm font-medium" aria-label="Footer">
            <Link href="/login" className="nav-underline">Log in</Link>
            <Link href="/signup" className="nav-underline">Sign up</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
