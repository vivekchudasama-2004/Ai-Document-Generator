"""v1.12.0: stats endpoint, cursor pagination, doc search, model override."""
import pytest


@pytest.fixture()
def three_projects(client, auth_headers):
    ids = []
    for title in ("Cursor One", "Cursor Two", "Cursor Three"):
        resp = client.post("/api/projects", headers=auth_headers, json={"title": title})
        assert resp.status_code == 201, resp.text
        ids.append(resp.json()["id"])
    return ids


def test_stats_totals(client, auth_headers, three_projects):
    stats = client.get("/api/stats", headers=auth_headers).json()
    assert stats["projects"] >= 3
    assert stats["documents"] >= 0
    assert stats["exports"] >= 0
    client.cookies.clear()  # drop the signup session cookie: this must be anonymous
    assert client.get("/api/stats").status_code in (401, 403)


def test_cursor_pagination_no_overlap(client, auth_headers, three_projects):
    first = client.get("/api/projects?limit=2", headers=auth_headers).json()
    assert len(first["items"]) == 2
    assert first["next_cursor"], "more rows remain — cursor expected"
    second = client.get(
        f"/api/projects?limit=2&cursor={first['next_cursor']}", headers=auth_headers
    ).json()
    first_ids = {p["id"] for p in first["items"]}
    second_ids = {p["id"] for p in second["items"]}
    assert not first_ids & second_ids, "pages must not overlap"
    assert three_projects[-1] in first_ids | second_ids
    assert second["next_cursor"] is None, "exhausted — no further cursor"


def test_cursor_invalid_is_ignored(client, auth_headers):
    body = client.get("/api/projects?cursor=!!!not-a-cursor!!!", headers=auth_headers).json()
    assert body["total"] >= 0
    assert body["next_cursor"] is None


def test_documents_search_q(client, auth_headers):
    resp = client.post(
        "/api/generate", headers=auth_headers,
        json={"title": "Zebra Search Doc", "idea": "A searchable doc idea here",
              "doc_type": "rdd", "depth": "brief"},
    )
    assert resp.status_code == 200, resp.text
    hits = client.get("/api/documents?q=Zebra", headers=auth_headers).json()
    assert hits["total"] >= 1
    assert all("zebra" in d["title"].lower() for d in hits["items"])
    assert client.get("/api/documents?q=qqq-no-such-doc", headers=auth_headers).json()["total"] == 0


def test_put_models_override(client, auth_headers):
    resp = client.post(
        "/api/generate", headers=auth_headers,
        json={"title": "Model Override Doc", "idea": "An override doc idea here",
              "doc_type": "rdd", "depth": "brief"},
    )
    doc_id = resp.json()["document_id"]
    upd = client.put(f"/api/documents/{doc_id}", headers=auth_headers,
                     json={"humanize_model": "auto"}).json()
    assert upd["humanize_model"], "resolved model id expected"
    bad = client.put(f"/api/documents/{doc_id}", headers=auth_headers,
                     json={"generation_model": "evil/model"})
    assert bad.status_code == 422
