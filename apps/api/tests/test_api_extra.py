"""Cross-user isolation, versioning, exports, SSE, templates, admin stats."""
import json


def _signup(client, email):
    resp = client.post("/api/auth/signup",
                       json={"email": email, "password": "password123"})
    assert resp.status_code == 201, resp.text
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_signup_rate_limit_is_enforced(client):
    codes = set()
    for i in range(7):
        resp = client.post("/api/auth/signup",
                           json={"email": f"rl{i}@example.com", "password": "password123"})
        codes.add(resp.status_code)
    assert 429 in codes  # 5/minute guard trips; prod behavior intact


def test_cross_user_doc_is_404_not_403(client, auth_headers):
    other = _signup(client, "other@example.com")
    made = client.post("/api/generate", headers=auth_headers,
                       json={"title": "Mine", "idea": "Secret idea here",
                             "doc_type": "rdd"})
    doc_id = made.json()["document_id"]
    resp = client.get(f"/api/documents/{doc_id}", headers=other)
    assert resp.status_code == 404  # no existence oracle


def test_duplicate_and_restore_roundtrip(client, auth_headers):
    made = client.post("/api/generate", headers=auth_headers,
                       json={"title": "Cycle", "idea": "Roundtrip idea test",
                             "doc_type": "prd", "depth": "brief"})
    doc_id = made.json()["document_id"]
    dup = client.post(f"/api/documents/{doc_id}/duplicate", headers=auth_headers)
    assert dup.status_code == 200
    new_id, version_no = dup.json()["newId"], dup.json()["version_no"]
    assert version_no == 1
    restored = client.post(f"/api/documents/{new_id}/restore/{version_no}",
                           headers=auth_headers)
    assert restored.json()["restored"] is True
    versions = client.get(f"/api/documents/{new_id}/versions", headers=auth_headers)
    assert versions.json()["items"][0]["version_no"] == 1


def test_refresh_rotates(client):
    resp = client.post("/api/auth/signup",
                       json={"email": "ref@example.com", "password": "password123"})
    refresh = resp.json()["refresh_token"]
    second = client.post("/api/auth/refresh", json={"refresh_token": refresh})
    assert second.status_code == 200
    pair = second.json()
    assert pair["access_token"] and pair["refresh_token"]
    me = client.get("/api/auth/me",
                    headers={"Authorization": f"Bearer {pair['access_token']}"})
    assert me.status_code == 200  # rotated access token works


def test_exports_list_and_templates(client, auth_headers):
    assert client.get("/api/exports", headers=auth_headers).json()["total"] == 0
    templates = client.get("/api/templates", headers=auth_headers).json()["items"]
    assert len(templates) == 12
    assert sum(1 for t in templates if t["mvp"]) == 3


def test_generate_stream_events(client, auth_headers):
    resp = client.post("/api/generate/stream", headers=auth_headers,
                       json={"title": "Stream", "idea": "Streaming idea test",
                             "doc_type": "rdd", "depth": "brief"})
    assert resp.status_code == 200
    assert "text/event-stream" in resp.headers["content-type"]
    events = [line for line in resp.text.splitlines() if line.startswith("event:")]
    kinds = {e.split(":")[1].strip() for e in events}
    assert {"section.start", "done"} <= kinds
    first_data = next(line for line in resp.text.splitlines() if line.startswith("data:"))
    assert "documentId" in json.loads(first_data[5:]) or "documentId" in resp.text


def test_detect_batch_and_mermaid(client, auth_headers):
    batch = client.post("/api/detect/batch", headers=auth_headers,
                        json={"texts": [{"id": "a", "text": "Hello world, it's a fine day."}]})
    assert batch.json()["results"][0]["id"] == "a"
    evil = client.post("/api/mermaid/render", headers=auth_headers,
                       json={"code": '<svg onload="x()"><g></g></svg>'})
    assert evil.json()["error"] is None
    assert "onload" not in evil.json()["svg"]


def test_admin_stats_shape(client):
    from app.core.security import hash_password
    from app.repositories import user_repo
    from conftest import TestingSession

    db = TestingSession()
    admin = user_repo.create(db, email="stats-admin@example.com",
                             password_hash=hash_password("adminpass123"),
                             display_name="A")
    user_repo.set_role(db, admin, "admin")
    token = client.post("/api/auth/login",
                        json={"email": "stats-admin@example.com",
                              "password": "adminpass123"}).json()["access_token"]
    stats = client.get("/api/admin/stats",
                       headers={"Authorization": f"Bearer {token}"}).json()
    assert {"users", "docs", "docs_by_type"} <= set(stats)
