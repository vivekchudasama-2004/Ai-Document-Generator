"""150 words/page engine: sentence-greedy pagination (code/diagrams excluded)
+ print-CSS HTML builder for the MVP client-print path."""
import re

from app.services.detector import _sentences, count_words

WORDS_PER_PAGE = 150
TOLERANCE = 5


def _body_text(markdown: str) -> str:
    no_code = re.sub(r"```.*?```", "", markdown, flags=re.DOTALL)
    return re.sub(r"^#{1,6}\s+.*$", "", no_code, flags=re.MULTILINE)


def paginate_sections(sections: list[dict]) -> tuple[list[dict], list[dict]]:
    """Paginate each section separately so every section starts on a fresh
    page. Returns (pages, toc) where toc = [{title, page}] with exact
    1-based body page numbers."""
    pages: list[dict] = []
    toc: list[dict] = []
    for section in sections:
        text = section.get("content_humanized_md") or section.get("content_md", "")
        sentences = _sentences(_body_text(text))
        if not sentences:
            continue
        toc.append({"title": section.get("title", ""), "page": len(pages) + 1})
        current: list[str] = []
        current_words = 0
        for sentence in sentences:
            words = count_words(sentence)
            if current_words + words > WORDS_PER_PAGE + TOLERANCE and current:
                pages.append({"section": section.get("title", ""), "words": current_words,
                              "sentences": current})
                current, current_words = [], 0
            current.append(sentence)
            current_words += words
        if current:
            pages.append({"section": section.get("title", ""), "words": current_words,
                          "sentences": current})
    if len(pages) > 1 and pages[-1]["words"] < 100:
        last = pages.pop()
        pages[-1]["sentences"].extend(last["sentences"])
        pages[-1]["words"] += last["words"]
        if last.get("section") != pages[-1].get("section"):
            # Trailing sheet folded into the previous section's page:
            # point this section's TOC entry at the merged sheet.
            for entry in toc:
                if entry["title"] == last.get("section"):
                    entry["page"] = len(pages)
    return pages, toc


def paginate(sections: list[dict]) -> list[dict]:
    """Greedy sentence packing to ~150 words/page; merge-forward if last <100."""
    pages: list[dict] = []
    current: list[str] = []
    current_words = 0

    def flush():
        nonlocal current, current_words
        if current:
            pages.append({"words": current_words, "sentences": current})
            current, current_words = [], 0

    for section in sections:
        text = section.get("content_humanized_md") or section.get("content_md", "")
        for sent in _sentences(_body_text(text)):
            w = count_words(sent)
            if current_words + w > WORDS_PER_PAGE + TOLERANCE and current:
                flush()
            current.append(sent)
            current_words += w
    flush()
    if len(pages) > 1 and pages[-1]["words"] < 100:
        last = pages.pop()
        pages[-1]["sentences"].extend(last["sentences"])
        pages[-1]["words"] += last["words"]
    return pages


def build_print_html(
    *, title: str, doc_type: str, sections: list[dict],
    author: str = "DocuForge Humanized", version: str = "1.5.1",
    date_str: str | None = None,
) -> str:
    """Cover + TOC (exact start pages) + 150wpp body with running footers."""
    from datetime import date

    pages, toc = paginate_sections(sections)
    total_pages = 2 + len(pages)  # cover + TOC + body
    # TOC page numbers are body-relative; offset by cover + TOC sheets.
    toc_rows = "".join(
        f"<div class='toc-row'><span>{entry['title']}</span>"
        f"<span class='dots'></span><span>{entry['page'] + 2}</span></div>"
        for entry in toc
    )
    body_pages = "".join(
        f"<section class='page'><h2>{page.get('section', '')}</h2>"
        f"<p>{' '.join(page['sentences'])}</p>"
        f"<footer>Page {i + 3} / {total_pages}</footer></section>"
        for i, page in enumerate(pages)
    )
    return f"""<!DOCTYPE html><html><head><meta charset='utf-8'><title>{title}</title>
<style>
@page {{ size: A4; margin: 2.5cm 2cm; @bottom-center {{ content: counter(page) ' / ' counter(pages); }} }}
body {{ font-family: Inter, sans-serif; font-size: 11pt; line-height: 1.6; }}
h1, h2 {{ font-family: Newsreader, serif; }}
.page {{ page-break-after: always; }}
footer {{ text-align: center; color: #6B7280; font-size: 9pt; }}
.cover {{ text-align: center; padding-top: 6cm; }}
.toc-row {{ display: flex; gap: 8px; margin: 6px 0; }}
.toc-row .dots {{ flex: 1; border-bottom: 1px dotted #6B7280; }}
</style></head><body>
<section class='page cover'><p>{doc_type}</p><h1>{title}</h1>
<p>{author} · v{version} · {date_str or date.today().isoformat()}</p></section>
<section class='page'><h1>Contents</h1>{toc_rows}<footer>Page 2 / {total_pages}</footer></section>
{body_pages}
</body></html>"""


def build_docx(*, title: str, sections: list[dict]) -> bytes:
    from io import BytesIO

    from docx import Document as DocxDocument

    doc = DocxDocument()
    doc.add_heading(title, level=0)
    for section in sections:
        doc.add_heading(section.get("title", ""), level=1)
        doc.add_paragraph(section.get("content_humanized_md") or section.get("content_md", ""))
    buf = BytesIO()
    doc.save(buf)
    return buf.getvalue()
