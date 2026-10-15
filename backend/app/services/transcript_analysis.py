from app.models.schemas import TranscriptAnalysis
from app.services.ai_client import AIFailure, generate_json

TRANSCRIPT_SYSTEM_PROMPT = (
    "You are a real-estate sales-call analyst. Read the sales call transcript and reply with JSON only, "
    "no markdown, using exactly these keys: "
    "summary (string, 1-2 sentences on what the customer wants), "
    "intent (one of buy, sell, rent, invest, just_browsing, unclear), "
    "priority (one of hot, warm, cold), priority_reason (string), "
    "requirements (array of strings), objections (array of strings), "
    "next_action (string, single best next step for the agent), "
    "suggested_response (string, a short follow-up message the agent can send), "
    "suggested_lead (object with name, location, property_requirement, budget as number or 0 if unknown, "
    "buying_timeline, customer_message — use empty strings when unknown, never null), "
    "suggestions (array of 3-4 objects, each with id as kebab-case slug, label, description, "
    "kind one of create_lead, schedule_visit, send_followup, mark_cold, needs_review). "
    "Always include one suggestion with kind create_lead labelled 'Create lead'. "
    "Pick other suggestions to fit the call: hot calls get schedule_visit, warm get send_followup, "
    "cold/uninterested get mark_cold."
)


def analyze_transcript(transcript: str, filename: str = "") -> TranscriptAnalysis:
    user = f"CALL FILE: {filename}\nTRANSCRIPT:\n{transcript}"
    data = generate_json(TRANSCRIPT_SYSTEM_PROMPT, user)
    try:
        return TranscriptAnalysis.model_validate(data)
    except Exception as exc:
        raise AIFailure(f"model returned invalid transcript analysis JSON: {exc}")


def fallback_analysis(transcript: str, filename: str = "") -> TranscriptAnalysis:
    """Deterministic offline analysis used when AI providers fail or in mocks."""
    lower = transcript.lower()
    if any(w in lower for w in ("visit", "loan approved", "book", "this weekend", "urgent")):
        priority = "hot"
        next_action = "Confirm a site visit slot at the earliest."
    elif any(w in lower for w in ("browsing", "just looking", "not interested", "tight budget")):
        priority = "cold"
        next_action = "Send one matching option and park the lead for two weeks."
    else:
        priority = "warm"
        next_action = "Share two matching listings and ask for a visit window."
    intent = "buy"
    if "rent" in lower or "lease" in lower:
        intent = "rent"
    elif "sell" in lower:
        intent = "sell"
    elif "invest" in lower:
        intent = "invest"
    elif "browsing" in lower or "just looking" in lower:
        intent = "just_browsing"
    return TranscriptAnalysis(
        summary=f"Sales call ({filename or 'audio upload'}) captured {len(transcript.split())} words of conversation.",
        intent=intent,  # type: ignore[arg-type]
        priority=priority,  # type: ignore[arg-type]
        priority_reason=f"Heuristic triage of call language; AI analysis unavailable.",
        requirements=[],
        objections=[],
        next_action=next_action,
        suggested_response="Thanks for speaking today! I will send over the matching options shortly.",
        suggested_lead={
            "name": "",
            "location": "",
            "property_requirement": "",
            "budget": 0,
            "buying_timeline": "",
            "customer_message": transcript[:2000],
        },
        suggestions=[
            {
                "id": "create-lead",
                "label": "Create lead",
                "description": "Save the extracted details as a new pipeline lead.",
                "kind": "create_lead",
            },
            {
                "id": "schedule-visit",
                "label": "Schedule a visit",
                "description": next_action,
                "kind": "schedule_visit",
            },
            {
                "id": "send-followup",
                "label": "Send follow-up",
                "description": "Copy the suggested response and message the customer.",
                "kind": "send_followup",
            },
        ],
    )
