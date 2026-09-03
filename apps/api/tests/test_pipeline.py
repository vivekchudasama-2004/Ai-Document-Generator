"""Generate → detect → humanize → export pipeline (NIM_MOCK=true)."""
from app.services.detector import count_words, score_text
from app.services.exporter import build_print_html, paginate
from app.services.generator import split_sections
from app.services.mermaid import sanitize_svg


def test_score_text_shape():
    result = score_text("It's a practical plan. Furthermore, we leverage robust holistic paradigms.")
    assert 1 <= result["human_percent"] <= 99
    assert result["reasons"], "must explain itself"
    assert result["details"]["cliche_hits"] >= 2


def test_split_and_paginate():
    md = "## Alpha\n" + ("Clear short sentence. " * 60) + "\n## Beta\n" + ("Another one. " * 60)
    sections = split_sections(md)
    assert len(sections) == 2
    pages = paginate([{"content_md": s["content_md"]} for s in sections])
    assert pages, "must produce pages"
    assert all(p["words"] <= 160 for p in pages)


def test_sanitize_svg_strips_xss():
    evil = '<svg onload="alert(1)"><script>alert(2)</script><rect width="10"/></svg>'
    clean = sanitize_svg(evil)
    assert "onload" not in clean and "<script" not in clean and "<svg" in clean


def test_generate_pipeline(client, auth_headers):
    resp = client.post(
        "/api/generate",
        headers=auth_headers,
        json={"title": "Shop RDD", "idea": "Online shop for books",
              "doc_type": "rdd", "tone": "formal", "depth": "brief"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert len(body["sections"]) >= 3
    assert "-" in body["document_id"]
    doc_id = body["document_id"]

    first = body["sections"][0]
    assert first["human_score"] is not None

    # humanize one section
    sec_id = first["id"]
    hum = client.post("/api/humanize", headers=auth_headers,
                      json={"section_id": sec_id, "strength": "light"})
    assert hum.status_code == 200, hum.text
    assert hum.json()["human_percent_final"] >= first["human_score"]

    # export pdf (print-HTML MVP)
    exp = client.post("/api/export/pdf", headers=auth_headers,
                      json={"documentId": doc_id})
    assert exp.status_code == 200, exp.text
    assert exp.json()["pages"] >= 1

    # print html builds
    html = build_print_html(title="T", doc_type="rdd",
                            sections=[{"title": "A", "content_md": "Hello world. " * 40}])
    assert "@page" in html and count_words("Hello world. " * 40) == 80
