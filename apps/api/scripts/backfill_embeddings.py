"""Backfill section embeddings for similar-search (needs EMBEDDING_* env + TIDB_URL).

Embeds sections missing embedding_json in batches of 32. Safe to re-run:
only rows without a stored vector are touched.

Usage:  python scripts/backfill_embeddings.py [--project-id <uuid>] [--limit 500]
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.config import get_settings
from app.db.client import Base, connect_args_for, normalize_url
from app.services import rag

import app.entities.user  # noqa: F401
import app.entities.admin_audit  # noqa: F401
import app.entities.user_model  # noqa: F401
import app.entities.project  # noqa: F401
import app.entities.document  # noqa: F401
import app.entities.section  # noqa: F401
import app.entities.export  # noqa: F401
from app.entities.section import Section


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-id", default=None)
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--all", action="store_true",
                        help="re-embed every section (required after switching EMBEDDING_MODEL)")
    opts = parser.parse_args()

    if not rag.is_configured():
        raise SystemExit("Set EMBEDDING_API_URL, EMBEDDING_API_KEY and EMBEDDING_MODEL first")
    if not get_settings().TIDB_URL:
        raise SystemExit("TIDB_URL missing — copy .env.example to .env first")

    url = normalize_url(get_settings().TIDB_URL)
    engine = create_engine(url, connect_args=connect_args_for(url), pool_pre_ping=True)
    Session = sessionmaker(bind=engine)
    db = Session()
    try:
        query = db.query(Section)
        if not opts.all:
            query = query.filter(Section.embedding_json.is_(None))
        if opts.project_id:
            from app.entities.document import Document
            query = query.join(Document, Section.document_id == Document.id).filter(
                Document.project_id == opts.project_id)
        rows = query.limit(opts.limit).all()
        done = 0
        for i in range(0, len(rows), 32):
            batch = rows[i:i + 32]
            texts = [(s.content_humanized_md or s.content_md)[:4000] for s in batch]
            for section, vec in zip(batch, rag.embed_texts(texts)):
                section.embedding_json = rag.encode_embedding(vec)
                section.embedding_model = get_settings().EMBEDDING_MODEL
                done += 1
            db.commit()
        print(f"embedded {done} sections ({len(rows)} pending in scope)")
    finally:
        db.close()


if __name__ == "__main__":
    main()
