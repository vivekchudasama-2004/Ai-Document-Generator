"""Mermaid: rendered client-side (mermaid.js). Server only sanitizes the
SVG string before storage — strips <script> and on* handlers (XSS)."""
import re

_SCRIPT_RE = re.compile(r"<script.*?</script\s*>", re.IGNORECASE | re.DOTALL)
_ONATTR_RE = re.compile(r"\s+on\w+\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+)", re.IGNORECASE)


def sanitize_svg(svg: str) -> str:
    clean = _SCRIPT_RE.sub("", svg)
    clean = _ONATTR_RE.sub("", clean)
    if "<svg" not in clean.lower():
        raise ValueError("Not an SVG document")
    return clean
