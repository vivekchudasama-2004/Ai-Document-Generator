# DocuForge Humanized — Detailed Architecture & Project Plan
**Version:** 1.7.0 | **Date:** 2026-09-03 | **Stack:** Open-Source + NVIDIA NIM on Vercel + TiDB Cloud | **Format:** Professional, 150 words/page, 100% Human Score Target
**Changelog v1.7.0:** Auto mode (complexity-scored, token-optimized, default) + live NVIDIA availability + Manage-models UI + per-user enabled set; 150-word minimum rebalance; airier cards + one-line CTA; SEO (metadata, sitemap, robots, JSON-LD).
**Changelog v1.6.0:** Real Cloudinary signed uploads; Sapling blend fallback; per-doc usage ledger + admin tokens/audits; cover + exact-TOC export; SSE model.fallback events; per-model prompt rails; tests sealed off-network.
**Changelog v1.5.1:** ErrorBoundary isolation — per-section studio cards, console, dashboard panels, wizard, admin list, page-level fallback; one crash never kills a page.
**Changelog v1.5.0:** Central error envelope (`error_codes.py` + `messages.py` + `fail()`), global 413/502 AI handlers, `409` on duplicate signup, frontend `messages.ts` + envelope-aware `ApiError`; shared UI components + refresh controls + readable names.
**Changelog v1.3.0:** Opaque UUID v4 IDs everywhere (no sequential ints in any API); global auth (all `/api/*` require JWT except `GET /api/health`); `user`/`admin` roles with manual admin seed SQL (Appx D) + `/api/admin/*` + `/admin` dashboard; P0 closes: regenerate-section model param, 405b→70b→8b fallback chain + SSE `model.fallback`/`Retry-After`, per-model token budgets + per-doc usage, detect/status shape, user_id scoping rule.
**Changelog v1.2.0:** Analyzer pinned to spaCy `en_core_web_sm` + `textstat` (+ `tiktoken` budgets) on Vercel; writer = NIM catalog with user model picker (defaults 405b generate / 8b humanize); per-doc model override + `GET /api/meta/models`. Supersedes v1.1.0 (TiDB-only, print-CSS PDF, DETECTOR_MODE). See `PROJECT_ANALYSIS.md` for rationale.
**Changelog v1.1.0:** TiDB-only (SQLite/Docker/VPS refs removed); PDF = client print-CSS MVP + async worker (WeasyPrint off Vercel); detector `DETECTOR_MODE` switch + honest Demo Mode; Mermaid client-side; SSE streaming contract + `maxDuration`; 4 missing APIs added; DB cascade/`updated_at` fixes. See `PROJECT_ANALYSIS.md` for rationale.

---

## 1. Executive Summary
DocuForge Humanized is an end-to-end document intelligence platform that lets any person generate detailed, professional reports, RDDs (Requirements & Design Documents), and development plans with full architecture, tooling, and requirements. The platform solves the real problem that AI-generated docs feel robotic and fail professional standards. Our solution is a **Generate → Detect → Humanize Loop** that iterates until content scores as 100% human on open-source detectors, then exports as paginated PDF/DOCX with strict 150 words/page and editorial formatting. Built entirely on open-source tools with NVIDIA NIM as the only managed AI API, it runs on Vercel + TiDB Cloud with local/prod parity (no Docker), ensuring persistence, versioning, and audit trails for every document.

## 2. Vision & Problem Statement
**Problem:** Teams waste weeks writing RDDs/PRDs; AI tools produce generic, detectable, poorly formatted text with no architecture diagrams, no tool justification, and no professional pagination. Readers instantly sense AI tone. **Vision:** One-click studio where idea → professional, human-feeling document in 90 seconds, with architecture diagrams, tool tables, and 150-word pages that pass AI detectors as human. **Users:** Founders, freelancers, students, dev agencies who need client-ready docs. **Success Metric:** 80% of docs exported without manual edits; detector human score ≥95% (target 100%) after ≤3 humanize iterations; PDF passes print-ready check.

## 3. Goals & Non-Goals
**Goals:** (1) Generate 7-12 section docs for ANY template — PRD/BRD/RDD, Technical & System Design, Architecture, Runbook/SOP, Incident Report/Postmortem, Dev Plan, Roadmap — each with Mermaid diagrams and 150 words/page. (2) Enforce 150 words/page with widow/orphan control. (3) Achieve 100% human score via detector-guided rewriting. (4) Export print-ready PDF/DOCX with cover, TOC, headers/footers, page numbers. **Non-Goals:** Real-time collaboration (v2), plagiarism check, LMS integration. **MVP Scope:** Single-tenant local, one doc at a time, English only. MVP templates: `rdd, prd, technical_design` first; remaining 9 added data-only via `GET /api/templates` (no new prompts).

## 4. Stakeholders & Requirements

### 4.1 Functional Requirements (Must/Should/Could)
- **F1 [Must]** Generate doc from prompt (idea, type, tone, depth) for 12 templates: `rdd, prd, brd, technical_design, system_design, architecture, development_plan, runbook, sop, incident_report, postmortem, pm_roadmap` — streaming sections.
- **F2 [Must]** Detect AI score per section using spaCy `en_core_web_sm` + `textstat` heuristic on Vercel (burstiness, passive ratio, cliche hits, contraction ratio, Flesch) + Sapling API fallback + HF `roberta-base-openai-detector` local opt-in, and show human% badge with reason breakdown.
- **F3 [Must]** Humanize loop: rewrite with user-selected NIM model (default 8b) → re-detect with spaCy+textstat until human% ≥95% (user sees 100% target) max 3 iterations, per-section or all. User picks generation + humanize models in wizard/studio; per-doc override stored.
- **F4 [Must]** 150 words/page pagination engine with professional styling.
- **F5 [Must]** Export PDF/DOCX with cover, TOC, headers, footers, page numbers, diagrams.
- **F6 [Must]** Persist projects/docs/sections/versions (TiDB Cloud serverless — no volumes, survives redeploys/restarts).
- **F7 [Should]** Visual diff before/after humanize + version history.
- **F8 [Should]** Edit any section + re-humanize single section.
- **F9 [Must]** Template gallery with all 12 types, each with its own section outline + example prompts (Technical/System Design, Runbook/SOP with steps, Incident Report with timeline/root cause, PRD/BRD/RDD/PM docs).

### 4.2 Non-Functional Requirements
- **Performance:** First section <4s, full 7-section doc <45s. Detector <800ms/section. PDF <5s for 20 pages.
- **Quality:** PDF passes PDF/A, WCAG AA for viewer, 150±2 words/page, no orphan lines.
- **Reliability:** Data survives Vercel redeploy/restart (TiDB Cloud, no volumes). Health endpoint + graceful fallback to mock (`NIM_MOCK=true`) if NIM offline.
- **Security:** No secrets in code, `.env.example`, rate-limit public endpoints, XSS-safe rendering.
- **Portability:** Identical local/prod API contract via shared Vercel env parity; pinned images/lockfiles (`pnpm-lock.yaml`, `requirements.txt`). No Docker.

## 5. User Flow & Interaction Design
**Flow:** Dashboard (project cards + templates) → New Document (form: title, idea 1-2 lines, type, tone, depth, audience) → Generation Studio (3-pane: left outline with word count + detector badge per section; center paginated paper preview with shadows and serif headings; right Humanize Console with score ring, iteration history, strength slider) → streaming sections appear with skeleton → per-section Humanize button → Export. **Key Interactions:** Drag outline to reorder, click section to jump, before/after diff toggle, "Humanize All" batch. **Empty State:** Ghost document with 3 clickable examples (“E-commerce RDD”, “AI SaaS PRD”). **States:** Loading skeletons, empty with CTA, error with retry, success toast on export.

## 6. System Architecture

### 6.1 High-Level (Open-Source + NIM + TiDB on Vercel — No Docker, TiDB-only)
```
[ Next.js 14 Frontend — Vercel (apps/web) — Tailwind, TipTap, Mermaid ]
        ↕ REST /api/* (JSON, JWT Bearer)
[ FastAPI — Vercel Python Serverless (apps/api/src/app) ] — [ HF Detector (transformers, local) ]
        ↕                         ↕
[ TiDB Cloud (MySQL protocol, serverless) ]  [ NVIDIA NIM API (integrate.api.nvidia.com/v1) ]
   (users, projects, docs, sections)          [ Resend/SendGrid Email (forgot-password) ]
        ↕                                      [ Cloudinary Free (objects: PDFs/DOCXs/SVGs) ]
[ PDF Engine (WeasyPrint + ReportLab + python-docx) ] —→ [ Cloudinary upload → secure_url stored in TiDB `exports` ]
```
No Docker/Nginx, no SQLite/volumes. Local `pnpm dev` (web:3000) + `uvicorn apps/api/src/app/main.py` (api:8000) proxies to same `/api/*` as Vercel production. Frontend never calls NIM/TiDB directly — backend proxies, validates JWT, rate-limits.

**Vercel constraints (binding):** (a) PDF: MVP export = client print-CSS (`window.print`, `@page` CSS) — zero server deps. Full WeasyPrint PDF runs only in async worker (Render/Fly.io Docker) called via queue, uploads to Cloudinary. (b) Detector: Vercel default `DETECTOR_MODE=spacy+api` = spaCy `en_core_web_sm` + `textstat` heuristic + Sapling API fallback; HF-local only in local Docker profile (`DETECTOR_MODE=local`). `tiktoken` enforces token budgets before every NIM call. (c) Mermaid: rendered client-side with `mermaid.js`; backend stores SVG string only, never runs Mermaid CLI. (d) Long gen: `POST /api/generate/stream` uses SSE + Vercel `maxDuration: 60`, persists each section as it arrives so dropped streams resume.

### 6.2 Component Breakdown
- **Frontend (apps/web):** Next.js 14 App Router, `src/app/(auth)` for login/signup/forgot, `src/app/(main)` for protected studio, `tokens.css` design system, paginated viewer, Mermaid renderer, TipTap editor. `middleware.ts` guards `(main)` routes via JWT cookie.
- **Backend (apps/api/src/app):** Layered `routes → services → repositories → db` — never skip layer (`controllers/` merged into routes). `core/config.py` (TiDB + NIM + JWT + Resend env), `core/security.py` (JWT, bcrypt, forgot-token), `db/client.py` (TiDB SQLAlchemy singleton), `entities/*.py` (users, projects, docs, sections), `schemas/*.py` (auth, generate, humanize), `services/llm/nim_client.py` (NIM streaming), `services/detector.py` + `services/humanizer.py` + `services/pdf.py`.
- **Detector Service:** spaCy `en_core_web_sm` (preload at import, `disable=["ner"]` unless entity density needed) + `textstat` (Flesch/grade) as the Vercel analyzer: burstiness = sent-length std via `doc.sents`, passive ratio via `nsubjpass`, cliche hits via Matcher (`delve, leverage, comprehensive, foster, in conclusion...`), contraction ratio, TTR, `tiktoken` budgets. Sapling API fallback; `transformers roberta-base-openai-detector` lazy only for `DETECTOR_MODE=local`. Heuristic-only fallback labeled `Demo estimate` + `DEMO_MODE` banner, never persisted as real `human_score`. Score response includes `reasons[]` (top 3 drivers) for the UI badge tooltip.
- **NIM Integration:** `nim_client.py` with timeout 30s, retry 3x exp-backoff on 429/5xx, streaming, OpenAI-compatible `integrate.api.nvidia.com/v1`, env `NVIDIA_NIM_API_KEY`, cost-header logging, `NIM_MOCK=true` template fallback for offline demo, fallback chain generate `405b → 70b → 8b` on 429/5xx with `Retry-After` surfaced via SSE `event: model.fallback`, per-model `max_tokens` budgets in catalog + `tiktoken` pre-check (413 if over), `usage{prompt,completion,model}` persisted per document. Model catalog in `services/models.py` (id, label, role `generate|humanize|both`, context, cost tier, default flag). Defaults: generate `meta/llama-3.1-405b-instruct` (fallback 70b), humanize `meta/llama-3.1-8b-instruct`. User override via `generation_model` / `humanize_model` params (validated against `ALLOWED_MODELS`); per-doc choice stored on `documents`. `GET /api/meta/models` lists catalog + defaults + availability.
- **Auth & Email:** `core/security.py` hashes with bcrypt, issues JWT with `sub=user_id(UUID)` + `role` claim (access 1h, refresh 7d), `require_role()` dependency for admin, forgot flow: `POST /api/auth/forgot-password` → creates `password_reset_tokens` (expires 15m) → Resend email with magic link `https://app.vercel.app/reset-password?token=xxx` → `POST /api/auth/reset-password`.

### 6.3 Data Flow (with Auth)
1. User `POST /api/auth/signup` or `POST /api/auth/login` → JWT cookie + `Authorization: Bearer` → `middleware.ts` allows `(main)`.
2. Forgot: `POST /api/auth/forgot-password {email}` → if user exists, create token → Resend email → user clicks link → `POST /api/auth/reset-password {token, newPassword}` → bcrypt update.

### 6.4 Data Flow (Generate → Detect → Humanize)
1. User submits idea → backend builds system prompt with type/tone/depth + professional format rules (150 wpp hint).
2. NIM generates full markdown (7 sections + mermaid code blocks) streamed.
3. Post-processor splits into sections, counts words, renders Mermaid → SVG, stores.
4. Detector scores each section → human% stored.
5. If Humanize requested → humanizer rewrites that section with “write like human: varied sentence length, contractions, anecdotes, active voice” + detector feedback → re-score loop.
6. Export → pagination engine splits content into pages of exactly 150 words (respect sentence boundaries, move widow), builds HTML with `@page` CSS, renders via WeasyPrint to PDF with TOC and page numbers.

## 7. Open-Source Technology Stack (No Paid APIs Except NIM)

| Layer | Tool | License | Why Chosen |
|-------|------|---------|------------|
| Frontend | Next.js 14, React 18, Tailwind CSS, TipTap, Mermaid.js | MIT | Production-grade, paginated print CSS, open |
| Backend | FastAPI, Uvicorn, Pydantic, SQLModel | MIT | Fast, typed, auto docs |
| DB | **TiDB Cloud** (MySQL-compatible Serverless) + SQLAlchemy + PyMySQL + Alembic | Apache 2.0 / BSL | Serverless, MySQL protocol, Vercel-native, auto-scale, HTAP | 
| AI Generation | **NVIDIA NIM** (`llama-3.1-405b/8b`) via OpenAI-compatible API | Managed (your key) | Your existing key, generous free tier, best quality |
| AI Humanization | Same NIM with humanize system prompt + self-hosted `Qwen2.5-7B` fallback via Ollama (optional) | Apache 2.0 | Free fallback if NIM offline |
| Analyzer | spaCy `en_core_web_sm` + `textstat` + `tiktoken` (Vercel) + Sapling free API fallback | MIT | Burstiness/passive/cliche/Flesch reasons[]; ~ms, $0; HF opt-in via `DETECTOR_MODE=local` |
| Models | NIM catalog (`services/models.py` + user picker, OpenAI-compatible) | Managed (your key) | Defaults 405b gen / 8b humanize; `ALLOWED_MODELS` validated override |
| PDF | Client print-CSS (`@page`, MVP) + async worker (WeasyPrint + ReportLab + python-docx, Docker on Render/Fly) | BSD/MIT | MVP zero-deps; worker for pixel-perfect PDF/A |
| Diagrams | mermaid.js client-side render, SVG string stored | MIT | No Mermaid CLI on serverless; backend sanitizes SVG (strip `<script>`/`on*`) |
| Infra | **Vercel Free Tier** (Next.js frontend + Python Serverless for FastAPI) — **No Docker / No Nginx** | Vercel | Zero-ops, Vercel-native, free tier, localhost `pnpm dev` == prod |
| Auth | JWT (python-jose) + bcrypt + **Resend/SendGrid free tier** for forgot-password email | MIT | Login/Signup/Forgot via email OTP/link |
| Email | Resend (free 100/day) or SendGrid free | MIT | Forgot password magic link + OTP |
| Storage (Objects) | **Cloudinary Free** (25GB, or free alternative: Vercel Blob free / S3 free tier) — for PDFs, DOCXs, Mermaid SVGs | Free tier | `cloudinary` SDK, `CLOUDINARY_URL`, signed upload, `secure_url` + `public_id` stored in TiDB |
| Testing | Vitest, Playwright, pytest, httpx | MIT | Full coverage |

**Free Detector APIs Used:** HF Pipeline (local, no key), Sapling `https://api.sapling.ai/api/v1/aidetect` (free 100 req/day), heuristic fallback ensures offline 100% coverage.

## 8. AI Humanization Pipeline — To Achieve 100% Human Score
**Step 1 Generate:** System prompt enforces human tone from start: “You are a senior tech writer. Vary sentence length 8-28 words, use contractions, active voice, occasional rhetorical question, concrete examples. Avoid AI phrases: ‘delve’, ‘in conclusion’, ‘leverage’.” **Step 2 Detect:** For each section, run detector → score `ai_prob` 0-1 → `human% = 100*(1-ai_prob)`. Show ring: green ≥90, amber 70-89, red <70. **Step 3 Humanize Loop (max 3):** If human% <95, call humanizer: prompt = “Rewrite to sound fully human. Keep meaning, 150 words count not needed here. Add burstiness, idiom, human imperfections. Avoid detector triggers.” Re-detect → if improved, store new version + diff. Loop until human% ≥95 or 3 tries. **Step 4 Verify:** Final aggregate doc human% = avg of sections. Badge “100% Human” if avg ≥95. User can manually edit then re-detect one section. **Fallback (DEMO_MODE only):** If detector offline, heuristic estimates (0th=45%, 1st=78%, 2nd=92%, 3rd=98%) shown with `Demo estimate` badge + banner, never written to `human_score`. Real scores require HF-local or Sapling API. Mock LLM path: `NIM_MOCK=true` serves template docs for offline demo.

## 9. Professional Format & 150 Words/Page Engine
**CSS @page:** `size: A4; margin: 2.5cm 2cm 2.5cm 2cm; @bottom-center: counter(page) " / " counter(pages)`. **Cover:** Project title, subtitle (doc type), date, version, author. **TOC:** Auto from sections with dot leaders + page numbers (WeasyPrint `target-counter`). **Headers:** Document title on even, section on odd. **Pagination Algorithm:** `pdf.py` tokenizes into sentences → builds pages greedily to 150 words (±2) → if last page <75 words, borrow from previous → ensures no widow (single line orphan) → injects `page-break-after: always`. Word count excludes code/diagrams. **Diagrams:** Mermaid SVG scaled to fit page width, caption. **Typography:** Serif headings (Newsreader 700), sans body (Inter 400, 11pt, 1.6 line-height), code in JetBrains Mono.

## 10. Database Schema (TiDB Cloud — MySQL-compatible, Serverless)

**Connection:** `mysql+pymysql://user:pass@gateway01.tidbcloud.com:4000/docuforge?ssl_ca=/etc/ssl/certs/ca-certificates.crt` via `db/client.py` SQLAlchemy singleton. Alembic migrations.

```sql
-- users + auth
users(id CHAR(36) PRIMARY KEY DEFAULT (UUID()), email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, display_name VARCHAR(100), role ENUM('user','admin') NOT NULL DEFAULT 'user', is_active BOOLEAN DEFAULT TRUE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP);
password_reset_tokens(id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, token VARCHAR(128) UNIQUE NOT NULL, expires_at TIMESTAMP NOT NULL, used BOOLEAN DEFAULT FALSE, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE);

-- projects & docs (user-owned)
projects(id CHAR(36) PRIMARY KEY DEFAULT (UUID()), user_id CHAR(36) NOT NULL, title VARCHAR(255) NOT NULL, slug VARCHAR(255) UNIQUE, idea TEXT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_projects_user (user_id));
documents(id CHAR(36) PRIMARY KEY DEFAULT (UUID()), project_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, generation_model VARCHAR(128) DEFAULT 'meta/llama-3.1-405b-instruct', humanize_model VARCHAR(128) DEFAULT 'meta/llama-3.1-8b-instruct', type ENUM('rdd','prd','brd','technical_design','system_design','architecture','development_plan','runbook','sop','incident_report','postmortem','pm_roadmap'), tone ENUM('formal','startup','enterprise'), depth ENUM('brief','detailed'), title VARCHAR(255), status ENUM('draft','generating','humanizing','ready','exported'), human_score_avg DECIMAL(5,2), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id), INDEX idx_docs_project (project_id), INDEX idx_docs_user (user_id));
sections(id CHAR(36) PRIMARY KEY DEFAULT (UUID()), document_id CHAR(36) NOT NULL, title VARCHAR(255), order_idx INT, content_md MEDIUMTEXT, content_humanized_md MEDIUMTEXT, word_count INT, ai_score DECIMAL(5,2), human_score DECIMAL(5,2), iteration INT DEFAULT 0, mermaid_svg MEDIUMTEXT, FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE, INDEX idx_sections_doc (document_id));
versions(id CHAR(36) PRIMARY KEY DEFAULT (UUID()), document_id CHAR(36) NOT NULL, version_no INT, snapshot_json JSON, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE);
exports(id CHAR(36) PRIMARY KEY DEFAULT (UUID()), document_id CHAR(36) NOT NULL, user_id CHAR(36) NOT NULL, format ENUM('pdf','docx'), path VARCHAR(512), cloudinary_public_id VARCHAR(255), secure_url VARCHAR(512), pages INT, words_total INT, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE);
```
UUID v4 opaque IDs for every table (`CHAR(36) PRIMARY KEY DEFAULT (UUID())`; FK columns `CHAR(36)`). Sequential integer IDs are forbidden: never exposed in any API request/response/URL, never accepted as input (Pydantic `UUID4`, 404 on invalid — no enumeration). TiDB `AUTO_RANDOM` rejected (so integer PKs never leak via `LAST_INSERT_ID`/offset pagination. Cursor pagination uses `created_at+id`). All FKs enforced with `ON DELETE CASCADE` (incl. `documents.user_id`, `exports.user_id`); `updated_at` on projects/documents/sections for dashboard sort. Object `secure_url` + `public_id` from **Cloudinary free** (fallback: local `data/exports/` if `CLOUDINARY_URL` missing). Indices on `user_id`, `project_id`, `document_id`. Migrations via `apps/api/alembic/`.

## 11. API Specification (FastAPI, OpenAPI at `/docs`) — All Required APIs

Base URL: `http://localhost:8000` | Auth: JWT enforced globally — every `/api/*` requires auth except `GET /api/health` (liveness, no data). Web via httpOnly `Secure; SameSite=Lax` cookie, API via `Authorization: Bearer`; `POST /api/auth/refresh` rotates. JWT carries `role: user|admin`; admin routes guard with `require_role('admin')`. Every data query scoped `WHERE user_id = me` (admin bypass only on `/api/admin/*`) | Rate-limit: `60/min` via `slowapi` (forgot-password `5/min`/IP) | All request/response `application/json` unless noted.

### 11.1 Auth APIs (5 endpoints — JWT + Email)

| # | Method | Endpoint | Purpose | Request | Response | Notes |
|---|--------|----------|---------|---------|----------|-------|
| 1 | `POST` | `/api/auth/signup` | Register | `{email, password (>=8), display_name?}` | `{id, email, access_token, refresh_token}` | bcrypt hash, JWT 1h/7d, sets `httpOnly` cookie |
| 2 | `POST` | `/api/auth/login` | Login | `{email, password}` | `{access_token, refresh_token, user:{id,email}}` | 401 if wrong |
| 3 | `POST` | `/api/auth/forgot-password` | Request reset email | `{email}` | `{sent:true}` (always true to avoid enumeration) | Creates `password_reset_tokens` (15m), Resend email with `https://<vercel>/reset-password?token=xxx` |
| 4 | `POST` | `/api/auth/reset-password` | Reset via token | `{token, newPassword}` | `{reset:true}` | Validates expiry+unused, bcrypt update, marks used |
| 5 | `GET` | `/api/auth/me` | Current user | `Bearer JWT` | `{id,email,display_name}` | Guard for `(main)` |

### 11.2 Core APIs (38 endpoints)

| # | Method | Endpoint | Purpose | Request Body / Params | Response | Notes |
|---|--------|----------|---------|----------------------|----------|-------|
| 1 | `GET` | `/api/health` | Health + readiness | — | `{status:"ok", version, detectorReady:bool, nimReady:bool, uptime}` | Vercel health check (no Docker) |
| 2 | `GET` | `/api/meta/models` | List NIM/detector models | — | `{defaults:{generation:"meta/llama-3.1-405b-instruct", humanize:"meta/llama-3.1-8b-instruct"}, models:[{id, label, role, context, cost, available}], detector:{mode:"spacy+api|local", analyzer:"en_core_web_sm+textstat"}}` |  |
| 3 | `POST` | `/api/projects` | Create project | `{title, idea, slug?}` | `{id, slug, title, created_at}` |  |
| 4 | `GET` | `/api/projects` | List projects | `?q=&limit=&offset=` | `{items:[{id,title,slug,docCount}], total}` |  |
| 5 | `GET` | `/api/projects/{id}` | Get project + docs | — | `{id,title,slug,idea, documents:[...]}` |  |
| 6 | `PUT` | `/api/projects/{id}` | Update project | `{title?, idea?}` | `{id, ...updated}` |  |
| 7 | `DELETE` | `/api/projects/{id}` | Delete project (cascade docs) | — | `{deleted:true}` |  |
| 8 | `GET` | `/api/documents` | List docs | `?project_id=&type=&limit=` | `{items, total}` |  |
| 9 | `GET` | `/api/documents/{id}` | Get doc + sections + human scores | — | `{id, type, tone, depth, status, human_score_avg, sections:[{id,title,order,content_md, word_count, ai_score, human_score, iteration}], versions}` |  |
| 10 | `PUT` | `/api/documents/{id}` | Edit doc metadata | `{title?, tone?, depth?}` | `{id, ...}` |  |
| 11 | `DELETE` | `/api/documents/{id}` | Delete doc | — | `{deleted:true}` |  |
| 12 | `POST` | `/api/documents/{id}/duplicate` | Clone doc as new version | — | `{newId, version_no}` |  |
| 13 | `POST` | `/api/generate` | Generate full doc (non-stream) | `{project_id?, title, idea, generation_model?, humanize_model?, docType: "rdd|prd|brd|technical_design|system_design|architecture|development_plan|runbook|sop|incident_report|postmortem|pm_roadmap", tone: "formal|startup|enterprise", depth: "brief|detailed", audience?}` | `{documentId, sections:[{title,content_md,word_count,human_score}], pages_est}` | Calls selected generation_model (default 405b), splits 7-12 sections per template, auto-detects each with spaCy+textstat |
| 14 | `POST` | `/api/generate/stream` | Generate streamed (SSE) | same as above | `text/event-stream` chunks `{section_title, delta, done, human_score}` | Frontend streaming |
| 15 | `POST` | `/api/generate/regenerate-section` | Regen single section | `{documentId, sectionTitle, instruction, generation_model?}` | `{sectionId, newContent, human_score}` |  |
| 16 | `POST` | `/api/detect` | Detect one text | `{text}` | `{ai_prob:0-1, human_percent:0-100, label:"human|ai|mixed", confidence, details:{burstiness, passive_ratio, cliche_hits, flesch}, reasons:[]}` | spaCy+textstat → sapling fallback → HF local opt-in |
| 17 | `POST` | `/api/detect/batch` | Detect batch (per-section) | `{texts:[{id,text}]}` | `{results:[{id, human_percent, ai_prob}]}` | For doc-wide scoring |
| 18 | `GET` | `/api/detect/status` | Detector readiness | — | `{ready, analyzer:"en_core_web_sm+textstat", mode:"spacy+api|local", sapling_reachable:bool}` |  |
| 19 | `POST` | `/api/humanize` | Humanize one section (loop) | `{sectionId, strength: "light|medium|aggressive", humanize_model?, maxIterations?:3}` | `{sectionId, oldContent, newContent, oldHuman, newHuman, iterations, diff:{added, removed}, human_percent_final}` | Uses selected humanize_model (default 8b), rewrites until ≥95% |
| 20 | `POST` | `/api/humanize/batch` | Humanize all sections | `{documentId, strength?, humanize_model?}` | `{documentId, sectionsUpdated, avgHumanBefore, avgHumanAfter, iterations_total}` | Batch loop |
| 21 | `POST` | `/api/humanize/compare` | Diff two versions | `{sectionId, versionA?, versionB?}` | `{diff_html, diff_unified, word_diff}` |  |
| 22 | `GET` | `/api/humanize/history/{sectionId}` | Iteration history | — | `{sectionId, history:[{iteration, human_percent, content_snapshot, created_at}]}` |  |
| 23 | `PUT` | `/api/sections/{id}` | Edit section content + recount | `{content_md}` | `{id, word_count, human_score (re-detected)}` | TipTap edit |
| 24 | `POST` | `/api/mermaid/render` | Render Mermaid → SVG | `{code}` | `{svg, error?}` | For architecture diagrams |
| 25 | `POST` | `/api/export/pdf` | Export PDF (150wpp) → upload to Cloudinary | `{documentId, theme?}` | `{exportId, secure_url (Cloudinary), public_id, pages, words_total, human_avg}` | WeasyPrint → `storage/cloudinary_client.py` |
| 26 | `POST` | `/api/export/docx` | Export DOCX → Cloudinary | `{documentId}` | `{exportId, secure_url, public_id, pages, words_total}` | python-docx → Cloudinary |
| 27 | `GET` | `/api/exports/{id}` | Export meta (with Cloudinary URL) | — | `{id, format, secure_url, public_id, pages, created_at}` | TiDB `exports.secure_url` |
| 28 | `GET` | `/api/exports/{id}/download` | Redirect to Cloudinary `secure_url` | — | `302 → secure_url` (or binary if `CLOUDINARY_URL` missing) | Fallback local file |
| 29 | `GET` | `/api/templates` | List doc templates | — | `{items:[{type:"rdd", title, description, sample_idea, sections}]} ` |  |
| 30 | `GET` | `/api/templates/{type}` | Get template detail | — | `{type, sections:[{title, prompt_hint}]}` |  |
| 31 | `POST` | `/api/documents` | Create empty draft | `{project_id, title, docType, tone?, depth?}` | `{id, status:"draft"}` | Wizard draft-save before generate |
| 32 | `GET` | `/api/exports` | List exports | `?limit=&offset=` | `{items:[{id,format,secure_url,pages}], total}` | Powers `/exports` page |
| 33 | `POST` | `/api/documents/{id}/restore/{version_no}` | Restore version snapshot | — | `{id, version_no, restored:true}` | From `versions` table |
| 34 | `POST` | `/api/auth/refresh` | Rotate refresh token | `{refresh_token}` | `{access_token, refresh_token}` | Reuse detection, httpOnly cookie |
| 35 | `GET` | `/api/admin/users` | List users (admin) | `?q=&limit=&offset=` | `{items:[{id(UUID),email,display_name,role,created_at}], total}` | `require_role(admin)` |
| 36 | `PUT` | `/api/admin/users/{id}/role` | Set role (admin) | `{role:"user\|admin"}` | `{id, role}` | UUID id; audit-logged |
| 37 | `GET` | `/api/admin/stats` | Usage stats (admin) | — | `{users, docs, tokens_by_model}` | Admin dashboard |
| 38 | `GET` | `/api/documents/{id}/versions` | List version snapshots | — | `{items:[{version_no, created_at}]}` | Powers studio Versions card |

**Validation & access:** Global auth dependency (401 without JWT; only `GET /api/health` public). All resource IDs UUID v4 (422/404 on invalid, no sequential ints ever). All data endpoints scoped `WHERE user_id = me` (return 404, not 403, on another user's UUID to avoid existence oracle). Pydantic 422 on bad input, XSS-escaped markdown + sanitized SVG, CORS prod + previews, `X-Request-Id` logged.

**Error contract:** Every failure returns the envelope `{ detail: { code, message } }`. Machine codes live in `core/error_codes.py`, humanized copy in `core/messages.py`, raised only via `fail(status, code, **slots)` (`core/errors.py`). Global handlers map `BudgetExceeded → 413 MODEL_TOO_LONG` and `ModelUnavailable → 502 MODEL_UNAVAILABLE`. Frontend `lib/messages.ts` covers offline/stream fallbacks; `ApiError` carries `{ status, code, message }` and Toasts render the humanized message. Duplicate signup is `409 AUTH_EMAIL_TAKEN` (not 400).

### 11.2 API Flow Example
```
POST /api/generate {idea:"AI SaaS for invoices", docType:"rdd"} 
→ {documentId} → frontend SSE → POST /api/detect/batch → rings → POST /api/humanize/batch → re-score → POST /api/export/pdf → GET /api/exports/{id}/download
```
**SSE contract (`POST /api/generate/stream`, `text/event-stream`, Vercel `maxDuration: 60`):** events `{event: section.start|delta|done|detect, data: {documentId, sectionTitle, delta?, human_score?}}` + `:heartbeat` every 15s. Each `done` section is persisted immediately → dropped streams resume via `GET /api/documents/{id}?from_section=<uuid>`. Fallback/rate-limit events: `{event: model.fallback|rate_limited, data: {from_model, to_model, retry_after}}`.

## 11B. All Pages — Frontend App + Generated Document Pages

### A) Frontend App Pages (Next.js App Router — 13 routes, Vercel, no Docker)

| # | Route | File | Purpose | Key Components | API Calls |
|---|-------|------|---------|----------------|-----------|
| 1 | `/` | `apps/web/src/app/page.tsx` | **Landing** — hero, feature, CTA to `/login` | `Hero, CTA` | — |
| 2 | `/login` | `apps/web/src/app/(auth)/login/page.tsx` | **Login** — email/password, JWT cookie, link to forgot/signup | `LoginForm, Social?` | `POST /api/auth/login` |
| 3 | `/signup` | `apps/web/src/app/(auth)/signup/page.tsx` | **Signup** — email, password, display_name, creates user+JWT | `SignupForm` | `POST /api/auth/signup` |
| 4 | `/forgot-password` | `apps/web/src/app/(auth)/forgot-password/page.tsx` | **Forgot** — email input → sends Resend magic link | `ForgotForm` | `POST /api/auth/forgot-password` |
| 5 | `/reset-password` | `apps/web/src/app/(auth)/reset-password/page.tsx` | **Reset** — `?token=xxx` + new password → success → login | `ResetForm` | `POST /api/auth/reset-password` |
| 6 | `/dashboard` | `apps/web/src/app/(main)/dashboard/page.tsx` | **Dashboard** (protected) — project cards, stats, recent docs | `ProjectCard, TemplateGallery, StatsBar` | `GET /api/projects, GET /api/templates` |
| 7 | `/new` | `apps/web/src/app/(main)/new/page.tsx` | **New Document Wizard** — idea, docType, tone/depth + model picker (generation + humanize dropdowns, defaults preselected) | `WizardForm, TypeSelector, ModelSelector` | `GET /api/meta/models, POST /api/generate` |
| 8 | `/studio/[documentId]` | `apps/web/src/app/(main)/studio/[id]/page.tsx` | **Studio 3-pane** — Outline + Paper + Humanize Console (model dropdown per regenerate/humanize, score badge tooltip shows spaCy reasons[]) | `Outline, PaginatedPaper, ScoreRing, DiffView, ModelSelector` | `GET /api/documents/{id}, GET /api/meta/models, POST /api/humanize*, PUT /api/sections/{id}` |
| 9 | `/projects` | `apps/web/src/app/(main)/projects/page.tsx` | Project list with search | `ProjectTable` | `GET /api/projects` |
| 10 | `/projects/[id]` | `apps/web/src/app/(main)/projects/[id]/page.tsx` | Project detail — docs per project | `DocList` | `GET /api/projects/{id}` |
| 11 | `/templates` | `apps/web/src/app/(main)/templates/page.tsx` | Template gallery — 12 types with section outlines | `TemplateCard` | `GET /api/templates` |
| 12 | `/exports` | `apps/web/src/app/(main)/exports/page.tsx` | Exports with download links | `ExportTable` | `GET /api/exports` |
| 13 | `/settings` | `apps/web/src/app/(main)/settings/page.tsx` | Model catalog + defaults, analyzer status (spaCy/textstat), 150wpp rule, threshold | `EnvStatus, ModelCatalog` | `GET /api/health, GET /api/meta/models` |
| 14 | `/admin` | `apps/web/src/app/(admin)/page.tsx` | **Admin** (role-gated) — users, role assignment, model catalog, usage stats | `UserTable, ModelCatalog, StatsBar` | `GET /api/admin/users, PUT /api/admin/users/{id}/role, GET /api/admin/stats` |

**Route Groups & Guard:** `(auth)` is public, `(main)` is protected via `apps/web/middleware.ts` + `contexts/AuthContext.tsx` (stores `role` from JWT) → redirects to `/login` if unauthenticated. `(admin)` group (`/admin`) additionally requires `role==='admin'` → else redirect `/dashboard`. `apps/web/src/lib/api/client.ts` attaches `Authorization: Bearer` automatically.

**Studio 3-Pane Breakdown (where 80% time is spent):** Left Outline = section list with `word_count` + `ScoreRing` (green/amber/red) + drag reorder; Center Paper = paginated A4 shadows, page numbers, Mermaid SVGs, TipTap inline edit; Right Console = global avg human ring, `Humanize All` button, per-section history timeline, strength slider, before/after diff.

### B) Generated Document Internal Pages (Professional PDF — 150 words/page, paginated)

Every exported PDF/DOCX follows this **page structure** (word count enforced by `pdf.py`):

| Order | Page(s) | Section | Content | Words/Page | Notes |
|-------|---------|---------|---------|------------|-------|
| 1 | p1 | **Cover** | Title, subtitle (doc type), project idea, date, version, author "DocuForge Humanized" | — | Full-bleed paper texture, no word limit |
| 2 | p2 | **TOC** | Auto dot leaders + page numbers via `target-counter` | — | Clickable in PDF |
| 3 | p3-4 | **Executive Summary** | Problem, solution, value prop | 150 | Human% badge in margin |
| 4 | p5-7 | **Requirements — Functional** | Must/Should/Could table, user stories GIVEN/WHEN/THEN | 150 |  |
| 5 | p8-9 | **Requirements — Non-Functional** | Performance, quality, reliability, security, portability | 150 |  |
| 6 | p10-13 | **System Architecture** | High-level diagram (Mermaid SVG) + component breakdown + data flow steps | 150 | Diagram scaled to width |
| 7 | p14-16 | **Technology Stack** | Table (tool, license, why) + detector APIs | 150 |  |
| 8 | p17-18 | **Data Model / DB Schema** | SQL schema + indices + ER diagram | 150 |  |
| 9 | p19-22 | **API Specification** | Full table above (30 endpoints) | 150 |  |
| 10 | p23-25 | **Frontend Pages & IA** | Table A above + sitemap Mermaid | 150 |  |
| 11 | p26-28 | **UI/UX Design System** | Tokens, typography, motion, states | 150 |  |
| 12 | p29-31 | **Timeline / Roadmap** | 4 sprints Gantt | 150 |  |
| 13 | p32-33 | **Cost & Resources** | Open-source $0 + NIM usage | 150 |  |
| 14 | p34-35 | **Risks & Mitigations** | Table | 150 |  |
| 15 | p36-37 | **Appendices** | Prompts, env contract, mermaid sources | 150 |  |
| 16 | p38 | **Back Cover** | Export meta: human_avg, pages, words_total, generated_at | — |  |

**Pagination Rules:** 150±2 words/page (body text only; excludes cover/TOC/back, fenced code + mermaid blocks + tables not counted — see fixtures), widow/orphan control, `page-break-after: always` on 150 boundary, merge-forward if last page <100 words (allow ±5 on final 2 pages to avoid cascade). Headers: even = doc title, odd = section name. Footer: `Page x / y` centered + human score tiny.

### C) Template Catalog — 12 Document Types (each with its own section outline, 150wpp, Mermaid where needed)

| # | Doc Type | `docType` value | Typical Length | Sections (each becomes 150wpp pages) | Mermaid Diagrams |
|---|----------|-----------------|----------------|--------------------------------------|------------------|
| 1 | **PRD** (Product Requirements) | `prd` | 18-25 pages | Cover → TOC → Executive Summary → Goals/Non-Goals → Users/Personas → User Stories (GIVEN/WHEN/THEN) → Functional Requirements (Must/Should/Could) → Non-Functional → UX Flows → Release Milestones → Metrics → Risks → Appendix | User journey flow |
| 2 | **BRD** (Business Requirements) | `brd` | 15-20 pages | Cover → TOC → Business Objectives → Stakeholders → Current State → Desired State → Requirements (BR) → Process Model → ROI/Cost → Risks → Glossary | BPMN flow, stakeholder map |
| 3 | **RDD** (Requirements & Design) | `rdd` | 20-30 pages | Cover → TOC → Summary → Requirements (F/NF) → Architecture → Stack → Data Model → API → Timeline → Risks | Architecture + data flow |
| 4 | **Technical Design Doc** | `technical_design` | 18-28 pages | Cover → TOC → Overview → Goals → System Context → Detailed Design (components, interfaces) → Data Design → Error Handling → Security → Testing Strategy → Rollout | Component + sequence |
| 5 | **System Design Doc** | `system_design` | 20-30 pages | Cover → TOC → Requirements (scale 10x) → High-Level Design → Low-Level Design → Data Storage → API Design → Scaling & Fault Tolerance → Trade-offs | HLD + LLD diagrams |
| 6 | **Architecture Doc** | `architecture` | 15-22 pages | Cover → TOC → Principles → Current vs Target → Component Map → Data Flow → Deployment Topology → Tech Decisions (ADRs) → Failure Modes | Deployment + component |
| 7 | **Development Plan** | `development_plan` | 15-20 pages | Cover → TOC → Scope → Work Breakdown → Dependencies → Sprint Plan → Resource Allocation → Timeline Gantt → Risks | Gantt + dependency graph |
| 8 | **Runbook** | `runbook` | 12-18 pages | Cover → TOC → Service Overview → Prerequisites → Step-by-Step Procedures (with checks) → Commands → Rollback → Escalation | Runbook flowchart |
| 9 | **SOP** (Standard Operating Procedure) | `sop` | 10-16 pages | Cover → TOC → Purpose → Scope → Responsibilities → Procedure (numbered steps) → Checklists → Compliance → Revision History | Swimlane flow |
| 10 | **Incident Report** | `incident_report` | 10-15 pages | Cover → TOC → Summary → Timeline (UTC) → Impact → Root Cause → Detection → Response Actions → Evidence | Timeline diagram |
| 11 | **Postmortem / PIR** | `postmortem` | 12-18 pages | Cover → TOC → Summary → Timeline → Root Cause (5 Whys) → What Went Well/Poorly → Action Items (Owner/Due) → Prevention | Fishbone + timeline |
| 12 | **PM Roadmap / Release Plan** | `pm_roadmap` | 14-20 pages | Cover → TOC → Vision → Themes → Quarterly Roadmap → Features per Release → Dependencies → Metrics → Risks | Roadmap timeline |

All 12 share: **Cover + TOC + Headers/Footers + 150wpp + human% rings + client-side Mermaid + PDF/DOCX export.** MVP ships 3 types (`rdd, prd, technical_design`); rest data-only. Studio wizard shows the section outline for the chosen type before generation.



## 12. Project Structure — Monorepo (Your Demo Structure, Vercel + TiDB, No Docker)

**Root — Monorepo**
```
DocuForge-Humanized/               # Monorepo
├── apps/
│   ├── api/                       # Backend — FastAPI (Vercel Python)
│   └── web/                       # Frontend — Next.js App Router (Vercel)
├── packages/                      # Shared code (types, ui) — future
├── ml/                            # ML / Humanize & Detector (HF local)
├── knowledge-base/                # RAG source docs (templates, examples)
├── infra/                         # Vercel config (vercel.json) — No Docker/Nginx
├── docs/                          # Docs (ARCHITECTURE.md, templates)
└── scripts/                       # Global scripts (migrate, seed)
```

**12.1 Backend Generalized — `apps/api/` — Layered: `routes → services → repositories → db`** (`controllers/` merged into `routes/` — FastAPI idiom, solo-dev scale)
```
apps/api/
├── src/
│   └── app/
│       ├── main.py                # create FastAPI, mount CORS, include routers, health
│       ├── core/
│       │   ├── config.py          # Env: TiDB_URL, NVIDIA_NIM_API_KEY, JWT_SECRET, RESEND_API_KEY
│       │   ├── security.py        # JWT (jose), bcrypt, forgot-token create/verify, get_current_user
│       │   └── rate_limit.py      # slowapi guards
│       ├── db/
│       │   └── client.py          # TiDB singleton: SQLAlchemy create_engine(TiDB_URL + ssl), SessionLocal
│       ├── entities/              # DB Schema (SQLAlchemy models) — UUID PKs
│       │   ├── user.py            # User, PasswordResetToken
│       │   ├── project.py
│       │   ├── document.py
│       │   ├── section.py
│       │   └── export.py
│       ├── schemas/               # Pydantic DTOs
│       │   ├── auth.py            # Signup/Login/Forgot/Reset schemas
│       │   ├── generate.py        # Generate request (12 docTypes)
│       │   ├── humanize.py
│       │   └── common.py
│       ├── repositories/          # Only DB queries
│       │   ├── user_repo.py       # get_by_email, create, get_by_token
│       │   ├── project_repo.py
│       │   ├── document_repo.py
│       │   └── section_repo.py
│       ├── services/              # Business logic
│       │   ├── auth_service.py    # signup, login, forgot (Resend), reset
│       │   ├── llm/nim_client.py  # NIM streaming (catalog-driven)
│       │   │   ├── models.py          # NIM catalog + ALLOWED_MODELS validation + defaults
│       │   ├── storage/cloudinary_client.py # Cloudinary free upload (PDF/DOCX/SVG → secure_url)
│       │   ├── generator.py       # prompt builder, section splitter
│       │   ├── detector.py        # spaCy sm + textstat + tiktoken + sapling; HF only if DETECTOR_MODE=local
│       │   ├── humanizer.py       # rewrite loop (model override), spaCy verify gate, diff, history
│       │   ├── pdf.py             # 150wpp builder (print-CSS payload + async worker job) → upload to Cloudinary
│       │   └── mermaid.py         # sanitize client-rendered SVG (no CLI) → SVG → Cloudinary
│       ├── controllers/           # REMOVED in v1.1 — merged into routes/ (see rule below)
│       │   ├── auth_controller.py
│       │   ├── generate_controller.py
│       │   ├── humanize_controller.py
│       │   └── export_controller.py
│       ├── routes/                # APIRouter with prefix
│       │   ├── auth.py            # /api/auth/*
│       │   ├── generate.py        # /api/generate*
│       │   ├── documents.py       # /api/documents*, /api/projects*
│       │   ├── humanize.py
│       │   └── export.py
│       └── middleware/
│           └── cors.py
├── tests/                         # unit/, integration/, eval/golden_set.jsonl
├── scripts/
│   ├── seed_data.py
│   ├── migrate.py                 # alembic upgrade head
│   └── eval.py                    # detector eval
├── alembic/                       # Alembic for TiDB migrations
└── requirements.txt               # fastapi, uvicorn, pymysql, jose, passlib, resend, spacy, textstat, tiktoken (+ en_core_web_sm wheel; weasyprint in worker only)
```
**Rule:** `routes → services → repositories → db` — never skip layer (`controllers/` merged into routes). Replace TiDB without touching service.

**12.2 Frontend Generalized — `apps/web/` — Feature-Sliced + App Router (Vercel)**
```
apps/web/
├── src/
│   ├── app/
│   │   ├── layout.tsx             # Root layout (Providers: Auth, Theme)
│   │   ├── page.tsx               # / Landing (public)
│   │   ├── (auth)/                # Public group — NO guard
│   │   │   ├── login/page.tsx     # /login + forgot link
│   │   │   ├── signup/page.tsx    # /signup
│   │   │   ├── forgot-password/page.tsx   # /forgot-password
│   │   │   └── reset-password/page.tsx    # /reset-password?token=xxx
│   │   ├── (main)/                # Protected group — guard via middleware.ts
│   │   │   ├── dashboard/page.tsx # /dashboard
│   │   │   ├── new/page.tsx       # /new — wizard
│   │   │   ├── studio/[id]/page.tsx  # /studio/[id]
│   │   │   ├── projects/page.tsx
│   │   │   ├── projects/[id]/page.tsx
│   │   │   ├── templates/page.tsx
│   │   │   ├── exports/page.tsx
│   │   │   └── settings/page.tsx
│   │   └── api/                   # BFF proxy (optional) — forwards to apps/api on Vercel
│   │       └── **/route.ts
│   ├── components/
│   │   ├── ui/                    # Design system: Button, Input, ScoreRing, Skeleton, Toast
│   │   ├── fx/                    # Effects: paper shadow, aurora
│   │   ├── layout/                # Sidebar, Header, AuthGuard
│   │   └── features/              # studio/, projects/, templates/, auth/forms
│   ├── contexts/
│   │   ├── AuthContext.tsx        # JWT, user, login/logout, forgot
│   │   ├── ThemeContext.tsx
│   │   └── LanguageContext.tsx
│   ├── lib/
│   │   ├── api/client.ts          # fetch wrapper, adds Authorization Bearer, refresh
│   │   ├── api/server.ts
│   │   └── utils.ts               # cn(), 150wpp count
│   └── types/index.ts
├── public/                        # svg, og-image
├── middleware.ts                  # Guards (main) → redirect to /login if no JWT
└── next.config.ts / tailwind.config.ts / tsconfig.json
```
**Folder Rules:** `app/` only routing, `components/ui` dumb reusable, `components/features` feature-specific, `lib/api` all API calls, `contexts` only global state.

**12.3 Other Top-Level**
```
packages/          # shared types (future)
ml/                # local HF detector cache, humanize eval
knowledge-base/    # template examples, RAG docs
infra/             # vercel.json, env docs — NO Dockerfile/Nginx
docs/              # ARCHITECTURE.md, HUMANIZATION_GUIDE.md
scripts/           # migrate.sh, seed.sh
```

**Vercel Deploy:** `apps/web` → `vercel --prod` (Next.js), `apps/api` → Vercel Python runtime (`api/index.py` → `app.main:app`), both share `TIDB_URL`, `NVIDIA_NIM_API_KEY`, `JWT_SECRET`, `RESEND_API_KEY` via Vercel Env. No Docker. Local: `pnpm dev` (web 3000) + `uvicorn apps/api/src/app/main.py:app --reload --port 8000`.

## 13. UI/UX Design System — Outstanding & User-Friendly (Not AI-Generic)
**Tokens (`tokens.css`):** `--paper: #FFFBF5; --ink: #141210; --accent: #FF6B35; --muted: #6B7280; --border: #E7E0D6; --radius: 14px; --shadow-paper: 0 20px 60px rgba(20,18,16,0.12)`. **Typography:** Newsreader 700 for H1/H2 (tight -0.02em), Inter 400/600 for body, JetBrains Mono for code. **Layout:** Dashboard grid of project cards (paper texture), studio 3-pane with resizable gutters, center paper has realistic shadow and page curl. **Motion:** Section streaming fade-in 200ms, score ring spring, paper lift on hover. **A11y:** Focus rings, 44px targets, keyboard nav, `prefers-reduced-motion`. **Craft:** Empty ghost doc, error with retry, loading skeletons per section, success confetti on 100% human. **Theme:** light/dark via `ThemeContext` + `html.dark` CSS-var overrides (persisted `df-theme`, OS default, no-flash inline script); toggle in sidebar + landing. **Watermelon borrows:** variable-driven theming, bento stats strip on dashboard, lift-on-hover cards, animated score rings.

## 14. Security, Deployment & DevOps (Vercel Free Tier — No Docker/Nginx)
- **Security:** Validate all input (Pydantic), escape markdown + sanitize Mermaid SVG (`nh3`/`bleach`, strip `<script>`/`on*`), rate-limit (`slowapi` 60/min; forgot `5/min`/IP), CSP headers (`img-src data:` for inline SVG), bcrypt + JWT (access 1h, refresh 7d with rotation + reuse detection; httpOnly `Secure; SameSite=Lax` cookie for web, Bearer for API), no secrets in logs, `.env` gitignored, `npm audit`/`pip-audit` clean, TiDB TLS `ssl_ca`. CORS: prod `https://<app>.vercel.app` + previews `https://*.vercel.app` (or BFF proxy to skip CORS).
- **Build:** No Docker. Frontend: Vercel builds `apps/web` (Next.js, `pnpm build`). Backend: Vercel Python builds `apps/api` (requirements.txt pinned). Lockfiles: `pnpm-lock.yaml`, `requirements.txt` hashed.
- **Health:** `GET /api/health` (checks TiDB + NIM + detector) + `GET /api/auth/me` for auth.
- **Deploy:** `git push` → Vercel auto-deploy. Env vars in Vercel Dashboard: `TIDB_URL`, `NVIDIA_NIM_API_KEY`, `JWT_SECRET`, `RESEND_API_KEY`, `HF_TOKEN` optional. Local mirrors prod: same env via `.env` at repo root. No `docker compose`.
- **Logs:** Vercel Runtime Logs (JSON, no PII), `LOG_LEVEL` env.

## 15. Development Roadmap (4 Sprints, 3 Weeks MVP)
**Sprint 0 (Day 1-2):** Pre-flight, `ARCHITECTURE.md`, scaffold, tokens, health endpoint, `.env.example`, `users.role` + manual admin seed SQL (Appx D). **Sprint 1 (Day 3-7):** Generator (model override) + detector (`DETECTOR_MODE=spacy+api`: spaCy sm + textstat) + humanizer backend + TiDB Cloud, SSE streaming with per-section persist/resume. **Sprint 2 (Day 8-12):** Frontend studio 3-pane + ModelSelector (wizard/studio/settings via `GET /api/meta/models`) + pagination preview + score rings with reasons[] tooltip. **Sprint 3 (Day 13-18):** PDF 150wpp engine + Mermaid + export + versioning + polish + QA (unit/integration/e2e). **Sprint 4 (Day 19-21):** Security pass, a11y, docs, screenshots, ship.

## 16. Cost & Resources
**Open-source cost:** $0 (all MIT/BSD). **NIM:** Your existing API key, free tier sufficient (405b ~1K docs/month). **Hosting:** Vercel Free ($0) + TiDB free tier + Cloudinary free 25GB = $0 MVP (no VPS, no Docker). **No paid detectors:** HF local + heuristic = $0; Sapling free tier optional. **Team:** 1 full-stack (this build).

## 17. Risks & Mitigations
- **Detector false positive:** Mitigate with ensemble (HF + heuristic), show confidence, allow manual override.
- **NIM downtime:** Mock generator with template docs + “Demo Mode” banner, queue retry.
- **150wpp drift:** Unit tests per page ±2 words, snapshot tests on PDFs.
- **Vision API limits:** Cache diagrams, fallback to ASCII.

## 18. Verification & Acceptance Gates
- **G1:** Generate RDD → 7+ sections, each <4s first, avg human ≥95% after humanize.
- **G2:** PDF 20 pages → each page 148-152 words, cover+TOC+numbers present.
- **G3:** Data survives Vercel redeploy/restart (TiDB, no volumes), health 200, lint/tests green.

---

## Appendix A: Example System Prompt (NIM) — prompting rules applied:
role → mission → audience → numbered voice rules → output contract →
quality bar → banned words. Specific, verifiable, no open-ended asks.
```
ROLE: You are DocuForge, a senior principal engineer and tech writer.
MISSION: Produce one complete, client-ready document section set from the brief.
AUDIENCE: Technical decision-makers who skim headings first.
VOICE RULES: 1. Sentence length 10-26 words, mixed. 2. Active voice,
contractions, concrete metrics. 3. One vivid example per section.
OUTPUT CONTRACT: Markdown only, `## Section titles` as briefed, one
```mermaid graph where asked. No preamble, no closing summary.
QUALITY BAR: A skeptical CTO finds nothing to red-pen in tone.
NEVER USE: delve, leverage, comprehensive, foster, furthermore, moreover.
```

## Appendix B: Example Humanize Prompt (medium strength)
```
ROLE: Senior tech writer rewriting a robotic draft in your own voice.
GOAL: Keep every fact and the section structure; change the music.
RULES: 1. Burstiness: short punches + longer explanations. 2. Exactly one
concrete example or anecdote. 3. Contractions, active voice, one rhetorical
question at most.
BANNED WORDS: delve, leverage, comprehensive, foster, furthermore, moreover.
OUTPUT: Return only the rewritten text, same markdown structure.
```

## Appendix C: Env Contract (.env at root — also set in Vercel Dashboard)
```
# TiDB Cloud (MySQL-compatible serverless)
TIDB_URL=mysql+pymysql://user:pass@gateway01.tidbcloud.com:4000/docuforge?ssl_ca=/etc/ssl/certs/ca-certificates.crt
# or split: TIDB_HOST, TIDB_USER, TIDB_PASSWORD, TIDB_DB

# NVIDIA NIM — your key
NVIDIA_NIM_API_KEY=nvapi-xxx

# Auth
JWT_SECRET=openssl_rand_-hex_32
JWT_EXPIRE_MIN=60

# Email — forgot password (Resend free 100/day or SendGrid)
RESEND_API_KEY=re_xxx
RESEND_FROM=DocuForge <noreply@yourdomain.com>

# Cloudinary Free — object storage (PDFs, DOCXs, SVGs)
CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
# or: CLOUDINARY_CLOUD_NAME=xxx
#     CLOUDINARY_API_KEY=xxx
#     CLOUDINARY_API_SECRET=xxx
# Fallback: if missing, exports save locally + served via /api/exports/{id}/download

# Detector / demo switches
DETECTOR_MODE=spacy+api  # or: local (HF model, local-Docker profile only)
DEFAULT_GENERATION_MODEL=meta/llama-3.1-405b-instruct
DEFAULT_HUMANIZE_MODEL=meta/llama-3.1-8b-instruct
ALLOWED_MODELS=meta/llama-3.1-405b-instruct,meta/llama-3.1-70b-instruct,meta/llama-3.1-8b-instruct,nvidia/llama-3.1-nemotron-nano-8b-v1
HF_TOKEN=hf_xxx  # only for DETECTOR_MODE=local
NIM_MOCK=false  # true = offline template docs
DEMO_MODE=false  # true = banner + 'Demo estimate' badges, never persist heuristic scores
LOG_LEVEL=info
```
No `PORT` needed on Vercel; local: `apps/web` 3000, `apps/api` 8000. Vercel functions: `maxDuration: 60` on generate/humanize/export routes.

## Appendix D: Admin Seed + ID Rules (manual DB, no signup backdoor)
```sql
-- 1) Create tables via Alembic, then insert the admin manually (psql/mysql client on TiDB):
INSERT INTO users (id, email, password_hash, display_name, role)
VALUES (UUID(), 'you@example.com', '<bcrypt-hash>', 'Admin', 'admin');
-- Generate the hash locally, never commit plaintext:
-- python -c "from passlib.context import CryptContext; print(CryptContext(schemes=['bcrypt']).hash('YOUR-PW'))"
-- 2) Verify: SELECT id, email, role FROM users WHERE role='admin';
-- 3) Promote/demote later only via PUT /api/admin/users/{uuid}/role (audit-logged). No `?is_admin=` params, no signup flag — `role` is never user-settable.
```
**ID rules:** PKs + FKs are `CHAR(36)` UUID; APIs accept/return UUID strings only; pagination is cursor-based (`created_at+id`), never `?offset` on user data (offsets leak counts); 404 (not 403) on cross-user UUID.

**End of Architecture — Ready for Build.** All open-source, NIM-integrated, 150wpp enforced, 100% human-targeted iteration loop included.
