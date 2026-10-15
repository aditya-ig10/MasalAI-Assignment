from fastapi.testclient import TestClient

import app.routes.chat as chat_route
from app.main import app
from app.services.ai_client import AIFailure

client = TestClient(app)


def _lead(i: int) -> dict:
    return {
        "id": f"lead-{i}",
        "created_at": "2026-10-15T09:00:00Z",
        "name": f"Buyer {i}",
        "location": "Whitefield, Bengaluru",
        "property_requirement": "3BHK apartment",
        "budget": 12000000,
        "buying_timeline": "within 2 months",
        "customer_message": "Wants a weekend visit.",
        "analysis": None,
        "analysis_error": None,
    }


def test_leads_chat_answers_from_supplied_leads(monkeypatch):
    seen: dict = {}

    def _fake(leads, history, message):
        seen["count"] = len(leads)
        return f"You have {len(leads)} leads in context."

    monkeypatch.setattr(chat_route, "ask_about_leads", _fake)
    resp = client.post(
        "/chat",
        json={"message": "How many leads?", "leads": [_lead(1), _lead(2)]},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert seen["count"] == 2
    assert body["reply"] == "You have 2 leads in context."
    assert body["history"] == [
        {"role": "user", "content": "How many leads?"},
        {"role": "assistant", "content": "You have 2 leads in context."},
    ]


def test_leads_chat_caps_context_at_20(monkeypatch):
    monkeypatch.setattr(chat_route, "ask_about_leads", lambda leads, history, message: "ok")
    resp = client.post("/chat", json={"message": "Summarize.", "leads": [_lead(i) for i in range(25)]})
    assert resp.status_code == 422  # schema rejects more than 20 leads


def test_leads_chat_blank_message_422():
    assert client.post("/chat", json={"message": "   ", "leads": []}).status_code == 422


def test_leads_chat_outage_502(monkeypatch):
    def _boom(leads, history, message):
        raise AIFailure("all providers down")

    monkeypatch.setattr(chat_route, "ask_about_leads", _boom)
    resp = client.post("/chat", json={"message": "hi", "leads": []})
    assert resp.status_code == 502
