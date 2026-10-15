from app.models.schemas import ChatMessage, Lead
from app.services.ai_client import generate_text

HISTORY_LIMIT = 20


def build_system_prompt(lead: Lead) -> str:
    return (
        "You are a helpful real-estate assistant answering about one specific lead. "
        "Use only the lead record below as ground truth about this customer. "
        "If a question cannot be answered from it, say so honestly.\n"
        f"LEAD RECORD: {lead.model_dump_json()}"
    )


def send_chat(lead: Lead, history: list[ChatMessage], message: str) -> str:
    past = [{"role": m.role, "content": m.content} for m in history]
    past.append({"role": "user", "content": message})
    return generate_text(build_system_prompt(lead), past)


def build_leads_system_prompt(leads: list[Lead]) -> str:
    if leads:
        records = "\n".join(f"- {lead.model_dump_json()}" for lead in leads)
    else:
        records = "(no lead records supplied)"
    return (
        "You are LeadAnalyzer, a real-estate assistant for a property agent. "
        "You answer ONLY questions about the agent's sales leads and pipeline below "
        "(status, priority, budgets, objections, next actions, who to call, summaries). "
        "Use ONLY these lead records as ground truth. Answer concisely, name the relevant leads, "
        "and say so honestly when the records don't contain the answer. Never invent leads. "
        "For anything else — coding, homework, general knowledge, or unrelated topics — "
        "politely refuse in one sentence and steer back to the pipeline.\n"
        f"LEAD RECORDS ({len(leads)}):\n{records}"
    )


def ask_about_leads(leads: list[Lead], history: list[ChatMessage], message: str) -> str:
    past = [{"role": m.role, "content": m.content} for m in history[-HISTORY_LIMIT:]]
    past.append({"role": "user", "content": message})
    return generate_text(build_leads_system_prompt(leads), past)
