"""Analyzer: spaCy en_core_web_sm + textstat on Vercel, pure-python fallback.
Score = weighted heuristic -> human_percent 0-100 with explainable reasons.
DEMO_MODE labels estimates; heuristic-only output is never persisted as real.
"""
import re
from functools import lru_cache

from app.core.config import get_settings

CLICHES = [
    "delve", "leverage", "comprehensive", "foster", "furthermore",
    "moreover", "in conclusion", "tapestry", "landscape", "realm",
    "pivotal", "crucial", "additionally", "ultimately", "seamless",
    "robust", "holistic", "cutting-edge",
]

CONTRACTION_RE = re.compile(
    r"\b(can't|won't|don't|doesn't|didn't|isn't|aren't|wasn't|weren't|"
    r"haven't|hasn't|hadn't|wouldn't|couldn't|shouldn't|it's|that's|"
    r"there's|we're|you're|they're|i'm|n't)\b",
    re.IGNORECASE,
)


@lru_cache(maxsize=1)
def _nlp():
    try:
        import spacy

        return spacy.load("en_core_web_sm", disable=["ner"])
    except Exception:
        return None


def _sentences(text: str) -> list[str]:
    nlp = _nlp()
    if nlp is not None:
        try:
            return [s.text.strip() for s in nlp(text).sents if s.text.strip()]
        except Exception:
            pass
    return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text.strip()) if s.strip()]


def _words(text: str) -> list[str]:
    return re.findall(r"[A-Za-z']+", text.lower())


def count_words(text: str) -> int:
    nlp = _nlp()
    if nlp is not None:
        try:
            return sum(1 for t in nlp(text) if not t.is_space and not t.is_punct)
        except Exception:
            pass
    return len(_words(text))


def _passive_ratio(text: str) -> float:
    nlp = _nlp()
    if nlp is not None:
        try:
            doc = nlp(text)
            verbs = [t for t in doc if t.pos_ == "VERB"]
            if not verbs:
                return 0.0
            passive = sum(1 for t in doc if t.dep_ == "nsubjpass")
            return min(1.0, passive / max(1, len(verbs)))
        except Exception:
            pass
    hits = len(re.findall(r"\b(was|were|is|are|been|being)\s+\w+ed\b", text, re.IGNORECASE))
    return min(1.0, hits / max(1, len(_words(text)) / 20))


def _flesch(text: str) -> float | None:
    try:
        import textstat

        return float(textstat.flesch_reading_ease(text))
    except Exception:
        return None


def _sapling_score(text: str) -> float | None:
    """Sapling free-tier AI detector (ai_prob 0..1). Only runs when
    SAPLING_API_KEY is set; None means heuristic-only (honest)."""
    api_key = get_settings().SAPLING_API_KEY
    if not api_key:
        return None
    try:
        import json
        import urllib.request

        request = urllib.request.Request(
            "https://api.sapling.ai/api/v1/aidetect",
            data=json.dumps({"key": api_key, "text": text[:2000]}).encode(),
            headers={"Content-Type": "application/json"},
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            return float(json.load(response).get("score", 0))
    except Exception:
        return None


def blend_with_sapling(human_percent: float, sapling_ai_prob: float) -> float:
    """Even blend of heuristic and Sapling verdicts."""
    return round((human_percent + 100 * (1 - sapling_ai_prob)) / 2, 1)


def score_text(text: str) -> dict:
    """Human-likeness score with reasons. Higher burstiness/contractions/
    Flesch and lower passive/cliche load push the score up."""
    words = _words(text)
    sents = _sentences(text)
    n_words = max(1, len(words))
    sent_lens = [max(1, len(_words(s))) for s in sents] or [1]
    mean_len = sum(sent_lens) / len(sent_lens)
    burstiness = (sum((l - mean_len) ** 2 for l in sent_lens) / len(sent_lens)) ** 0.5
    passive = _passive_ratio(text)
    cliche_hits = sum(text.lower().count(c) for c in CLICHES)
    cliche_density = cliche_hits / (n_words / 100)
    contractions = len(CONTRACTION_RE.findall(text)) / (n_words / 100)
    ttr = len(set(words)) / n_words
    flesch = _flesch(text)

    score = 55.0
    score += min(18.0, burstiness * 2.2)
    score += min(10.0, contractions * 4.0)
    score += min(8.0, max(0.0, (ttr - 0.4)) * 40.0)
    if flesch is not None:
        score += max(-8.0, min(8.0, (flesch - 50) / 6))
    score -= min(20.0, passive * 40.0)
    score -= min(25.0, cliche_density * 12.0)
    human = round(max(1.0, min(99.0, score)), 1)

    reasons: list[str] = []
    if burstiness < 4:
        reasons.append(f"flat sentence rhythm (burstiness {burstiness:.1f})")
    if passive > 0.15:
        reasons.append(f"heavy passive voice ({passive:.0%})")
    if cliche_hits:
        reasons.append(f"{cliche_hits} AI-cliche hit(s)")
    if contractions < 0.5:
        reasons.append("few contractions — reads stiff")
    if flesch is not None and flesch < 40:
        reasons.append(f"dense prose (Flesch {flesch:.0f})")
    if not reasons:
        reasons.append("varied rhythm, active voice, natural diction")

    label = "human" if human >= 90 else ("mixed" if human >= 70 else "ai")
    source = "spacy+textstat" if _nlp() else "pure-python"
    sapling_ai_prob = _sapling_score(text)
    if sapling_ai_prob is not None:
        human = blend_with_sapling(human, sapling_ai_prob)
        reasons.append(f"sapling detector reads {sapling_ai_prob:.0%} AI")
        source = "heuristic+sapling"
        label = "human" if human >= 90 else ("mixed" if human >= 70 else "ai")
    result = {
        "ai_prob": round(1 - human / 100, 3),
        "human_percent": human,
        "label": label,
        "confidence": round(min(0.95, 0.55 + len(words) / 800), 2),
        "details": {
            "burstiness": round(burstiness, 2),
            "passive_ratio": round(passive, 3),
            "cliche_hits": cliche_hits,
            "contractions_per_100": round(contractions, 2),
            "ttr": round(ttr, 3),
            "flesch": round(flesch, 1) if flesch is not None else None,
            "source": source,
            "sapling_ai_prob": sapling_ai_prob,
        },
        "reasons": reasons[:3],
    }
    if get_settings().DEMO_MODE:
        result["demo_estimate"] = True
    return result


def detector_ready() -> dict:
    return {
        "ready": True,
        "analyzer": "en_core_web_sm+textstat" if _nlp() else "pure-python-fallback",
        "mode": get_settings().DETECTOR_MODE,
        "sapling_reachable": bool(get_settings().SAPLING_API_KEY),
    }
