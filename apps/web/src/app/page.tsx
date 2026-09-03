"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ScoreRing, ThemeToggle } from "@/components/ui/ui";

/* ---------- scroll reveal (no-op under reduced motion) ---------- */
function Reveal({ children, delay = 0, className = "" }: { children: React.ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`rv min-w-0${inView ? " in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------- animated counter ---------- */
function Counter({ to, suffix = "", decimals = 0 }: { to: number; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [value, setValue] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(to);
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / 1200);
          setValue(to * (1 - Math.pow(1 - p, 3)));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);
  return (
    <span ref={ref}>
      {value.toFixed(decimals)}
      {suffix}
    </span>
  );
}

/* ---------- CSS-only studio mock ---------- */
function StudioMock() {
  return (
    <figure className="paper-sheet overflow-hidden" aria-label="Preview of the DocuForge studio">
      <div className="flex items-center gap-1.5 border-b border-[var(--border)] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--border)]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[var(--accent)]" />
        <figcaption className="ml-2 font-mono text-xs text-[var(--muted)]">studio / e-commerce-rdd</figcaption>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-4 text-left sm:grid-cols-[110px_minmax(0,1fr)_86px]">
        <div className="hidden space-y-2 sm:block" aria-hidden>
          {["Summary", "Goals", "Architecture", "Stack", "Risks"].map((t, i) => (
            <div key={t} className={`rounded-md px-2 py-1.5 text-[11px] font-medium ${i === 2 ? "mock-active" : ""}`}>
              {t}
            </div>
          ))}
        </div>
        <div className="min-w-0 space-y-2" aria-hidden>
          <div className="font-display truncate text-sm font-bold">System Architecture</div>
          {[92, 100, 87, 95].map((w, i) => (
            <div key={i} className="skeleton h-2" style={{ width: `${w}%` }} />
          ))}
          <div className="rounded-md border border-[var(--border)] p-2 font-mono text-[10px] text-[var(--muted)]">
            graph TD → API → DB
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-2" aria-hidden>
          <ScoreRing value={98} size={52} />
          <span className="rounded-full bg-[var(--accent)] px-2 py-1 text-[10px] font-bold text-white">Humanize</span>
        </div>
      </div>
    </figure>
  );
}

const TYPES = ["RDD", "PRD", "BRD", "Technical Design", "System Design", "Architecture", "Dev Plan", "Runbook", "SOP", "Incident Report", "Postmortem", "Roadmap"];

const BENTO = [
  {
    big: true,
    title: "A loop, not a prompt",
    body: "Draft → score each section → rewrite the weak ones. Every pass is versioned with a diff.",
  },
  {
    big: false,
    title: "Scores that explain themselves",
    body: "Rhythm, voice, and diction — the badge shows why, not just a number.",
  },
  {
    big: false,
    title: "150 words a page. Really.",
    body: "Sentence-aware pagination with a cover, contents, headers and footers.",
  },
  {
    big: false,
    title: "Pick your models",
    body: "Auto picks the cheapest capable writer — or pin your own per document.",
  },
  {
    big: false,
    title: "Private by design",
    body: "JWT on every endpoint, user/admin roles, opaque IDs.",
  },
];

const STEPS = [
  { n: "01", t: "Describe the idea", d: "A line or two. Pick a type — RDD, PRD, design doc — plus tone and models." },
  { n: "02", t: "Watch it de-robot itself", d: "Sections stream in scored. Humanize the weak ones; every rewrite keeps a diff." },
  { n: "03", t: "Export print-ready pages", d: "150 words a page, diagrams intact. PDF or DOCX in one click." },
];

export default function Landing() {
  return (
    <main>
      {/* Structured data: helps search engines list the product correctly. */}
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
      {/* ---------- nav ---------- */}
      <header className="sticky top-0 z-10 border-b border-[var(--border)] bg-[var(--paper)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-4 py-3 sm:px-6">
          <p className="font-display text-xl font-bold sm:text-2xl">DocuForge</p>
          <nav className="hidden items-center gap-6 text-sm font-medium md:flex" aria-label="Sections">
            <a href="#how" className="nav-underline">How it works</a>
            <a href="#features" className="nav-underline">Features</a>
            <a href="#sample" className="nav-underline">Sample</a>
          </nav>
          <nav className="flex items-center gap-2 sm:gap-3" aria-label="Account">
            <ThemeToggle />
            <Link href="/login" className="btn-ghost hidden px-5 py-2 text-sm font-semibold sm:block">
              Log in
            </Link>
            <Link href="/signup" className="btn-accent px-4 py-2 text-sm font-semibold hover:-translate-y-px sm:px-5">
              Start writing
            </Link>
          </nav>
        </div>
      </header>

      {/* ---------- hero ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-8 px-5 pb-8 pt-10 sm:px-6 md:grid-cols-2 md:gap-10 md:pt-20">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-[var(--accent-ink)]">
            Generate → Detect → Humanize
          </p>
          <h1 className="font-display mt-4 text-balance text-[2.75rem] font-bold leading-[1.04] tracking-[-0.03em] sm:text-5xl md:text-6xl">
            Idea in. <em className="italic text-[var(--accent-ink)]">Human-feeling</em> document out.
          </h1>
          <p className="mt-5 max-w-xl text-pretty text-lg leading-relaxed text-[var(--muted)]">
            Client-ready RDDs, PRDs and design docs — with diagrams and
            150-words-a-page typesetting, rewritten until they read human.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/signup" className="btn-accent cta group justify-center px-7 py-3 font-semibold hover:-translate-y-px">
              Draft your first doc
              <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <Link href="/login" className="btn-ghost justify-center px-7 py-3 font-semibold">
              Open the studio
            </Link>
          </div>
          <div className="mt-7 grid max-w-md grid-cols-3 gap-3 sm:gap-4 md:mt-10">
            {[
              { v: <Counter to={90} suffix="s" />, l: "idea to draft" },
              { v: <Counter to={95} suffix="%+" />, l: "human target" },
              { v: <Counter to={150} />, l: "words a page" },
            ].map(({ v, l }) => (
              <div key={l} className="min-w-0">
                <p className="font-display text-[1.7rem] font-bold leading-none sm:text-4xl">{v}</p>
                <p className="mt-1 text-xs sm:text-sm text-[var(--muted)]">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <Reveal delay={120} className="float-soft">
          <StudioMock />
        </Reveal>
      </section>

      {/* ---------- marquee ---------- */}
      <div className="overflow-hidden border-y border-[var(--border)] py-3" aria-hidden>
        <div className="marquee flex w-max font-mono text-sm text-[var(--muted)]">
          {[...TYPES, ...TYPES].map((t, i) => (
            <span key={i} className="flex items-center gap-8 pr-8">
              {t} <span className="text-[var(--accent)]">///</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- bento ---------- */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12 sm:px-6 md:py-16">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Why DocuForge</p>
          <h2 className="font-display mt-3 max-w-xl text-balance text-4xl font-bold leading-[1.1]">Everything a client-ready doc needs.</h2>
        </Reveal>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {BENTO.map((f, i) => (
            <Reveal key={f.title} delay={(i % 3) * 90} className={f.big ? "md:col-span-2" : ""}>
              <article className="paper-card lift h-full min-w-0 p-5 sm:p-7">
                <div className="flex items-center gap-3">
                  <span className="chip" aria-hidden>
                    {i === 0 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 2l4 4-4 4" />
                        <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
                        <path d="M7 22l-4-4 4-4" />
                        <path d="M21 13v1a4 4 0 0 1-4 4H3" />
                      </svg>
                    ) : i === 1 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="9" r="6" />
                        <path d="M8.5 14L7 22l5-3 5 3-1.5-8" />
                      </svg>
                    ) : i === 2 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <path d="M14 2v6h6M9 13h6M9 17h6" />
                      </svg>
                    ) : i === 3 ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="4" y="4" width="16" height="16" rx="2" />
                        <path d="M9 9h6v6H9zM4 10h-2M4 14h-2M22 10h-2M22 14h-2M10 4V2M14 4V2M10 22v-2M14 22v-2" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-3.6 8-10V5l-8-3-8 3v7c0 6.4 8 10 8 10z" />
                        <path d="M9 12l2 2 4-4" />
                      </svg>
                    )}
                  </span>
                  <h3 className={`font-display font-bold ${f.big ? "text-2xl" : "text-xl"}`}>{f.title}</h3>
                </div>
                <p className="mt-3 max-w-[46ch] text-sm leading-[1.7] text-[var(--muted)]">{f.body}</p>
                {f.big ? (
                  <div className="mt-5 flex min-w-0 items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--paper)] p-4 sm:gap-4">
                    <ScoreRing value={72} size={52} />
                    <svg className="shrink-0" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                    <ScoreRing value={98} size={52} />
                    <span className="min-w-0 text-xs text-[var(--muted)] sm:text-sm">one section, two passes</span>
                  </div>
                ) : i === 1 ? (
                  <div className="mt-4 space-y-2" aria-hidden>
                    {[
                      ["Rhythm", "92%"],
                      ["Voice", "88%"],
                      ["Diction", "95%"],
                    ].map(([label, width]) => (
                      <div key={label} className="flex min-w-0 items-center gap-3">
                        <span className="w-16 shrink-0 font-mono text-[11px] text-[var(--muted)]">{label}</span>
                        <div className="meter min-w-0 flex-1">
                          <span style={{ width }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : i === 2 ? (
                  <div className="mt-4 flex items-center gap-4" aria-hidden>
                    <span className="page-stack">
                      <i />
                      <i />
                      <b>150</b>
                    </span>
                    <span className="font-mono text-[11px] leading-relaxed text-[var(--muted)]">
                      cover
                      <br />
                      contents
                      <br />
                      body…
                    </span>
                  </div>
                ) : i === 3 ? (
                  <div className="mt-4 flex flex-wrap gap-2" aria-hidden>
                    <span className="pill">
                      <span className="dot dot-ember" />
                      405B · writes
                    </span>
                    <span className="pill">
                      <span className="dot dot-good" />
                      8B · humanizes
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-[11px] text-[var(--muted)]" aria-hidden>
                    <span className="pill">JWT</span>
                    <span className="pill">roles</span>
                    <span className="pill">UUID ids</span>
                  </div>
                )}
              </article>
            </Reveal>
          ))}
          <Reveal delay={180} className="md:col-span-2">
            <Link href="/signup" className="paper-card lift flex h-full min-h-40 flex-col justify-between gap-4 bg-[var(--ink)] p-7 text-[var(--paper)] dark:bg-[var(--accent)] dark:text-white md:min-h-0 md:flex-row md:items-center">
              <p className="font-display text-2xl font-bold md:whitespace-nowrap">Twelve templates. Three minutes.</p>
              <span className="font-semibold underline underline-offset-4">Start free →</span>
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ---------- how ---------- */}
      <section id="how" className="scroll-mt-20 border-y border-[var(--border)] bg-[var(--surface)]">
        <div className="mx-auto max-w-6xl px-5 py-12 sm:px-6 md:py-16">
          <Reveal>
            <h2 className="font-display text-4xl font-bold">Ninety seconds, three moves</h2>
          </Reveal>
          <ol className="mt-8 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <li className="lift h-full rounded-2xl border border-[var(--border)] bg-[var(--paper)] p-7">
                  <span className="nchip">{s.n}</span>
                  <h3 className="font-display mt-3 text-xl font-bold">{s.t}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{s.d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- sample ---------- */}
      <section id="sample" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-12 sm:px-6 md:py-16">
        <div className="grid items-center gap-8 md:grid-cols-2">
          <Reveal>
            <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">Fresh from the studio</p>
            <h2 className="font-display mt-2 text-4xl font-bold">E-commerce platform RDD</h2>
            <p className="mt-3 leading-relaxed text-[var(--muted)]">
              Twenty-two pages, four diagrams, every section above 95% human —
              drafted, de-roboted and exported before the coffee cooled.
            </p>
            <Link href="/signup" className="btn-accent cta group mt-6 inline-flex px-6 py-3 font-semibold">
              Make one like it
              <svg className="cta-arrow" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
          </Reveal>
          <Reveal delay={120}>
            <div className="paper-sheet p-8">
              <p className="font-mono text-xs uppercase tracking-widest text-[var(--muted)]">Export report</p>
              <div className="mt-4 space-y-3">
                {[
                  ["Executive Summary", 98],
                  ["Architecture", 97],
                  ["Requirements", 96],
                  ["Risks", 99],
                ].map(([t, v]) => (
                  <div key={t as string} className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
                    <span className="font-medium">{t}</span>
                    <ScoreRing value={v as number} size={40} />
                  </div>
                ))}
              </div>
              <p className="mt-4 font-mono text-xs text-[var(--muted)]">22 pages · 150 words each · PDF + DOCX</p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-[var(--border)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 sm:px-6">
          <p className="font-display text-xl font-bold">DocuForge</p>
          <p className="text-sm text-[var(--muted)]">Open stack, your models, your words.</p>
          <nav className="flex gap-4 text-sm font-medium" aria-label="Footer">
            <Link href="/login" className="nav-underline">Log in</Link>
            <Link href="/signup" className="nav-underline">Sign up</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
