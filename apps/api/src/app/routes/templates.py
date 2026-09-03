"""Template catalog: 12 types (MVP 3 fully outlined, rest data-only)."""
from fastapi import APIRouter, Depends, HTTPException

from app.core.security import get_current_user
from app.services.generator import OUTLINES

router = APIRouter(tags=["templates"])

TEMPLATES: list[dict] = [
    {"type": "prd", "title": "PRD — Product Requirements",
     "description": "Users, stories, requirements, milestones.", "mvp": True},
    {"type": "brd", "title": "BRD — Business Requirements",
     "description": "Objectives, stakeholders, ROI.", "mvp": False},
    {"type": "rdd", "title": "RDD — Requirements & Design",
     "description": "Requirements plus architecture and stack.", "mvp": True},
    {"type": "technical_design", "title": "Technical Design Doc",
     "description": "Components, interfaces, rollout.", "mvp": True},
    {"type": "system_design", "title": "System Design Doc",
     "description": "HLD/LLD, scaling, trade-offs.", "mvp": False},
    {"type": "architecture", "title": "Architecture Doc",
     "description": "Principles, topology, ADRs.", "mvp": False},
    {"type": "development_plan", "title": "Development Plan",
     "description": "WBS, sprints, resources.", "mvp": False},
    {"type": "runbook", "title": "Runbook",
     "description": "Procedures, commands, rollback.", "mvp": False},
    {"type": "sop", "title": "SOP",
     "description": "Responsibilities, checklists.", "mvp": False},
    {"type": "incident_report", "title": "Incident Report",
     "description": "Timeline, impact, root cause.", "mvp": False},
    {"type": "postmortem", "title": "Postmortem",
     "description": "5 Whys, actions, prevention.", "mvp": False},
    {"type": "pm_roadmap", "title": "PM Roadmap",
     "description": "Themes, releases, metrics.", "mvp": False},
]


@router.get("/templates")
def list_templates(_=Depends(get_current_user)):
    return {"items": [
        {**t, "sections": OUTLINES.get(t["type"], OUTLINES["rdd"])} for t in TEMPLATES
    ]}


@router.get("/templates/{doc_type}")
def template_detail(doc_type: str, _=Depends(get_current_user)):
    for t in TEMPLATES:
        if t["type"] == doc_type:
            sections = OUTLINES.get(doc_type, OUTLINES["rdd"])
            return {**t, "sections": [{"title": s} for s in sections]}
    raise HTTPException(status_code=404, detail="Unknown template")
