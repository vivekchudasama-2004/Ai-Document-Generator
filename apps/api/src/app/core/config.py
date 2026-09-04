"""Central env contract (ARCHITECTURE.md Appendix C). Tolerant at boot —
health reports what is missing; data endpoints 503 without TIDB_URL."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


def _env_files() -> list[str]:
    """Find .env walking up from the launch dir, so `uvicorn` works from
    repo root, apps/api, or apps/api/src with one root .env."""
    here = Path.cwd().resolve()
    found = [str(p / ".env") for p in [here, *here.parents[:4]] if (p / ".env").is_file()]
    return found or [".env"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=_env_files(), extra="ignore")

    TIDB_URL: str = ""
    NVIDIA_NIM_API_KEY: str = ""
    NIM_MOCK: bool = False
    DEFAULT_GENERATION_MODEL: str = "auto"
    DEFAULT_HUMANIZE_MODEL: str = "auto"
    ALLOWED_MODELS: str = (
        "mistralai/mistral-large-2-instruct,nvidia/llama-3.1-nemotron-70b-instruct,"
        "mistralai/mistral-7b-instruct-v0.3"
    )
    JWT_SECRET: str = "dev-only-change-me"
    JWT_EXPIRE_MIN: int = 60
    COOKIE_SECURE: bool = False  # True in prod (Vercel = https)
    REFRESH_EXPIRE_DAYS: int = 7
    RESEND_API_KEY: str = ""
    RESEND_FROM: str = "DocuForge <noreply@yourdomain.com>"
    PUBLIC_APP_URL: str = "http://localhost:3000"
    CLOUDINARY_URL: str = ""
    DETECTOR_MODE: str = "spacy+api"
    DEMO_MODE: bool = False
    SAPLING_API_KEY: str = ""
    # --- Retrieval (embeddings API + stored vectors; no local ML, Vercel-safe) ---
    EMBEDDING_API_URL: str = ""
    EMBEDDING_API_KEY: str = ""
    EMBEDDING_MODEL: str = ""
    # --- BYOK: encrypts users' provider keys. Set in prod; JWT rotation orphans keys otherwise. ---
    LLM_KEYS_SECRET: str = ""
    LOG_LEVEL: str = "info"
    CORS_ORIGINS: str = "http://localhost:3000"
    APP_VERSION: str = "1.17.0"

    @property
    def allowed_models(self) -> list[str]:
        return [m.strip() for m in self.ALLOWED_MODELS.split(",") if m.strip()]

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
