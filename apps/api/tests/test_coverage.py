"""Coverage fill: projects CRUD, sections edit/history, humanize batch/compare,
export docx/download, documents update/delete/filter, models validation,
nim_client budgets, auth_service edge cases."""
import pytest

from app.services.detector import score_text
from app.services.llm import nim_client
from app.services.llm.models import list_models, resolve_model


@pytest.fixture()
def project_id(client, auth_headers):
    resp = client.post("/api/projects", headers=auth_headers,
                       json={"title": "Coverage", "idea": "Coverage idea"})
    assert resp.status_code == 201, resp.text
    return resp.json()["id"]


@pytest.fixture()
def doc_id(client, auth_headers):
    resp = client.post("/api/generate", headers=auth_headers,
                       json={"title": "Cov Doc", "idea": "Coverage doc idea here",
                             "doc_type": "rdd", "depth": "brief"})
    assert resp.status_code == 200, resp.text
    return resp.json()["document_id"]


def test_projects_crud(client, auth_headers, project_id):
    assert client.post("/api/projects", headers=auth_headers, json={"title": ""}).status_code == 422
    listed = client.get("/api/projects?q=Cov", headers=auth_headers).json()
    assert listed["total"] >= 1
    got = client.get(f"/api/projects/{project_id}", headers=auth_headers).json()
    assert got["title"] == "Coverage"
    upd = client.put(f"/api/projects/{project_id}", headers=auth_headers,
                     json={"title": "Coverage 2"}).json()
    assert upd["title"] == "Coverage 2"
    assert client.delete(f"/api/projects/{project_id}", headers=auth_headers).json()["deleted"] is True
    assert client.get(f"/api/projects/{project_id}", headers=auth_headers).status_code == 404


def test_documents_update_delete_filter(client, auth_headers, doc_id):
    upd = client.put(f"/api/documents/{doc_id}", headers=auth_headers,
                     json={"title": "Renamed"}).json()
    assert upd["title"] == "Renamed"
    filtered = client.get("/api/documents?type=rdd", headers=auth_headers).json()
    assert filtered["total"] >= 1
    assert client.delete(f"/api/documents/{doc_id}", headers=auth_headers).json()["deleted"] is True


def test_section_edit_and_history(client, auth_headers, doc_id):
    doc = client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()
    sec_id = doc["sections"][0]["id"]
    new_text = "It's a rewritten section. Short and clear. Contractions help a lot, don't they?"
    edited = client.put(f"/api/sections/{sec_id}", headers=auth_headers,
                        json={"content_md": new_text}).json()
    assert edited["word_count"] > 5
    hist = client.get(f"/api/humanize/history/{sec_id}", headers=auth_headers).json()
    assert hist["sectionId"] == sec_id


def test_humanize_batch_and_compare(client, auth_headers, doc_id):
    batch = client.post("/api/humanize/batch", headers=auth_headers,
                        json={"document_id": doc_id, "strength": "light"}).json()
    assert "avgHumanAfter" in batch
    doc = client.get(f"/api/documents/{doc_id}", headers=auth_headers).json()
    sec_id = doc["sections"][0]["id"]
    comp = client.post("/api/humanize/compare", headers=auth_headers,
                       json={"section_id": sec_id}).json()
    assert "diff_unified" in comp and "word_diff" in comp


def test_export_docx_download_flow(client, auth_headers, doc_id):
    exp = client.post("/api/export/docx", headers=auth_headers,
                      json={"documentId": doc_id}).json()
    assert exp["words_total"] >= 0
    meta = client.get(f"/api/exports/{exp['exportId']}", headers=auth_headers).json()
    assert meta["format"] == "docx"
    dl = client.get(f"/api/exports/{exp['exportId']}/download", headers=auth_headers)
    assert dl.status_code == 200


def test_models_validation():
    assert resolve_model("generate", None)
    assert resolve_model("humanize", None)
    with pytest.raises(ValueError):
        resolve_model("generate", "evil/model")
    assert isinstance(list_models(), list)


async def _noop():
    return None


def test_nim_client_mock_and_budget():
    import asyncio

    model, text = asyncio.run(nim_client.chat_complete("meta/llama-3.1-8b-instruct", [
        {"role": "user", "content": "Hello"}]))
    assert "## " in text  # mock template
    assert nim_client.count_tokens("hello world") >= 1
    with pytest.raises(nim_client.BudgetExceeded):
        asyncio.run(nim_client.chat_complete(
            "meta/llama-3.1-8b-instruct",
            [{"role": "user", "content": "word " * 20000}]))


def test_humanizer_loop_structure():
    import asyncio

    result = asyncio.run(__import__("app.services.humanizer", fromlist=["humanize_text"]).humanize_text(
        "Furthermore, we leverage comprehensive robust paradigms. It is very important.",
        strength="light", max_iterations=2))
    assert result["iterations"] <= 2
    assert result["new_human"] >= result["old_human"]
    assert set(result["diff"]) == {"added", "removed"}


def test_auth_service_edges(client):
    from app.services import auth_service
    from conftest import TestingSession

    db = TestingSession()
    assert auth_service.request_reset(db, "nobody@example.com", app_url="http://x") is True
    with pytest.raises(ValueError):
        auth_service.reset_password(db, token="bogus-token", new_password="password123")
    assert score_text("")["human_percent"] >= 1
