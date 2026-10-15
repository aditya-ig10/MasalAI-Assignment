from fastapi import APIRouter, HTTPException

from app.models.schemas import ChatMessage, ChatOut, LeadsChatIn
from app.services.ai_client import AIFailure
from app.services.chat import HISTORY_LIMIT, ask_about_leads

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("", response_model=ChatOut)
def leads_chat(payload: LeadsChatIn) -> ChatOut:
    # Hard cap: the chat context is the 20 most recent leads, never more.
    leads = payload.leads[:20]
    try:
        reply = ask_about_leads(leads, payload.history, payload.message)
    except AIFailure as exc:
        raise HTTPException(status_code=502, detail=f"chat failed: {exc}")
    history = [
        *payload.history[-HISTORY_LIMIT:],
        ChatMessage(role="user", content=payload.message),
        ChatMessage(role="assistant", content=reply),
    ]
    return ChatOut(reply=reply, history=history[-HISTORY_LIMIT:])
