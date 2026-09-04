"""Humanize loop: NIM rewrite → spaCy verify, keep best of ≤3 iterations."""
import difflib
import re

from app.services.detector import score_text
from app.services import keys as _keys
from app.services.llm import nim_client
from app.services.llm.models import humanize_suffix, resolve_model

HUMANIZE_SYSTEM = {
    "light": (
        "ROLE: Minimal-touch copy editor.\n"
        "GOAL: Fix only the stiffest sentences; keep structure, headings, and length.\n"
        "RULES: Add contractions where natural. Break the single longest sentence in two.\n"
        "OUTPUT: Return only the rewritten text, same markdown structure."
    ),
    "medium": (
        "ROLE: Senior tech writer rewriting a robotic draft in your own voice.\n"
        "GOAL: Keep every fact and the section structure; change the music.\n"
        "RULES:\n"
        "1. Burstiness: mix short punchy sentences with longer explanatory ones.\n"
        "2. Add exactly one concrete example or anecdote that fits the topic.\n"
        "3. Contractions throughout; active voice; one rhetorical question at most.\n"
        "BANNED WORDS: delve, leverage, comprehensive, foster, furthermore, "
        "moreover, tapestry, seamless, robust, holistic, cutting-edge.\n"
        "OUTPUT: Return only the rewritten text, same markdown structure."
    ),
    "aggressive": (
        "ROLE: Ghostwriter with a vivid human voice and zero patience for boilerplate.\n"
        "GOAL: Rebuild the section from scratch; facts stay identical, nothing else is sacred.\n"
        "RULES:\n"
        "1. Hard rhythm shifts: fragments welcome, then a long explanatory run.\n"
        "2. Open with an anecdote or a concrete number, never with background throat-clearing.\n"
        "3. Contractions everywhere; direct address ('you') where it fits.\n"
        "BANNED WORDS: delve, leverage, comprehensive, foster, furthermore, "
        "moreover, tapestry, seamless, robust, holistic, cutting-edge.\n"
        "OUTPUT: Return only the rewritten text, same markdown structure."
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
    max_iterations: int = 3, extra_allowed: tuple = (),
    db=None, user_id: str | None = None, is_admin: bool = False,
) -> dict:
    model = resolve_model("humanize", model_override, extra_allowed=extra_allowed, text=text)
    model_used = model  # nim_client may switch models on retry; track the actual one
    transport = None
    if db is not None and user_id:
        transport = _keys.require_transport(
            db, user_id=user_id, model_id=model, is_admin=is_admin)
    system_prompt = HUMANIZE_SYSTEM[strength] + humanize_suffix(model)
    old_score = score_text(text)
    best_text, best_score = text, old_score["human_percent"]
    history = [{"iteration": 0, "human_percent": best_score}]
    iterations = 0
    for i in range(1, max_iterations + 1):
        try:
            model_used, candidate = await nim_client.chat_complete(
                model,
                [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": best_text},
                ],
                role="humanize",
                transport=transport,
            )
        except (nim_client.ModelNotEntitled, _keys.UserKeyRequired):
            raise  # key problems must surface, never hide behind the mock rewrite
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
