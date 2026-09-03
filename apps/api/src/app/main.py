"""App entrypoint. Only /api/health is public; every other route enforces JWT."""
import logging
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core import error_codes as CODES
from app.core.config import get_settings
from app.core.messages import message_for
from app.core.rate_limit import limiter
from app.services.llm.nim_client import BudgetExceeded, ModelUnavailable
from app.routes import (
    admin, auth, detect, documents, export, generate, humanize, meta,
    models, projects, sections, templates,
)

logging.basicConfig(level=get_settings().LOG_LEVEL.upper())
STARTED = time.time()

app = FastAPI(title="DocuForge API", version=get_settings().APP_VERSION)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


def _envelope(status_code: int, code: str, **slots):
    return JSONResponse(
        status_code=status_code,
        content={"detail": {"code": code, "message": message_for(code, **slots)}},
    )


@app.exception_handler(BudgetExceeded)
async def budget_exceeded_handler(request: Request, exc: BudgetExceeded):
    return _envelope(413, CODES.MODEL_TOO_LONG, model=exc.model)


@app.exception_handler(ModelUnavailable)
async def model_unavailable_handler(request: Request, exc: ModelUnavailable):
    return _envelope(502, CODES.MODEL_UNAVAILABLE)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.get("/api/health")
def health():
    from app.services import detector

    settings = get_settings()
    return {
        "status": "ok",
        "version": settings.APP_VERSION,
        "detectorReady": True,
        "detector": detector.detector_ready().get("analyzer"),
        "nimReady": bool(settings.NVIDIA_NIM_API_KEY) or settings.NIM_MOCK,
        "db": bool(settings.TIDB_URL),
        "uptime": round(time.time() - STARTED, 1),
    }


for router in (
    meta.router, auth.router, projects.router, documents.router, sections.router,
    generate.router, detect.router, humanize.router, export.router,
    templates.router, admin.router, models.router,
):
    app.include_router(router, prefix="/api")
