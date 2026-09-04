"""Detector eval — golden pairs (human vs robotic). Offline-safe: runs the
local scorer only, never the Sapling API. Exit 1 on any failure.

Usage:  python scripts/eval.py   (from apps/api; no DB, no keys needed)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from app.services.detector import count_words, detector_ready, score_text

HUMAN = (
    "We started DocuForge because writing design docs ate our Fridays. You know the feeling: "
    "it's 4pm, the doc's half done, and every paragraph sounds like a robot wrote it. "
    "I must've rewritten the intro six times before it sounded like me. So we built the loop "
    "we wanted — draft it fast, score each section honestly, and rewrite the weak ones 'til they read human."
)

ROBOTIC = (
    "In conclusion, it is important to leverage comprehensive solutions to foster robust outcomes. "
    "Furthermore, this document will delve into the various aspects of the system. Moreover, "
    "the implementation is facilitated by utilizing state-of-the-art methodologies. "
    "In conclusion, stakeholders should leverage these insights. Furthermore, the framework "
    "encompasses a comprehensive paradigm. Moreover, best practices are fostered throughout."
)


def check(name: str, cond: bool, detail: str = "") -> bool:
    print(f"{'PASS' if cond else 'FAIL'}  {name}" + (f" — {detail}" if detail else ""))
    return cond


def main() -> int:
    ready = detector_ready()
    print(f"analyzer: {ready['analyzer']}  mode: {ready['mode']}")

    human = score_text(HUMAN)
    robotic = score_text(ROBOTIC)
    print(f"human sample:   {human['human_percent']}% ({human['label']}) [{human['details']['source']}]")
    print(f"robotic sample: {robotic['human_percent']}% ({robotic['label']})")
    print(f"reasons (robotic): {robotic['reasons']}")

    ok = True
    ok &= check("human scores above robotic", human["human_percent"] > robotic["human_percent"],
                f"{human['human_percent']} vs {robotic['human_percent']}")
    ok &= check("robotic labels ai/mixed", robotic["label"] in ("ai", "mixed"), robotic["label"])
    ok &= check("robotic has cliche reasons", any("cliche" in r for r in robotic["reasons"]))
    ok &= check("word counter sane", count_words("one two three") == 3)
    ok &= check("150wpp engine import", __import__("app.services.exporter", fromlist=["paginate"]) is not None)

    print("eval " + ("passed" if ok else "FAILED"))
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())
