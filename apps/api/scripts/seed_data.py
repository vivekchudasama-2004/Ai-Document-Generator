"""Seed a demo workspace (offline, no NIM). Creates a regular user +
sample project with scored sections. Never creates admins (Appendix D:
admins are inserted manually). Requires TIDB_URL.

Usage (env first):  SEED_EMAIL=demo@example.com SEED_PASSWORD=secret123 python scripts/seed_data.py
"""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.core.security import hash_password
from app.db.client import Base, connect_args_for, normalize_url
from app.services.detector import count_words, score_text

import app.entities.user  # noqa: F401
import app.entities.admin_audit  # noqa: F401
import app.entities.user_model  # noqa: F401
import app.entities.project  # noqa: F401
import app.entities.document  # noqa: F401
import app.entities.section  # noqa: F401
import app.entities.export  # noqa: F401
from app.entities.user import User, new_uuid
from app.entities.project import Project
from app.entities.document import Document
from app.entities.section import Section

SAMPLE_SECTIONS = [
    ("Executive Summary", "We started DocuForge because writing design docs ate our Fridays. You know the feeling: it's 4pm, the doc's half done, and every paragraph sounds like a robot wrote it. So we built the loop we wanted — draft, score, rewrite until it reads human."),
    ("Requirements", "The system must generate 7-12 section documents from a one-line idea. It should score every section for human-likeness with reasons. It could support twelve templates at launch, with three tuned first and the rest working from data alone."),
    ("Architecture", "A Next.js frontend talks to a FastAPI backend over JWT-authenticated REST. TiDB Cloud persists everything; NVIDIA NIM writes and rewrites. Exports land in Cloudinary, with a local fallback when no storage URL is configured."),
]


def main() -> None:
    email = os.environ.get("SEED_EMAIL", "")
    password = os.environ.get("SEED_PASSWORD", "")
    if not email or len(password) < 8:
        raise SystemExit("Set SEED_EMAIL and SEED_PASSWORD (8+ chars) in env — never commit them")
    if not get_settings().TIDB_URL:
        raise SystemExit("TIDB_URL missing — copy .env.example to .env first")

    url = normalize_url(get_settings().TIDB_URL)
    engine = create_engine(url, connect_args=connect_args_for(url), pool_pre_ping=True)
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        if db.query(User).filter_by(email=email).first():
            raise SystemExit(f"{email} already exists — nothing seeded")

        user = User(id=new_uuid(), email=email, password_hash=hash_password(password),
                    display_name="Demo Writer", role="user", is_active=True)
        db.add(user)
        project = Project(id=new_uuid(), user_id=user.id, title="Sample project",
                          slug="sample-project", idea="A demo workspace to explore the studio.")
        db.add(project)
        document = Document(id=new_uuid(), project_id=project.id, user_id=user.id,
                            type="rdd", tone="startup", depth="brief",
                            title="Sample RDD", status="ready")
        db.add(document)
        scores = []
        for i, (stitle, body) in enumerate(SAMPLE_SECTIONS):
            result = score_text(body)
            scores.append(result["human_percent"])
            db.add(Section(id=new_uuid(), document_id=document.id, title=stitle,
                           order_idx=i, content_md=body, word_count=count_words(body),
                           ai_score=result["ai_prob"], human_score=result["human_percent"],
                           iteration=0))
        document.human_score_avg = round(sum(scores) / len(scores), 2)
        db.commit()
        print(f"seeded {email}: 1 project, 1 document, {len(SAMPLE_SECTIONS)} sections, avg {document.human_score_avg}%")
    finally:
        db.close()


if __name__ == "__main__":
    main()
