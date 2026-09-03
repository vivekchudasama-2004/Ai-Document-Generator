"""Section reorder endpoint + security/response headers (spec S11/S14)."""


def _make_doc(client, auth_headers):
    resp = client.post(
        "/api/generate", headers=auth_headers,
        json={"title": "Reorder RDD", "idea": "Online shop for books",
              "doc_type": "rdd", "tone": "formal", "depth": "brief"},
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["document_id"]


def _titles(client, auth_headers, doc_id):
    doc = client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()
    return [(s["id"], s["title"]) for s in doc["sections"]]


def test_move_up_swaps_with_neighbour(client, auth_headers):
    doc_id = _make_doc(client, auth_headers)
    before = _titles(client, auth_headers, doc_id)
    assert len(before) >= 2
    second_id = before[1][0]

    moved = client.post(f"/api/sections/{second_id}/move",
                        headers=auth_headers, json={"direction": "up"})
    assert moved.status_code == 200, moved.text
    assert moved.json()["moved"] is True

    after = _titles(client, auth_headers, doc_id)
    assert [t for _, t in after] == [before[1][1], before[0][1], *[t for _, t in before[2:]]]


def test_move_at_edge_is_noop_and_bad_direction_422(client, auth_headers):
    doc_id = _make_doc(client, auth_headers)
    before = _titles(client, auth_headers, doc_id)

    edge = client.post(f"/api/sections/{before[0][0]}/move",
                       headers=auth_headers, json={"direction": "up"})
    assert edge.status_code == 200
    assert edge.json()["moved"] is False
    assert _titles(client, auth_headers, doc_id) == before

    bad = client.post(f"/api/sections/{before[0][0]}/move",
                      headers=auth_headers, json={"direction": "sideways"})
    assert bad.status_code == 422
    assert bad.json()["detail"]["code"] == "SECTION_BAD_MOVE"


def test_security_headers_and_request_id(client):
    resp = client.get("/api/health", headers={"X-Request-Id": "qa-trace-1"})
    assert resp.status_code == 200
    assert "data:" in resp.headers["Content-Security-Policy"]
    assert resp.headers["X-Request-Id"] == "qa-trace-1"

    auto = client.get("/api/health")
    assert auto.headers["X-Request-Id"]  # server-minted when absent
