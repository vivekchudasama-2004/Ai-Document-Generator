"""NIM OpenAI-compatible client: 30s timeout, 3x exp-backoff on 429/5xx,
tiktoken pre-check (413 if over budget), 405b→70b→8b generate fallback,
NIM_MOCK template path for offline demo."""
import asyncio
import logging
import re

import httpx

from app.core.config import get_settings
from app.services.llm.models import GENERATE_FALLBACK_CHAIN, NIM_BASE_URL, budget_for, live_model_ids

log = logging.getLogger("nim")
BASE_URL = NIM_BASE_URL


def count_tokens(text: str) -> int:
    try:
        import tiktoken

        return len(tiktoken.get_encoding("cl100k_base").encode(text))
    except Exception:
        return len(text) // 4


class BudgetExceeded(ValueError):
    """Prompt exceeds the model's token budget."""

    def __init__(self, message: str, model: str):
        super().__init__(message)
        self.model = model


class ModelUnavailable(RuntimeError):
    """NIM failed after retries / no key and no mock. Maps to 502."""


class ModelRefused(Exception):
    """Provider answered 404/410: unknown, retired, or not entitled. No retry."""

    def __init__(self, message: str, status: int):
        super().__init__(message)
        self.status = status


class ModelNotEntitled(RuntimeError):
    """Every candidate refused: key can't invoke anything. Maps to 502 + action."""


async def _post(model: str, messages: list[dict], max_tokens: int,
                transport: dict | None = None) -> str:
    """POST one chat completion. `transport` routes BYOK calls to the user's
    provider ({base_url, api_key, model}); otherwise the server NVIDIA key."""
    settings = get_settings()
    if transport is None and not settings.NVIDIA_NIM_API_KEY and not settings.NIM_MOCK:
        raise ModelUnavailable("NVIDIA_NIM_API_KEY missing (or set NIM_MOCK=true)")
    base_url = transport["base_url"] if transport else BASE_URL
    api_key = transport["api_key"] if transport else settings.NVIDIA_NIM_API_KEY
    downstream = transport["model"] if transport else model
    last_exc: Exception | None = None
    async with httpx.AsyncClient(timeout=30.0) as client:
        for attempt in range(3):
            try:
                resp = await client.post(
                    f"{base_url}/chat/completions",
                    headers={"Authorization": f"Bearer {api_key}"},
                    json={
                        "model": downstream,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": max_tokens,
                    },
                )
                if resp.status_code in (429, 500, 502, 503):
                    last_exc = RuntimeError(f"LLM {resp.status_code}")
                    await asyncio.sleep(2**attempt)
                    continue
                if resp.status_code in (404, 410):
                    # Unknown / retired / not entitled — retrying is pointless.
                    raise ModelRefused(f"LLM refused {model}: {resp.status_code}", resp.status_code)
                resp.raise_for_status()
                return resp.json()["choices"][0]["message"]["content"]
            except (httpx.TimeoutException, httpx.ConnectError) as exc:
                last_exc = exc
                await asyncio.sleep(2**attempt)
    raise ModelUnavailable(f"LLM failed after retries: {last_exc}")


MOCK_DOC = """## Executive Summary
This {title} outlines a practical plan for {idea}. It balances scope, cost, and delivery risk for a small team.

## Goals
The primary goal is a working release within three weeks. Secondary goals cover quality gates and documentation.

## Architecture
```mermaid
graph TD
  A[Client] --> B[API]
  B --> C[(Database)]
  B --> D[AI Provider]
```
The client talks to a typed API behind auth. The database owns all state. The AI provider is interchangeable.

## Risks
Key risks are scope creep and third-party downtime. Mitigations are feature flags and cached fallbacks.
"""


async def chat_complete(
    model: str, messages: list[dict], *, role: str = "generate",
    transport: dict | None = None, max_tokens: int | None = None,
) -> tuple[str, str]:
    """Returns (model_used, text). Applies token budget + generate fallback chain.

    BYOK (`transport` set): one routed attempt at the user's provider — no
    NIM fallback chain, no live-list preflight. Explicit user keys bypass
    NIM_MOCK so a saved key always means a real call.
    """
    settings = get_settings()
    budget = max_tokens or budget_for(model)
    prompt_tokens = sum(count_tokens(m.get("content", "")) for m in messages)
    if prompt_tokens > budget * 4:
        raise BudgetExceeded(
            f"Prompt ~{prompt_tokens} tokens exceeds budget for {model}", model=model
        )

    if transport is not None:
        try:
            text = await _post(model, messages, budget, transport)
        except ModelRefused as exc:
            raise ModelNotEntitled(f"Provider refused {model}: {exc}") from exc
        return model, text

    if settings.NIM_MOCK or not settings.NVIDIA_NIM_API_KEY:
        last = messages[-1].get("content", "Document") if messages else "Document"
        # Prefer the real brief title over the assembled prompt (which now
        # carries system rails + delimiters — never leak those into the demo).
        brief = re.search(r"Title:\s*(.+)", last)
        title = (brief.group(1).strip()[:60] if brief else last[:60]) or "Document"
        return model, MOCK_DOC.format(title=title, idea="the stated idea")

    if role == "generate":
        chain = [model] + [m for m in GENERATE_FALLBACK_CHAIN if m != model]
    else:
        chain = [model]
    # Pre-flight: skip models your key can't call (verified live, cached 10 min).
    # Unknown state (mock/offline) never blocks — the call itself decides.
    reachable = live_model_ids()
    if reachable is not None:
        filtered = [candidate for candidate in chain if candidate in reachable]
        chain = filtered or chain
    last_err: Exception | None = None
    refused = 0
    tried = 0
    for candidate in chain:
        tried += 1
        try:
            text = await _post(candidate, messages, budget)
            if candidate != model:
                log.warning("model.fallback from=%s to=%s", model, candidate)
            return candidate, text
        except ModelRefused as exc:
            refused += 1
            last_err = exc
        except Exception as exc:  # noqa: BLE001 — chain continues
            last_err = exc
    if tried and refused == tried:
        raise ModelNotEntitled(f"No model answered — key lacks access or ids retired: {last_err}")
    raise ModelUnavailable(f"All generate models failed: {last_err}")
