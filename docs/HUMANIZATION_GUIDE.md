# Humanization Guide — how DocuForge drafts stop reading like AI

Target: **≥95% human per section** (100% badge when the doc average gets
there) within **≤3 rewrite passes**. Everything below is enforced in code,
not vibes.

## 1. Generate with a human voice first (Appendix A prompt)

The writer prompt bakes the voice in: sentence length 10–26 words mixed,
active voice, contractions, one vivid example per section, and a banned
list (`delve, leverage, comprehensive, foster, furthermore, moreover`).
Fixing tone at generation time is cheaper than rewriting later.

## 2. Detect with reasons, not just a number (`services/detector.py`)

spaCy `en_core_web_sm` + `textstat` score five signals on Vercel:

| Signal | What it measures | Human direction |
|---|---|---|
| Burstiness | std-dev of sentence lengths | high variance, not metronomic |
| Passive ratio | `nsubjpass` share | active voice |
| Cliché hits | matcher on AI-tell phrases | zero hits |
| Contraction ratio | `don't/can't` density | contractions present |
| Flesch | reading ease | ~50–70, not flat |

Sapling API blends in when configured; HF `roberta-base-openai-detector`
is local opt-in only (`DETECTOR_MODE=local`). No detector reachable →
`Demo estimate` badge, never persisted as `human_score`.

## 3. Rewrite with feedback (Appendix B prompt, max 3 passes)

Each pass feeds the detector's top drivers back into the humanizer
("your passive ratio is 0.4 — convert to active voice"), keeps meaning
and structure, then re-scores. Only improvements are versioned, every
version keeps a before/after diff.

## 4. Verify in the studio

Green ring ≥90, amber 70–89, red <70. Hover any badge for the top-3
`reasons[]`. Doc average ≥95 triggers the "Reads fully human" state.
Edit → Save & rescore any section by hand; the loop resumes from there.
