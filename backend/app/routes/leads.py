import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status

from app.models.schemas import ChatIn, ChatMessage, ChatOut, Lead, LeadIn, LeadList
from app.services.chat import HISTORY_LIMIT, send_chat
from app.services.ai_client import AIFailure
from app.services.analysis import analyze_lead
from app.services import firestore_sync
from app.store import memory

router = APIRouter(prefix="/leads", tags=["leads"])


def _matches(lead: Lead, query: str) -> bool:
    q = query.strip().lower()
    if not q:
        return True
    intent = lead.analysis.intent if lead.analysis else ""
    priority = lead.analysis.priority if lead.analysis else ""
    hay = " ".join(
        [
            lead.name,
            lead.location,
            lead.property_requirement,
            lead.buying_timeline,
            lead.customer_message,
            intent,
            priority,
        ]
    ).lower()
    return all(token in hay for token in q.split())


def _budget_bucket(budget: float) -> str:
    if budget < 5_000_000:
        return "< ₹50L"
    if budget < 10_000_000:
        return "₹50L–₹1Cr"
    if budget < 50_000_000:
        return "₹1Cr–₹5Cr"
    return "₹5Cr+"


@router.post("", status_code=status.HTTP_201_CREATED, response_model=Lead)
def create_lead(payload: LeadIn) -> Lead:
    lead = Lead(
        **payload.model_dump(),
        id=uuid.uuid4().hex,
        created_at=datetime.now(timezone.utc).isoformat(),
        analysis=None,
        analysis_error=None,
    )
    try:
        lead.analysis = analyze_lead(payload)
    except AIFailure as exc:
        lead.analysis_error = str(exc)
    memory.leads[lead.id] = lead
    firestore_sync.save(lead.model_dump())
    return lead


@router.get("/stats")
def lead_stats() -> dict:
    leads = list(memory.leads.values())
    by_priority: dict[str, int] = {"hot": 0, "warm": 0, "cold": 0}
    by_intent: dict[str, int] = {}
    buckets: dict[str, int] = {"< ₹50L": 0, "₹50L–₹1Cr": 0, "₹1Cr–₹5Cr": 0, "₹5Cr+": 0}
    pending = 0
    flagged = 0
    pipeline = 0.0
    hot_value = 0.0
    for lead in leads:
        pipeline += lead.budget or 0
        buckets[_budget_bucket(lead.budget or 0)] += 1
        if lead.analysis is None:
            pending += 1
            by_intent["unanalyzed"] = by_intent.get("unanalyzed", 0) + 1
            continue
        by_priority[lead.analysis.priority] = by_priority.get(lead.analysis.priority, 0) + 1
        by_intent[lead.analysis.intent] = by_intent.get(lead.analysis.intent, 0) + 1
        if lead.analysis.influencer.present:
            flagged += 1
        if lead.analysis.priority == "hot":
            hot_value += lead.budget or 0
    return {
        "total": len(leads),
        "pending": pending,
        "flagged": flagged,
        "pipeline_value": pipeline,
        "hot_value": hot_value,
        "by_priority": by_priority,
        "by_intent": by_intent,
        "budget_buckets": [{"bucket": k, "count": v} for k, v in buckets.items()],
    }


@router.get("", response_model=LeadList)
def list_leads(q: str = "") -> LeadList:
    leads = memory.sorted_leads()
    if q.strip():
        leads = [l for l in leads if _matches(l, q)]
    return LeadList(leads=leads)


@router.get("/{lead_id}", response_model=Lead)
def get_lead(lead_id: str) -> Lead:
    lead = memory.leads.get(lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="lead not found")
    return lead


@router.put("/{lead_id}", response_model=Lead)
def update_lead(lead_id: str, payload: LeadIn) -> Lead:
    existing = memory.leads.get(lead_id)
    if existing is None:
        raise HTTPException(status_code=404, detail="lead not found")
    lead = Lead(
        **payload.model_dump(),
        id=lead_id,
        created_at=existing.created_at,
        analysis=None,
        analysis_error=None,
    )
    try:
        lead.analysis = analyze_lead(payload)
    except AIFailure as exc:
        lead.analysis_error = str(exc)
    memory.leads[lead_id] = lead
    firestore_sync.save(lead.model_dump())
    return lead


@router.delete("/{lead_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_lead(lead_id: str) -> None:
    if memory.leads.pop(lead_id, None) is None:
        raise HTTPException(status_code=404, detail="lead not found")
    memory.histories.pop(lead_id, None)
    firestore_sync.delete(lead_id)


@router.post("/{lead_id}/chat", response_model=ChatOut)
def chat(lead_id: str, payload: ChatIn) -> ChatOut:
    lead = memory.leads.get(lead_id)
    if lead is None:
        raise HTTPException(status_code=404, detail="lead not found")
    history = memory.histories.setdefault(lead_id, [])
    try:
        reply = send_chat(lead, history, payload.message)
    except AIFailure as exc:
        raise HTTPException(status_code=502, detail=f"chat failed: {exc}")
    history.append(ChatMessage(role="user", content=payload.message))
    history.append(ChatMessage(role="assistant", content=reply))
    del history[:-HISTORY_LIMIT]
    return ChatOut(reply=reply, history=list(history))


@router.get("/{lead_id}/chat", response_model=ChatOut)
def get_chat_history(lead_id: str) -> ChatOut:
    """Follow-up memory: full conversation so far for this lead."""
    if memory.leads.get(lead_id) is None:
        raise HTTPException(status_code=404, detail="lead not found")
    history = memory.histories.get(lead_id, [])
    return ChatOut(reply="", history=list(history))
