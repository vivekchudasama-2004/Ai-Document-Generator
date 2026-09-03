"""Every error speaks the envelope: { detail: { code, message } }."""


def _envelope(response):
    body = response.json()
    assert "detail" in body and "code" in body["detail"] and "message" in body["detail"]
    return body["detail"]


def test_duplicate_signup_is_409_with_code(client):
    client.post("/api/auth/signup",
                json={"email": "dup@example.com", "password": "password123"})
    second = client.post("/api/auth/signup",
                         json={"email": "dup@example.com", "password": "password123"})
    assert second.status_code == 409
    assert _envelope(second)["code"] == "AUTH_EMAIL_TAKEN"


def test_bad_login_envelope(client):
    resp = client.post("/api/auth/login",
                       json={"email": "ghost@example.com", "password": "password123"})
    assert resp.status_code == 401
    assert _envelope(resp)["code"] == "AUTH_BAD_CREDENTIALS"


def test_unauthenticated_envelope(client):
    resp = client.get("/api/projects")
    assert resp.status_code == 401
    assert _envelope(resp)["code"] == "AUTH_REQUIRED"


def test_missing_doc_and_template_envelopes(client, auth_headers):
    missing = "12345678-1234-5678-1234-567812345678"
    doc = client.get(f"/api/documents/{missing}", headers=auth_headers)
    assert doc.status_code == 404
    assert _envelope(doc)["code"] == "DOC_NOT_FOUND"
    template = client.get("/api/templates/nope", headers=auth_headers)
    assert template.status_code == 404
    assert _envelope(template)["code"] == "TEMPLATE_UNKNOWN"


def test_disallowed_model_envelope(client, auth_headers):
    resp = client.post("/api/documents", headers=auth_headers,
                       json={"title": "M", "generation_model": "evil/model"})
    assert resp.status_code == 422
    envelope = _envelope(resp)
    assert envelope["code"] == "MODEL_NOT_ALLOWED"
    assert "evil/model" in envelope["message"]
