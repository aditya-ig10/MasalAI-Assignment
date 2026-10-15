import pytest
from pydantic import ValidationError

from app.models.schemas import Analysis, Influencer, Lead, LeadIn
from app.store import memory


def test_lead_in_rejects_blank_strings():
    with pytest.raises(ValidationError):
        LeadIn(
            name="   ",
            location="L",
            property_requirement="P",
            budget=100,
            buying_timeline="T",
            customer_message="M",
        )


def test_lead_in_rejects_non_positive_budget():
    for bad in (0, -5):
        with pytest.raises(ValidationError):
            LeadIn(
                name="A",
                location="L",
                property_requirement="P",
                budget=bad,
                buying_timeline="T",
                customer_message="M",
            )


def _make(name, priority, ts):
    analysis = None
    if priority is not None:
        analysis = Analysis(
            summary="s",
            intent="buy",
            requirements=[],
            objections=[],
            next_action="n",
            suggested_response="r",
            priority=priority,
            priority_reason="b",
            influencer=Influencer(),
        )
    return Lead(
        name=name,
        location="L",
        property_requirement="P",
        budget=100,
        buying_timeline="T",
        customer_message="M",
        id=f"id-{name}",
        created_at=ts,
        analysis=analysis,
    )


def test_sorted_leads_order_then_clear():
    memory.leads["id-cold"] = _make("cold", "cold", "2026-10-16T00:00:03+00:00")
    memory.leads["id-none"] = _make("none", None, "2026-10-16T00:00:01+00:00")
    memory.leads["id-hot"] = _make("hot", "hot", "2026-10-16T00:00:02+00:00")
    assert [l.name for l in memory.sorted_leads()] == ["hot", "cold", "none"]
    memory.clear()
    assert memory.leads == {}
    assert memory.histories == {}
