# DocuForge DESIGN.md — visual source of truth

Single system for landing + product. One accent, one radius rule, one motion
budget. Any new screen must read as a sibling of the existing ones, not a cousin.

## 1. Atmosphere

Quiet editorial product with one bold moment per page. Neutral green-gray paper,
ink text, deep-lagoon accent, oversized grotesk numerals. Density: airy (3/10).
Variance: composed asymmetry, never chaos (7/10). Motion: restrained (4/10).

## 2. Color (locked tokens in `src/app/tokens.css` — the ONLY place for raw values)

- Ground: `--paper: #ecefec`, cards `--surface: #fafbf9`, tonal fills `--surface-variant: #dde2d9`
- Ink: `--ink: #141816`, secondary `--muted: #4c5652`, hairlines `--border: #d0d6cf`
- Accent (singular): `--accent: #0a5a50` with white text (7+:1). Tonal `--accent-container: #c9ecd9`.
- Signal `--signal: #d7f24b` lives ONLY inside the dark `panel-ink` moment + confetti. Nowhere else.
- Dark mode flips every token (M3 dark tones); `color-scheme` set on both.
- Banned: purple/blue glows, cream+brass craft palettes, gradients, glassmorphism, pure-black shadows.

## 3. Typography

- Display: Space Grotesk 700, tracking `-0.035em`, `text-wrap: balance`. Scale via
  `.h-hero` (clamp 3–6.5rem), `.h-page` (clamp 2.25–3.5rem), `.h-section` — never ad-hoc sizes.
- Body: Roboto 400/500, relaxed leading, `max-w-[65ch]`, `text-wrap: pretty`. Never pure black.
- Data/labels: JetBrains Mono (kickers, numerals, ids, status). Tabular numerals for figures.
- No serif. No Roboto-as-display. Emphasis = same-family bold/italic, never a mixed family.

## 4. Components

- Buttons are full-pill, min-height 52px accent / 48px others, bold labels, press `scale(0.98)`.
  Primary CTA icon rides inside its own `bg-white/20` circle (island architecture).
  One label per intent per page ("Start writing" = signup, "Log in" = login).
- Fields are tonal-filled (no outlines), label ABOVE, error BELOW, 16px text minimum.
- Cards are flat `paper-card` (22px radius, hairline border, no shadow); rows use
  `divide-y` hairlines with mono index numerals, never card grids for lists.
- Nav: single line ≤72px desktop; active item is an ink pill. Mobile gets a top bar + menu.
- Dialogs: native `<dialog>`, `overscroll-behavior: contain`, dimmed backdrop.
- States are mandatory: skeleton loaders matching layout shape, composed empty states
  with actions, inline form errors, toasts only for transient outcomes.

## 5. Layout

- Max width 6xl, auto margins. Sections breathe: `py-16 md:py-24`.
- Landing rhythm: split hero (headline ≤2 lines, subtext ≤20 words, 4 text elements max,
  CTAs above the fold) → proof strip → numbered rows → tinted band → pills → steps → split sample.
- Max 2 mono kickers per 6 sections. No split-header rows. One layout family per section.
- Every multi-column layout declares its <768px stack in the same component.

## 6. Motion

Budget: color fades, press scale, open/confirm/expand, ONE 200ms page entrance.
Lenis smooths wheel/anchor only (skipped under reduced motion, paused mid theme-wipe).
Theme change is a 260ms circle-wipe via View Transitions. Confetti only at ≥95% human.
`prefers-reduced-motion` kills everything. No scroll reveals, no springs, no loops.

## 7. Banned tells

Inter/Roboto display type, ALL-CAPS eyebrow on every section, 3-equal-card rows,
centered heroes, duplicate CTA labels, wrapped CTA text, cream+brass palettes,
purple glows, emojis, lorem/Acme placeholder content, `...` (use `…`).
