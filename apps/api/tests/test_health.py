def test_health_shape(client):
    resp = client.get("/api/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["version"] == "1.13.0"
    assert "uptime" in body
    assert body["nimReady"] is True  # NIM_MOCK=true in tests


def test_health_is_public_but_meta_is_not(client):
    assert client.get("/api/health").status_code == 200
    assert client.get("/api/meta/models").status_code == 401
