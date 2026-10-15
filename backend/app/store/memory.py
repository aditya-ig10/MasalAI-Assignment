from app.models.schemas import ChatMessage, Lead, Transcript

leads: dict[str, Lead] = {}
histories: dict[str, list[ChatMessage]] = {}
transcripts: dict[str, Transcript] = {}

PRIORITY_ORDER = {"hot": 0, "warm": 1, "cold": 2}


def _rank(lead: Lead) -> tuple[int, str]:
    if lead.analysis is None:
        return (3, lead.created_at)
    return (PRIORITY_ORDER.get(lead.analysis.priority, 3), lead.created_at)


def sorted_leads() -> list[Lead]:
    return sorted(leads.values(), key=_rank)


def clear() -> None:
    leads.clear()
    histories.clear()
    transcripts.clear()
