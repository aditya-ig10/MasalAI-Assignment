import argparse
import json
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from apify_client import ApifyClient

from app.models.schemas import Lead, LeadIn
from app.services.analysis import analyze_lead

ACTORS = [
    os.environ.get("APIFY_ACTOR", "maxcopell/zillow-scraper"),
    "delicious_zebu/zillow-property-data-scraper",
]


def _run_input(actor_id: str, limit: int) -> dict:
    if "delicious_zebu" in actor_id:
        return {"forSaleLocations": ["Austin, TX"], "maxItems": limit}
    return {"location": "Austin, TX", "maxItems": limit}

MESSAGES = [
    "Hi, I loved the 3BHK listing in Whitefield. My loan is approved and I want to visit this weekend. Is the price negotiable?",
    "Looking to buy two 2BHK units near Hitech City for rental income. Cash ready, can close in 30 days. Send me ROI numbers.",
    "The Koramangala apartment looks nice but it is slightly over my budget. Do you have anything similar nearby for less?",
    "Need a flat in Pune, 2 or 3 BHK, good schools nearby. Timeline is flexible.",
    "Just browsing options in Noida for now. Might buy next year, not sure.",
    "Saw your listing. Prices seem high compared to last year. I will wait.",
    "Why is this Baner flat priced 15 percent above nearby listings? Can you justify it?",
    "I like the property but my home loan pre-approval is stuck. What are my options?",
    "The title looks unclear on this resale flat in Thane. Has the society NOC been obtained?",
    "Do you handle pre-leased commercial spaces in Gurgaon? Looking for 7 percent plus yield.",
    "Hi, interested. Call me.",
    "My wife likes the design but my father thinks the location is too far from the metro. We need to discuss.",
]


def _to_number(value) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace("$", "").replace(",", "").strip()
        try:
            return float(cleaned)
        except ValueError:
            return None
    return None


def _row_to_fields(item: dict) -> dict | None:
    price = _to_number(item.get("price_value", item.get("price", item.get("listPrice", item.get("rentPrice")))))
    location = item.get("address") or item.get("location")
    if not location and (item.get("city") or item.get("state")):
        location = ", ".join(p for p in [item.get("city"), item.get("state")] if p)
    if not location or price is None:
        return None
    beds = item.get("bedrooms") or item.get("beds")
    prop = item.get("home_type") or item.get("propertyType") or item.get("homeType") or "residential unit"
    requirement = f"{beds} bed {prop}" if beds else str(prop)
    return {"location": str(location), "property_requirement": requirement, "budget": price}


def _pull_rows(limit: int) -> list[dict]:
    token = os.environ.get("APIFY_API_TOKEN", "")
    if not token:
        raise SystemExit("APIFY_API_TOKEN is not set. Source it from .env and retry.")
    client = ApifyClient(token)
    last_error = "no actors tried"
    for actor_id in ACTORS:
        try:
            run = client.actor(actor_id).call(run_input=_run_input(actor_id, limit))
            items = list(client.dataset(run.default_dataset_id).iterate_items())
            rows = [r for r in (_row_to_fields(i) for i in items) if r]
            if len(rows) >= 6:
                print(f"actor {actor_id} gave {len(rows)} usable rows")
                return rows[:limit]
            last_error = f"actor {actor_id} gave only {len(rows)} usable rows"
        except Exception as exc:
            last_error = f"actor {actor_id} failed: {exc}"
    raise SystemExit(
        f"Apify pull failed ({last_error}). Log BLOCKERS.md and hand-write fallback rows, "
        "marking source as manual in the README."
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--out", default="backend/seed_data.json")
    args = parser.parse_args()

    rows = _pull_rows(args.limit)
    leads = []
    for row, message in zip(rows, MESSAGES):
        payload = LeadIn(
            name=f"Demo Buyer {len(leads) + 1}",
            location=row["location"],
            property_requirement=row["property_requirement"],
            budget=row["budget"],
            buying_timeline="flexible",
            customer_message=message,
        )
        try:
            analysis = analyze_lead(payload)
            error = None
        except Exception as exc:
            analysis = None
            error = str(exc)
        leads.append(
            Lead(
                **payload.model_dump(),
                id=uuid.uuid4().hex,
                created_at=datetime.now(timezone.utc).isoformat(),
                analysis=analysis,
                analysis_error=error,
            )
        )
    Path(args.out).write_text(json.dumps([l.model_dump() for l in leads], indent=2))
    print(f"wrote {len(leads)} leads to {args.out}")


if __name__ == "__main__":
    main()
