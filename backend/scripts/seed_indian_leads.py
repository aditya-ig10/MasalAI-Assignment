"""Seed the backend with Indian-named leads analyzed through the real AI path.

Usage: set -a; source .env; set +a; .venv/bin/python scripts/seed_indian_leads.py
"""

import json
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.models.schemas import Lead, LeadIn
from app.services.ai_client import AIFailure
from app.services.analysis import analyze_lead

LEADS: list[dict] = [
    {
        "name": "Priya Nair",
        "location": "Whitefield, Bengaluru",
        "property_requirement": "3BHK apartment near ITPL",
        "budget": 14500000,
        "buying_timeline": "within 2 months",
        "customer_message": "Hi, I loved the 3BHK listing in Whitefield. My loan is approved and I want to visit this weekend with my husband. Is the price negotiable?",
    },
    {
        "name": "Rahul Shah",
        "location": "HSR Layout, Bengaluru",
        "property_requirement": "2BHK for investment",
        "budget": 11000000,
        "buying_timeline": "in 30 days",
        "customer_message": "Looking to buy a 2BHK in HSR purely as an investment. Cash ready, can close in 30 days. Send me rental yield numbers.",
    },
    {
        "name": "Asha Verma",
        "location": "Powai, Mumbai",
        "property_requirement": "3BHK with lake view",
        "budget": 38000000,
        "buying_timeline": "within 6 months",
        "customer_message": "The Powai flat looks nice but it is slightly over my budget. Do you have anything similar nearby for less?",
    },
    {
        "name": "Vikram Mehta",
        "location": "Andheri West, Mumbai",
        "property_requirement": "2BHK near station",
        "budget": 24000000,
        "buying_timeline": "flexible",
        "customer_message": "Need a 2BHK in Andheri, good connectivity to the metro. Timeline is flexible.",
    },
    {
        "name": "Neha Kulkarni",
        "location": "Baner, Pune",
        "property_requirement": "2BHK with balcony",
        "budget": 9500000,
        "buying_timeline": "within 2 months",
        "customer_message": "We need a 2BHK in Baner within two months. Worried about water supply in new projects on the highway side.",
    },
    {
        "name": "Ananya Iyer",
        "location": "OMR, Chennai",
        "property_requirement": "2BHK near IT corridor",
        "budget": 8500000,
        "buying_timeline": "in 3 months",
        "customer_message": "Just shortlisting 2BHK options on OMR for now. Might decide next quarter, budget is tight.",
    },
    {
        "name": "Rohan Desai",
        "location": "Hinjewadi, Pune",
        "property_requirement": "1BHK near IT park",
        "budget": 5500000,
        "buying_timeline": "soon",
        "customer_message": "Saw your Hinjewadi listing. Prices seem high compared to last year. I will wait for a correction.",
    },
    {
        "name": "Kavya Reddy",
        "location": "Gachibowli, Hyderabad",
        "property_requirement": "3BHK in gated society",
        "budget": 16000000,
        "buying_timeline": "within 3 months",
        "customer_message": "Why is this Gachibowli flat priced 15 percent above nearby listings? Can you justify it with recent sales?",
    },
    {
        "name": "Arjun Malhotra",
        "location": "Dwarka, Delhi",
        "property_requirement": "3BHK park facing",
        "budget": 21000000,
        "buying_timeline": "within 2 months",
        "customer_message": "I like the Dwarka property but my home loan pre-approval is stuck. What are my options to still block the unit?",
    },
    {
        "name": "Divya Nambiar",
        "location": "Kochi, Kerala",
        "property_requirement": "3BHK near metro",
        "budget": 12500000,
        "buying_timeline": "in 4 months",
        "customer_message": "The title looks unclear on this resale flat. Has the society NOC and all approvals been obtained?",
    },
    {
        "name": "Sanjay Patil",
        "location": "Thane West, Mumbai",
        "property_requirement": "1BHK for first home",
        "budget": 6800000,
        "buying_timeline": "flexible",
        "customer_message": "Do you handle pre-leased commercial spaces in Thane? Looking for steady rental yield options.",
    },
    {
        "name": "Meera Joshi",
        "location": "Kothrud, Pune",
        "property_requirement": "2BHK for parents",
        "budget": 9000000,
        "buying_timeline": "soon",
        "customer_message": "Hi, interested in a ground floor unit for my parents. Call me in the evening.",
    },
]


def main() -> None:
    out = Path(__file__).resolve().parents[1] / "seed_data.json"
    leads = []
    for i, fields in enumerate(LEADS):
        payload = LeadIn(**fields)
        try:
            analysis = analyze_lead(payload)
            error = None
        except AIFailure as exc:
            analysis = None
            error = str(exc)
        leads.append(
            Lead(
                **payload.model_dump(),
                id=f"seed{i + 1:02d}",
                created_at=f"2026-10-{15 + (i % 3):02d}T{9 + (i % 8):02d}:00:00+00:00",
                analysis=analysis,
                analysis_error=error,
            )
        )
    out.write_text(json.dumps([l.model_dump() for l in leads], indent=2, ensure_ascii=False))
    hot = sum(1 for l in leads if l.analysis and l.analysis.priority == "hot")
    print(f"wrote {len(leads)} leads ({hot} hot) to {out}")
    missing = [l.name for l in leads if l.analysis is None]
    if missing:
        print("WARNING, no analysis for:", missing)


if __name__ == "__main__":
    main()
