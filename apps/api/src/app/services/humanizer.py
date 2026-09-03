"""Humanize loop: NIM rewrite → spaCy verify, keep best of ≤3 iterations."""
import difflib
import re

from app.services.detector import score_text
from app.services.llm import nim_client
from app.services.llm.models import resolve_model

HUMANIZE_SYSTEM = {
    "light": "Fix the stiffest sentences only. Keep structure. Use contractions.",
    "medium": (
        "Rewrite to sound fully human. Keep meaning. Mix short punchy sentences "
        "with longer explanatory ones. Add one concrete example. Use contractions. "
        "Avoid: delve, leverage, comprehensive, foster, furthermore."
    ),
    "aggressive": (
        "Rewrite from scratch in a vivid human voice. Keep facts and meaning. "
        "Vary rhythm hard, add an anecdote, contractions everywhere. "
        "Never use: delve, leverage, comprehensive, foster, furthermore, moreover."
    ),
}


def _mock_rewrite(text: str) -> str:
    """Deterministic offline rewrite: splits long sentences, adds contractions."""
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    out: list[str] = []
    for p in parts:
        p = re.sub(r"\bit is\b", "it's", p, flags=re.IGNORECASE)
        p = re.sub(r"\bthat is\b", "that's", p, flags=re.IGNORECASE)
        p = re.sub(r"\bdo not\b", "don't", p, flags=re.IGNORECASE)
        p = re.sub(r"\bcannot\b", "can't", p, flags=re.IGNORECASE)
        if len(p.split()) > 26:
            mid = len(p) // 2
            cut = p.rfind(",", 0, mid)
            if cut > 0:
                out.extend([p[:cut].strip() + ".", p[cut + 1 :].strip().capitalize()])
                continue
        out.append(p)
    return " ".join(out)


def word_diff(old: str, new: str) -> dict:
    sm = difflib.SequenceMatcher(None, old.split(), new.split())
    added = removed = 0
    for tag, i1, i2, j1, j2 in sm.get_opcodes():
        if tag in ("insert", "replace"):
            added += j2 - j1
        if tag in ("delete", "replace"):
            removed += i2 - i1
    return {"added": added, "removed": removed}


async def humanize_text(
    text: str, *, strength: str = "medium", model_override: str | None = None,
    max_iterations: int = 3,
) -> dict:
    model = resolve_model("humanize", model_override)
    model_used = model  # nim_client may switch models on retry; track the actual one
    old_score = score_text(text)
    best_text, best_score = text, old_score["human_percent"]
    history = [{"iteration": 0, "human_percent": best_score}]
    iterations = 0
    for i in range(1, max_iterations + 1):
        try:
            model_used, candidate = await nim_client.chat_complete(
                model,
                [
                    {"role": "system", "content": HUMANIZE_SYSTEM[strength]},
                    {"role": "user", "content": best_text},
                ],
                role="humanize",
            )
        except Exception:
            candidate = _mock_rewrite(best_text)
        new_score = score_text(candidate)["human_percent"]
        iterations = i
        history.append({"iteration": i, "human_percent": new_score})
        if new_score > best_score:
            best_text, best_score = candidate, new_score
        if best_score >= 95:
            break
    return {
        "old_content": text,
        "new_content": best_text,
        "old_human": old_score["human_percent"],
        "new_human": best_score,
        "iterations": iterations,
        "diff": word_diff(text, best_text),
        "history": history,
        "model": model_used,
    }
