import Link from "next/link";
import { ScoreRing, ThemeToggle } from "@/components/ui/ui";

/**
 * Shared auth frame: inverse brand panel beside the form.
 * Mobile shows a compact wordmark; the full panel is the desktop bold moment.
 */
export default function AuthShell({
  title,
  lede,
  children,
}: {
  title: string;
  lede: string;
  children: React.ReactNode;
}) {
  return (
    <main className="relative mx-auto grid min-h-dvh w-full max-w-6xl items-center gap-8 px-5 py-10 sm:px-6 md:grid-cols-[1.05fr_minmax(0,1fr)] md:gap-12 md:py-16">
      <div className="absolute right-5 top-5 sm:right-6 sm:top-6">
        <ThemeToggle />
      </div>
      <div className="min-w-0 md:hidden">
        <Link href="/" className="font-display text-2xl font-bold">
          DocuForge
        </Link>
      </div>

      <figure
        className="panel-ink hidden min-w-0 flex-col justify-between gap-10 p-8 md:flex lg:p-10"
        aria-label="One section improving from 72 to 98 percent human across two passes"
      >
        <Link href="/" className="font-display text-2xl font-bold">
          DocuForge
        </Link>
        <div>
          <p className="font-display text-7xl font-bold leading-none lg:text-8xl" aria-hidden>
            72<span className="opacity-40">→</span>98
          </p>
          <div className="mt-6 flex items-start justify-between gap-4">
            <div>
              <ScoreRing value={72} size={56} />
              <p className="mt-2 font-mono text-[11px] opacity-60">First draft</p>
            </div>
            <div className="text-right">
              <ScoreRing value={98} size={56} />
              <p className="mt-2 font-mono text-[11px] opacity-60">After rewrite</p>
            </div>
          </div>
          <div className="meter mt-5" aria-hidden>
            <span style={{ width: "92%" }} />
          </div>
          <figcaption className="mt-5 max-w-[38ch] text-sm leading-relaxed opacity-70">
            Draft, score, rewrite. Only improvements are kept — every pass versioned with a diff.
          </figcaption>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs opacity-70">
          <li>150 words a page</li>
          <li>12 templates</li>
          <li>PDF + DOCX</li>
        </ul>
      </figure>

      <div className="min-w-0">
        <h1 className="h-page">
          {title}
        </h1>
        <p className="mt-3 max-w-[44ch] text-pretty text-base leading-relaxed text-[var(--muted)] sm:text-lg">{lede}</p>
        <div className="paper-card mt-6 p-5 sm:mt-8 sm:p-7">{children}</div>
      </div>
    </main>
  );
}
