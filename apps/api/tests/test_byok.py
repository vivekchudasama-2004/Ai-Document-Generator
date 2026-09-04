"""BYOK: encrypted provider keys, masked reads, SSRF-guarded customs,
enable-gating, and routed generation. Sealed off-network: _post is stubbed."""

SECRET = "test-byok-key-12345678"


def test_add_list_masked_delete_key(client, auth_headers):
    listed = client.get("/api/models/keys", headers=auth_headers).json()
    assert listed == {"items": []}

    saved = client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "groq", "label": "", "api_key": SECRET,
    })
    assert saved.status_code == 201, saved.text
    item = saved.json()["saved"]
    assert item["provider"] == "groq"
    assert item["masked_key"] == "tes••••5678"
    assert SECRET not in saved.text  # plaintext never leaves

    listed = client.get("/api/models/keys", headers=auth_headers).json()
    assert len(listed["items"]) == 1
    assert SECRET not in listed["items"][0]["masked_key"]

    deleted = client.delete(f"/api/models/keys/{item['id']}", headers=auth_headers)
    assert deleted.json() == {"deleted": item["id"]}
    assert client.get("/api/models/keys", headers=auth_headers).json() == {"items": []}
    missing = client.delete(f"/api/models/keys/{item['id']}", headers=auth_headers)
    assert missing.status_code == 404
    assert missing.json()["detail"]["code"] == "BYOK_NOT_FOUND"


def test_add_key_validation(client, auth_headers):
    bad_provider = client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "nvidia", "api_key": SECRET,
    })
    assert bad_provider.status_code == 422
    assert bad_provider.json()["detail"]["code"] == "BYOK_INVALID"

    short = client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "groq", "api_key": "tiny",
    })
    assert short.status_code == 422

    custom_no_url = client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "custom", "label": "mine", "api_key": SECRET,
    })
    assert custom_no_url.status_code == 422

    http_url = client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "custom", "label": "mine", "api_key": SECRET,
        "base_url": "http://llm.example.com/v1",
    })
    assert http_url.status_code == 422  # https only

    for bad in ("https://localhost:8443/v1", "https://127.0.0.1/v1",
                "https://10.0.0.5/v1", "https://svc.internal/v1"):
        resp = client.post("/api/models/keys", headers=auth_headers, json={
            "provider": "custom", "label": "mine", "api_key": SECRET, "base_url": bad,
        })
        assert resp.status_code == 422, bad  # SSRF guard

    ok = client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "custom", "label": "mine", "api_key": SECRET,
        "base_url": "https://llm.example.com/v1/",
    })
    assert ok.status_code == 201, ok.text
    assert ok.json()["saved"]["base_url"] == "https://llm.example.com/v1"


def test_enable_gated_on_key(client, auth_headers):
    # No key saved: provider ids are rejected even in mock mode.
    denied = client.post("/api/models/enabled", headers=auth_headers, json={
        "model_id": "groq/llama-3.1-8b-instant", "enabled": True,
    })
    assert denied.status_code == 422

    client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "groq", "api_key": SECRET,
    })
    allowed = client.post("/api/models/enabled", headers=auth_headers, json={
        "model_id": "groq/llama-3.1-8b-instant", "enabled": True,
    })
    assert allowed.json()["enabled"] is True

    # Custom ids need the matching label's key.
    denied_custom = client.post("/api/models/enabled", headers=auth_headers, json={
        "model_id": "custom/other/some-model", "enabled": True,
    })
    assert denied_custom.status_code == 422


def test_transport_routing_and_generation(client, auth_headers, monkeypatch):
    from app.services.llm import nim_client

    client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "groq", "api_key": SECRET,
    })
    client.post("/api/models/enabled", headers=auth_headers, json={
        "model_id": "groq/llama-3.1-8b-instant", "enabled": True,
    })

    seen = {}

    async def fake_post(model, messages, max_tokens, transport=None):
        seen.update(transport or {})
        assert transport["base_url"] == "https://api.groq.com/openai/v1"
        assert transport["api_key"] == SECRET
        assert transport["model"] == "llama-3.1-8b-instant"
        return "## Shipped\nRouted through the user key."

    monkeypatch.setattr(nim_client, "_post", fake_post)
    resp = client.post("/api/generate", headers=auth_headers, json={
        "title": "BYOK Doc", "idea": "Docs routed via a user key",
        "doc_type": "rdd", "depth": "brief",
        "generation_model": "groq/llama-3.1-8b-instant",
    })
    assert resp.status_code == 200, resp.text
    assert SECRET not in resp.text  # key never leaks into responses
    assert seen["api_key"] == SECRET


def test_ciphertext_at_rest(client, auth_headers):
    from conftest import TestingSession
    from app.entities.llm_key import LLMKey

    client.post("/api/models/keys", headers=auth_headers, json={
        "provider": "openrouter", "api_key": SECRET,
    })
    db = TestingSession()
    row = db.query(LLMKey).filter(LLMKey.provider == "openrouter").one()
    assert SECRET not in row.encrypted_key
    assert row.encrypted_key != SECRET
    db.close()
