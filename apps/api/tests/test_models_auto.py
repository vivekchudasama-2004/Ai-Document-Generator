"""Auto mode, rebalance minimums, manage-models endpoints."""


def test_auto_tiers_and_reasons():
    from app.services.llm.models import auto_select_model

    simple, reasons = auto_select_model(role="generate", idea="Shop for books",
                                        doc_type="rdd", depth="brief")
    assert simple == "mistralai/mistral-7b-instruct-v0.3" and reasons
    medium_idea = " ".join(["A platform for clinics with appointments and records"] * 4)
    medium, _ = auto_select_model(role="generate", idea=medium_idea,
                                  doc_type="prd", depth="detailed")
    assert medium == "nvidia/llama-3.1-nemotron-70b-instruct"
    complex_brief = " ".join(["Enterprise architecture for a bank ledger with diagrams"] * 12)
    flagship, _ = auto_select_model(role="generate", idea=complex_brief,
                                    doc_type="system_design", depth="detailed")
    assert flagship == "mistralai/mistral-large-2-instruct"
    short_human, _ = auto_select_model(role="humanize", text="Small section here.")
    assert short_human == "mistralai/mistral-7b-instruct-v0.3"
    long_human, _ = auto_select_model(role="humanize", text="x" * 5000)
    assert long_human == "nvidia/llama-3.1-nemotron-70b-instruct"


def test_resolve_auto_is_default():
    from app.core.config import get_settings
    from app.services.llm.models import resolve_model

    allowed = set(get_settings().allowed_models)
    # Explicit "auto" resolves from the brief; bare default honors .env config.
    assert resolve_model("generate", "auto") == "mistralai/mistral-7b-instruct-v0.3"  # empty brief
    assert resolve_model("humanize", "auto", text="hi") == "mistralai/mistral-7b-instruct-v0.3"
    assert resolve_model("generate") in allowed
    assert resolve_model("humanize") in allowed


def test_live_list_unknown_under_mock():
    from app.services.llm.models import live_model_ids

    assert live_model_ids() is None  # NIM_MOCK=true: never blocks


def test_rebalance_minimums():
    from app.services.exporter import paginate

    text = "Solid explanatory sentence with real content. " * 80  # ~480 words
    pages = paginate([{"content_md": text}])
    assert len(pages) >= 2
    for page in pages[:-1]:
        assert page["words"] >= 145, f"thin page: {page['words']}"


def test_models_endpoints(client, auth_headers):
    available = client.get("/api/models/available", headers=auth_headers).json()
    assert available["live"] is False  # mock mode: honest unknown state
    assert client.get("/api/models/enabled", headers=auth_headers).json()["items"] == []
    put = client.post("/api/models/enabled", headers=auth_headers,
                      json={"model_id": "nvidia/llama-3.1-nemotron-70b-instruct", "enabled": True})
    assert put.json() == {"model_id": "nvidia/llama-3.1-nemotron-70b-instruct", "enabled": True}
    enabled = client.get("/api/models/enabled", headers=auth_headers).json()["items"]
    assert [m["id"] for m in enabled] == ["nvidia/llama-3.1-nemotron-70b-instruct"]
    preview = client.get("/api/models/auto-preview?role=generate&doc_type=rdd&depth=brief&idea=Shop",
                         headers=auth_headers).json()
    assert preview["model"]["id"] and preview["reasons"]
    remove = client.post("/api/models/enabled", headers=auth_headers,
                         json={"model_id": "nvidia/llama-3.1-nemotron-70b-instruct", "enabled": False})
    assert remove.json()["enabled"] is False


def test_all_refused_maps_to_no_access(client, auth_headers, monkeypatch):
    """404/410 on every candidate → 502 MODEL_NO_ACCESS, not a bare 500."""
    from app.services.llm import nim_client

    async def fake_refused(model, messages, max_tokens, transport=None):
        raise nim_client.ModelRefused(f"LLM refused {model}: 404", 404)

    class _LiveSettings:
        NIM_MOCK = False
        NVIDIA_NIM_API_KEY = "test-key"

    monkeypatch.setattr(nim_client, "_post", fake_refused)
    monkeypatch.setattr(nim_client, "get_settings", lambda: _LiveSettings())
    resp = client.post("/api/generate", headers=auth_headers,
                       json={"title": "Refused", "idea": "Key without entitlements",
                             "doc_type": "rdd", "depth": "brief"})
    assert resp.status_code == 502, resp.text
    assert resp.json()["detail"]["code"] == "MODEL_NO_ACCESS"


def test_enabled_model_usable_in_generate(client, auth_headers):
    # mistralai/mixtral is NOT in ALLOWED_MODELS: only the enabled list admits it.
    client.post("/api/models/enabled", headers=auth_headers,
                json={"model_id": "mistralai/mixtral-8x22b-instruct", "enabled": True})
    resp = client.post("/api/generate", headers=auth_headers,
                       json={"title": "Extra", "idea": "Enabled model idea test",
                             "doc_type": "rdd", "depth": "brief",
                             "generation_model": "mistralai/mixtral-8x22b-instruct"})
    assert resp.status_code == 200, resp.text
    denied = client.post("/api/generate", headers=auth_headers,
                         json={"title": "Extra", "idea": "Enabled model idea test",
                               "doc_type": "rdd", "depth": "brief",
                               "generation_model": "unknown/fake-model"})
    assert denied.status_code == 422
