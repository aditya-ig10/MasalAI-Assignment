from app.models.schemas import Analysis, LeadIn
from app.services.ai_client import AIFailure, generate_json

ANALYSIS_SYSTEM_PROMPT = (
    "You are a real-estate lead qualifier. Read the lead and reply with JSON only, "
    "no markdown, using exactly these keys: summary (string), intent (one of buy, sell, rent, invest, just_browsing, unclear), "
    "requirements (array of strings), objections (array of strings), next_action (string), "
    "suggested_response (string, a short reply the agent can send the customer), "
    "priority (one of hot, warm, cold), priority_reason (string), "
    "influencer (object with present boolean, who string, evidence_phrase string, suggested_action string). "
    "Set influencer.present true only when the message shows another person affecting the decision, "
    "and quote the exact phrase in evidence_phrase."
)


def analyze_lead(payload: LeadIn) -> Analysis:
    data = generate_json(ANALYSIS_SYSTEM_PROMPT, payload.model_dump_json())
    try:
        return Analysis.model_validate(data)
    except Exception as exc:
        raise AIFailure(f"model returned invalid analysis JSON: {exc}")
