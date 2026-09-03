"""Prompt builder + section splitter. MVP outlines: rdd, prd,
technical_design. Other types reuse the generic outline (data-only)."""
import re

from app.services.detector import count_words
from app.services.llm import nim_client
from app.services.llm.models import resolve_model

OUTLINES: dict[str, list[str]] = {
    "rdd": [
        "Executive Summary", "Goals & Non-Goals", "Functional Requirements",
        "Non-Functional Requirements", "System Architecture",
        "Technology Stack", "Risks & Mitigations",
    ],
    "prd": [
        "Executive Summary", "Users & Personas", "User Stories",
        "Functional Requirements", "Non-Functional Requirements",
        "UX Flows", "Release Milestones & Metrics",
    ],
    "technical_design": [
        "Overview", "Goals", "System Context", "Detailed Design",
        "Data Design", "Security & Error Handling", "Testing & Rollout",
    ],
}

GENERATE_SYSTEM = (
    "You are a senior principal engineer and tech writer. Write varied sentences "
    "10-26 words, active voice, contractions allowed, concrete metrics. Avoid AI "
    "cliches. Include one mermaid graph for architecture sections. "
    "Output markdown with ## Section titles."
)


def outline_for(doc_type: str) -> list[str]:
    return OUTLINES.get(doc_type, OUTLINES["rdd"])


def build_prompt(*, title: str, idea: str, doc_type: str, tone: str, depth: str) -> str:
    sections = ", ".join(outline_for(doc_type))
    target = "300-450" if depth == "detailed" else "150-250"
    return (
        f"Document type: {doc_type}. Title: {title}. Idea: {idea}. Tone: {tone}. "
        f"Write sections [{sections}], each {target} words. {GENERATE_SYSTEM}"
    )


def split_sections(markdown: str) -> list[dict]:
    """Split markdown on ## headings into title/content dicts."""
    chunks = re.split(r"^##\s+(.+)$", markdown, flags=re.MULTILINE)
    sections: list[dict] = []
    if chunks and chunks[0].strip() and not chunks[0].strip().startswith("#"):
        pass
    for i in range(1, len(chunks), 2):
        title = chunks[i].strip()
        body = chunks[i + 1].strip() if i + 1 < len(chunks) else ""
        if title:
            sections.append({"title": title, "content_md": body, "word_count": count_words(body)})
    if not sections and markdown.strip():
        sections.append({
            "title": "Document",
            "content_md": markdown.strip(),
            "word_count": count_words(markdown),
        })
    return sections


async def generate_sections(
    *, title: str, idea: str, doc_type: str, tone: str, depth: str,
    model_override: str | None = None,
) -> tuple[str, list[dict]]:
    model = resolve_model("generate", model_override)
    _, text = await nim_client.chat_complete(
        model,
        [
            {"role": "system", "content": GENERATE_SYSTEM},
            {"role": "user", "content": build_prompt(
                title=title, idea=idea, doc_type=doc_type, tone=tone, depth=depth)},
        ],
        role="generate",
    )
    return model, split_sections(text)
