"""Spec-gap coverage: cloudinary parse, sapling blend, usage ledger,
TOC pagination, admin audit trail, per-model prompt rails."""
import json


def test_cloudinary_parse_and_off_fallback(monkeypatch):
    from app.core.config import get_settings
    from app.services.storage.cloudinary_client import parse_cloudinary_url, upload_bytes

    key, secret, cloud = parse_cloudinary_url("cloudinary://k:s@mycloud")
    assert (key, secret, cloud) == ("k", "s", "mycloud")
    monkeypatch.setattr(get_settings(), "CLOUDINARY_URL", "")
    assert upload_bytes(b"data", public_id="x") is None  # no network touched


def test_sapling_blend_and_absent_key():
    from app.services.detector import _sapling_score, blend_with_sapling

    assert _sapling_score("anything") is None  # no key in test env
    assert blend_with_sapling(80.0, 0.2) == 80.0
    assert blend_with_sapling(60.0, 1.0) == 30.0


def test_usage_ledger_recorded(client, auth_headers):
    import uuid

    from app.repositories import document_repo
    from conftest import TestingSession

    made = client.post("/api/generate", headers=auth_headers,
                       json={"title": "Ledger", "idea": "Usage ledger idea check",
                             "doc_type": "rdd", "depth": "brief"})
    doc_id = made.json()["document_id"]
    me = client.get("/api/auth/me", headers=auth_headers).json()
    db = TestingSession()
    row = document_repo.get_owned(db, user_id=me["id"], document_id=doc_id)
    usage = json.loads(row.tokens_used_json)
    assert usage["completion_tokens"] > 0
    assert "llama" in usage["model"] or "nemotron" in usage["model"]
    assert uuid.UUID(doc_id)  # opaque UUID, never sequential


def test_toc_pagination_exact():
    from app.services.exporter import build_print_html, paginate_sections

    sections = [
        {"title": "Alpha", "content_md": "Clear short sentence. " * 60},
        {"title": "Beta", "content_md": "Another one here. " * 10},
    ]
    pages, toc = paginate_sections(sections)
    assert toc[0] == {"title": "Alpha", "page": 1}
    assert toc[1]["page"] == len([p for p in pages]) and toc[1]["page"] > 1
    assert all(p["words"] <= 155 for p in pages)
    html = build_print_html(title="T", doc_type="rdd", sections=sections)
    assert "Contents" in html and "Alpha" in html and "Page 2 /" in html


def test_admin_audit_trail(client):
    from app.core.security import hash_password
    from app.entities.admin_audit import AdminAudit
    from app.repositories import user_repo
    from conftest import TestingSession

    db = TestingSession()
    admin = user_repo.create(db, email="audit-admin@example.com",
                             password_hash=hash_password("adminpass123"),
                             display_name="A")
    target = user_repo.create(db, email="audit-user@example.com",
                              password_hash=hash_password("userpass123"),
                              display_name="U")
    user_repo.set_role(db, admin, "admin")
    token = client.post("/api/auth/login",
                        json={"email": "audit-admin@example.com",
                              "password": "adminpass123"}).json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.put(f"/api/admin/users/{target.id}/role",
                      headers=headers, json={"role": "admin"})
    assert resp.status_code == 200
    trail = db.query(AdminAudit).filter(AdminAudit.target_id == target.id).all()
    assert len(trail) == 1 and trail[0].old_role == "user" and trail[0].new_role == "admin"
    stats = client.get("/api/admin/stats", headers=headers).json()
    assert "recent_audits" in stats and "tokens_by_model" in stats


def test_per_model_prompt_rails():
    from app.services.llm.models import humanize_suffix

    assert "20 words" in humanize_suffix("meta/llama-3.1-8b-instruct")
    assert humanize_suffix("meta/llama-3.1-405b-instruct") == ""


def test_meta_detector_shape(client, auth_headers):
    detector = client.get("/api/meta/models", headers=auth_headers).json()["detector"]
    assert {"mode", "analyzer", "demo_mode", "sapling"} <= set(detector)
