"""v1.13.0: retrieval over stored embeddings (offline unit + envelope tests)."""
from app.core.config import get_settings
from app.services import rag


def test_rank_orders_by_cosine():
    cands = [("a", [1.0, 0.0]), ("b", [0.0, 1.0]), ("c", [0.7, 0.7])]
    ranked = rag.rank([1.0, 0.1], cands, top_k=3)
    assert [cid for cid, _ in ranked] == ["a", "c", "b"]
    assert ranked[0][1] > ranked[1][1] > ranked[2][1]


def test_rank_skips_malformed():
    ranked = rag.rank([1.0, 0.0], [("bad", [1.0]), ("good", [1.0, 0.0])], top_k=2)
    assert ranked[0][0] == "good"
    assert ranked[-1] == ("bad", -1.0)


def test_embedding_codec_roundtrip():
    raw = rag.encode_embedding([3.0, 4.0])
    vec = rag.decode_embedding(raw)
    assert vec == [0.6, 0.8]
    assert rag.decode_embedding(None) is None
    assert rag.decode_embedding("not-json") is None
    assert rag.decode_embedding("[1,2]") == [1.0, 2.0]


def test_find_similar_offline():
    class FakeSection:
        def __init__(self, sid, emb):
            self.id = sid
            self.title = f"Section {sid}"
            self.embedding_json = emb

    class FakeDoc:
        def __init__(self, did):
            self.id = did
            self.title = f"Doc {did}"

    rows = [
        (FakeSection("s1", rag.encode_embedding([1.0, 0.0])), FakeDoc("d1")),
        (FakeSection("s2", rag.encode_embedding([0.0, 1.0])), FakeDoc("d1")),
        (FakeSection("s3", None), FakeDoc("d1")),
    ]

    class FakeQuery:
        def join(self, *a, **k): return self
        def filter(self, *a, **k): return self
        def all(self): return rows

    class FakeDB:
        def query(self, *a, **k): return FakeQuery()

    out = rag.find_similar(FakeDB(), user_id="u", query_vec=[1.0, 0.1], top_k=5)
    assert [r["section_id"] for r in out] == ["s1", "s2"]
    assert out[0]["document_title"] == "Doc d1"
    assert out[0]["score"] > out[1]["score"]


def test_embed_texts_request_shape(monkeypatch):
    seen = {}

    class FakeResp:
        def raise_for_status(self): pass
        def json(self):
            return {"data": [{"index": 1, "embedding": [0.0, 1.0]},
                             {"index": 0, "embedding": [1.0, 0.0]}]}

    def fake_post(url, headers, json, timeout):
        seen.update(url=url, model=json["model"], n=len(json["input"]),
                    input_type=json["input_type"])
        assert url.endswith("/embeddings")
        assert headers["Authorization"].startswith("Bearer ")
        return FakeResp()

    monkeypatch.setattr("httpx.post", fake_post)
    monkeypatch.setenv("EMBEDDING_API_URL", "https://api.example.com/v1")
    monkeypatch.setenv("EMBEDDING_API_KEY", "test-key")
    monkeypatch.setenv("EMBEDDING_MODEL", "test-model")
    get_settings.cache_clear()  # get_settings is lru_cached: re-read env
    try:
        vecs = rag.embed_texts(["hello", "world"])
    finally:
        get_settings.cache_clear()
    assert vecs == [[1.0, 0.0], [0.0, 1.0]], "ordered by index, not response order"
    assert seen["model"] == "test-model" and seen["n"] == 2
    assert seen["input_type"] == "document", "stored sections embed as documents"


def test_refresh_section_embedding(monkeypatch):
    class FakeSection:
        content_humanized_md = "Humanized text here, with contractions — it reads naturally."
        content_md = "Raw text."
        embedding_json = None

    monkeypatch.setattr("app.services.rag.is_configured", lambda: True)
    monkeypatch.setattr("app.services.rag.embed_texts",
                        lambda texts, input_type="document", model=None: [[0.0, 1.0]])
    row = FakeSection()
    assert rag.refresh_section_embedding(row) is True
    assert rag.decode_embedding(row.embedding_json) == [0.0, 1.0]

    monkeypatch.setattr("app.services.rag.is_configured", lambda: False)
    assert rag.refresh_section_embedding(FakeSection()) is False, "off means skip, never raise"


def test_similar_503_when_unconfigured(client, auth_headers, monkeypatch):
    _isolate_no_embeddings(monkeypatch)
    resp = client.post("/api/rag/similar", headers=auth_headers, json={"text": "hello"})
    assert resp.status_code == 503
    assert resp.json()["detail"]["code"] == "RAG_NOT_CONFIGURED"


def test_similar_requires_auth(client):
    assert client.post("/api/rag/similar", json={"text": "hi"}).status_code in (401, 403)


def _isolate_no_embeddings(monkeypatch):
    import app.core.config as _config
    import app.services.rag as _rag
    # get_settings is lru_cached AND env_file is bound at import: the only
    # hermetic lever is replacing the lookup inside the rag namespace.
    blank = _config.Settings(EMBEDDING_API_URL="", EMBEDDING_API_KEY="", EMBEDDING_MODEL="")
    monkeypatch.setattr(_rag, "get_settings", lambda: blank)


def test_resolve_embedding_model(monkeypatch):
    _isolate_no_embeddings(monkeypatch)
    assert rag.resolve_embedding_model(None) == ""
    assert rag.resolve_embedding_model("auto") == ""
    assert rag.resolve_embedding_model("voyage-3-large") == "voyage-3-large"
    try:
        rag.resolve_embedding_model("evil/model")
        raise AssertionError("disallowed model must raise")
    except ValueError:
        pass


def test_similar_rejects_bad_model(client, auth_headers):
    resp = client.post("/api/rag/similar", headers=auth_headers,
                       json={"text": "hello", "embedding_model": "evil/model"})
    assert resp.status_code == 422
    assert resp.json()["detail"]["code"] == "MODEL_NOT_ALLOWED"


def test_status_when_unconfigured(client, auth_headers, monkeypatch):
    _isolate_no_embeddings(monkeypatch)
    body = client.get("/api/rag/status", headers=auth_headers).json()
    assert body["configured"] is False
    assert body["model"] is None
    assert body["sections_total"] >= 0
