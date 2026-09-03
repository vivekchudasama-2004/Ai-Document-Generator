# DocuForge Humanized

Idea → professional, human-feeling document in ~90 seconds.
**Generate → Detect → Humanize** loop, 150 words/page export, user + admin roles,
opaque UUID ids, selectable NIM models. Spec: `ARCHITECTURE.md` (v1.3.0).

## Run locally

```bash
# API (http://localhost:8000)
cd apps/api
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
copy ..\..\.env.example ..\..\.env   # then set TIDB_URL + NVIDIA_NIM_API_KEY
python scripts/migrate.py            # create TiDB tables (needs TIDB_URL)
uvicorn app.main:app --reload --port 8000  # run from apps/api/src

# Web (http://localhost:3000)
cd apps/web
npm install
copy .env.example .env.local
npm run dev
```

Without `TIDB_URL` the API boots degraded (`/api/health` shows `db:false`);
data endpoints answer 503. Without `NVIDIA_NIM_API_KEY`, set `NIM_MOCK=true`
for the offline template demo. Seed the admin manually — see ARCHITECTURE.md
Appendix D (no signup backdoor).

## Tests

```bash
cd apps/api
.venv/Scripts/python -m pytest tests/ -v
```

## Deploy

Vercel: import the repo, set env vars from `.env.example` in the dashboard,
`vercel --prod`. See `vercel.json` (`maxDuration: 60` on API functions).
