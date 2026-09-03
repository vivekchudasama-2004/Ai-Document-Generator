"""Vercel Python entrypoint: api/index.py -> apps/api FastAPI app."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "apps" / "api" / "src"))

from app.main import app  # noqa: E402,F401
