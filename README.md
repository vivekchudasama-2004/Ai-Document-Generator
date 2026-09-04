# DocuForge — idea in, human-feeling document out

DocuForge turns a one-line idea into a client-ready RDD, PRD, or technical design doc.
You describe the idea, it drafts the sections, scores each one for how human it reads,
rewrites the robotic parts, and exports print-ready pages — 150 words each, diagrams
included, cover to back page.

The core loop is **Generate → Detect → Humanize**: draft fast, measure honestly,
rewrite only what needs it. Every pass is versioned with a before/after diff, so
nothing good ever gets lost.

## What it can do

**Writing loop**
- Generate 7–12 section documents from a brief (title, idea, type, tone, depth)
- Score every section for human-likeness, with reasons (rhythm, voice, diction)
- Humanize one section or the weak ones in sequence, with live progress and Stop
- Edit any section by hand — scores recompute on save
- Reorder sections, compare versions with diffs, restore old snapshots

**Documents & export**
- 12 templates: RDD, PRD, BRD, technical/system design, architecture, dev plan,
  runbook, SOP, incident report, postmortem, roadmap
- Strict 150-words-a-page pagination with cover, contents, headers, footers
- PDF and DOCX export, diagrams intact
- Mermaid architecture diagrams, rendered client-side and sanitized

**Models & retrieval**
- NVIDIA NIM catalog with per-document model override (writing vs humanizing separately)
- Bring your own key: NVIDIA NIM, OpenRouter, Groq, or a custom OpenAI-compatible endpoint (encrypted, masked, key-gated)
- "Auto" picks the cheapest capable model; reachable models sort first, unavailable ones are marked
- Similar-section search over your own documents (Voyage embeddings, no local ML),
  switchable between `voyage-3-lite` and `voyage-3-large` per request

## API keys & roles (read this before generating)

DocuForge has two roles and a strict key-ownership model:

- **Admin** — full access: the `/admin` dashboard (users, token totals, audit log,
  system status) **and** the shared server NVIDIA key (`NVIDIA_NIM_API_KEY`).
  The admin account is seeded manually (see `ARCHITECTURE.md` Appendix D —
  there is no signup backdoor).
- **Member** — everything except `/admin`, but **must save their own API key**
  before generating or humanizing. The shared server key is admin-only.
  Without a saved key, generate/humanize answer `422 BYOK_KEY_REQUIRED`
  with instructions instead of failing opaquely.

**Saving your key** (as a member): open **Manage models** from any model picker →
*Your provider keys* → pick the provider → paste the key → **Save key**.
Providers:

| Provider | What to save | Models look like |
|----------|--------------|------------------|
| NVIDIA NIM | your `nvapi-…` key from build.nvidia.com | curated catalog (Mistral Large 2, Nemotron 70B, Mistral 7B) |
| OpenRouter | your OpenRouter key | `openrouter/<model-id>` (add the id under *Your provider models*) |
| Groq | your Groq key | `groq/<model-id>` (add the id under *Your provider models*) |
| Custom endpoint | key + `https://` base URL of any OpenAI-compatible API | `custom/<label>/<model-id>` |

Keys are Fernet-encrypted in `user_llm_keys` (ciphertext only — plaintext never
touches the DB, logs, or responses; reads are masked like `tes••••5678`).
Custom endpoints must be public `https` hosts (no IPs, localhost, or `.local`).
Deleting a key instantly disables its models; enabling a provider id without
its key is rejected.

**Model endpoints** (`/api/models/*`, all JWT-authenticated):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/models/available` | live NVIDIA list for the server key (cached 10 min) |
| `GET` / `POST` | `/api/models/enabled` | your personal picker set; provider ids need their key |
| `GET` / `POST` / `DELETE` | `/api/models/keys` | save (201), list masked, delete saved keys |
| `GET` | `/api/models/auto-preview` | which model Auto would pick, with reasons |

**Why "No model answered" (502 `MODEL_NO_ACCESS`)**: every candidate refused
with 404/410 — your key can list models but can't invoke them (provider
account not subscribed to those models, or the ids retired, as happened when
NVIDIA retired Llama 3.1). Accept the model terms on your provider account or
switch providers via Manage models. True overloads still return 502
`MODEL_UNAVAILABLE` with a one-click retry on a smaller writer.

**Workspace**
- Dashboard with real totals, projects, template gallery, download shelf
- JWT auth with admin/user roles, opaque IDs throughout, rate-limited public endpoints
- Light and dark theme with a circle-wipe toggle

## Run it locally

You need Python 3.11 and Node 18+. Two terminals.

**Terminal 1 — backend (http://localhost:8000)**

```bash
cd apps/api
python -m venv .venv
.venv/Scripts/activate          # Windows; on macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy ..\..\.env.example ..\..\.env   # then fill in TIDB_URL + NVIDIA_NIM_API_KEY
python scripts/migrate.py            # creates tables (or: alembic upgrade head)
cd src
..\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Without `TIDB_URL` the API still boots — `/api/health` reports `db:false` and data
endpoints answer 503. Without `NVIDIA_NIM_API_KEY`, set `NIM_MOCK=true` for the
offline template demo.

**Terminal 2 — frontend (http://localhost:3000)**

```bash
cd apps/web
npm install
copy .env.example .env.local   # already points at localhost:8000
npm run dev
```

If port 3000 is taken, free it or run `npm run dev -- -p 3001`. If the page ever
loads with no styling, restart the dev server and hard-refresh (`Ctrl+Shift+R`).

## Environment

All backend settings live in the repo-root `.env` (never committed — only
`.env.example` is). What each key does:

| Key | Needed for | If empty |
|-----|-----------|----------|
| `TIDB_URL` | storing anything | data endpoints 503, health shows `db:false` |
| `NVIDIA_NIM_API_KEY` | generation + humanizing | use `NIM_MOCK=true` demo instead |
| `JWT_SECRET` | login sessions | boots locally on a dev default; **Vercel refuses to boot without a real one** |
| `LLM_KEYS_SECRET` | encrypting saved provider keys | derived from `JWT_SECRET` when empty; set a dedicated value in prod (JWT rotation orphans saved keys) |
| `RESEND_API_KEY` / `RESEND_FROM` | forgot-password emails | reset flow fails at send time |
| `CLOUDINARY_URL` | hosted PDF/DOCX links | exports served as local downloads |
| `EMBEDDING_API_URL/KEY/MODEL` | similar-section search | `/api/rag/*` answers 503 |
| `COOKIE_SECURE` | auth cookie over HTTPS | keep `false` locally, set `true` on Vercel |
| `DEMO_MODE` | fake estimator scores | keep `false`; `true` is for screenshots, never prod |

The frontend needs one variable in `apps/web/.env.local`: `NEXT_PUBLIC_API_URL`
(default `http://localhost:8000`).

## Scripts & tests

```bash
cd apps/api
.venv/Scripts/python -m pytest tests/ -v        # full suite, offline-safe
.venv/Scripts/python scripts/eval.py            # detector golden pairs
.venv/Scripts/python scripts/seed_data.py       # demo user + sample project (needs TIDB_URL;
                                                # set SEED_EMAIL + SEED_PASSWORD in env, never commits)
.venv/Scripts/python scripts/backfill_embeddings.py        # embed sections missing vectors
.venv/Scripts/python scripts/backfill_embeddings.py --all  # re-embed all (after switching models)
.venv/Scripts/python -m alembic upgrade head    # migrations (run from apps/api)
```

## Deploy

Vercel: import the repo, set the env vars from `.env.example` in the dashboard
(`COOKIE_SECURE=true` included), `vercel --prod`. The API runs as a Python
serverless function (`api/index.py`, `maxDuration: 60`); long humanize runs go
section-by-section from the studio so nothing trips the timeout.

## Layout

```
apps/api/src/app   # FastAPI: routes → services → repositories → db
apps/api/scripts   # migrate, seed, eval, backfill + canonical schema.sql
apps/api/alembic   # migrations (0001 base, 0002 embeddings, 0003 embedding model, 0004 BYOK keys)
apps/web/src/app   # Next.js App Router: landing, (auth), (main), (admin)
apps/web/src/components  # ui (design system) / features / fx / layout
ARCHITECTURE.md    # full spec: endpoints, schema, design tokens, roadmap
```

Health check: `GET /api/health`. Interactive API: `/docs` when the backend runs.
