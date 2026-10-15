import json

from fastapi.testclient import TestClient

import app.routes.transcripts as transcript_routes
import app.services.ai_client as ai_client
from app.main import app
from app.store import memory

client = TestClient(app)

ANALYSIS_JSON = {
    "summary": "Buyer wants a Whitefield 3BHK and a weekend visit.",
    "intent": "buy",
    "priority": "hot",
    "priority_reason": "Wants a visit this weekend.",
    "requirements": ["3BHK", "Whitefield"],
    "objections": [],
    "next_action": "Confirm a site visit slot for Saturday morning.",
    "suggested_response": "Thanks! Saturday 11 AM works. Shall I confirm?",
    "suggested_lead": {
        "name": "Priya Nair",
        "location": "Whitefield, Bengaluru",
        "property_requirement": "3BHK apartment",
        "budget": 12000000,
        "buying_timeline": "within 2 months",
        "customer_message": "Loved the 3BHK, want to visit this weekend.",
    },
    "suggestions": [
        {"id": "create-lead", "label": "Create lead", "description": "Save as pipeline lead.", "kind": "create_lead"},
        {"id": "schedule-visit", "label": "Schedule a visit", "description": "Book Saturday.", "kind": "schedule_visit"},
        {"id": "send-followup", "label": "Send follow-up", "description": "Message the customer.", "kind": "send_followup"},
    ],
}

LEAD_ANALYSIS_JSON = {
    "summary": "Buyer with approved loan wants a Whitefield 3BHK.",
    "intent": "buy",
    "requirements": ["3BHK"],
    "objections": [],
    "next_action": "Confirm visit.",
    "suggested_response": "See you Saturday!",
    "priority": "hot",
    "priority_reason": "Urgent visit.",
    "influencer": {"present": False, "who": "", "evidence_phrase": "", "suggested_action": ""},
}


class _FakeResp:
    def __init__(self, content: str):
        self.choices = [type("C", (), {"message": type("M", (), {"content": content})()})()]


def _fake_groq(content: str):
    class _Completions:
        def create(self, **kwargs):
            return _FakeResp(content)

    class _Groq:
        def __init__(self, *a, **k):
            self.chat = type("Ch", (), {"completions": _Completions()})()

    return _Groq


def _upload_with(monkeypatch, analysis: dict, filename="call.mp3"):
    monkeypatch.setattr(
        transcript_routes,
        "transcribe_audio",
        lambda fn, data: "hello, I want the Whitefield 3BHK this weekend",
    )
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq(json.dumps(analysis)))
    return client.post("/transcripts/upload", files={"file": (filename, b"fake-audio", "audio/mpeg")})


def _upload(monkeypatch, filename="call.mp3"):
    return _upload_with(monkeypatch, ANALYSIS_JSON, filename)


def test_upload_rejects_unsupported_type():
    resp = client.post("/transcripts/upload", files={"file": ("notes.txt", b"hi", "text/plain")})
    assert resp.status_code == 400


def test_upload_transcribes_and_suggests_actions(monkeypatch):
    resp = _upload(monkeypatch)
    assert resp.status_code == 201
    body = resp.json()
    assert "weekend" in body["transcript"].lower() or "Whitefield" in body["transcript"]
    assert body["analysis"]["priority"] == "hot"
    kinds = [s["kind"] for s in body["analysis"]["suggestions"]]
    assert "create_lead" in kinds


def test_choose_create_lead_action_creates_lead(monkeypatch):
    tid = _upload(monkeypatch).json()["id"]
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq(json.dumps(LEAD_ANALYSIS_JSON)))
    resp = client.post(f"/transcripts/{tid}/actions", json={"action_id": "create-lead"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["chosen_action"] == "create-lead"
    assert body["lead_id"]
    assert body["lead_id"] in memory.leads


def test_choose_unknown_action_422(monkeypatch):
    tid = _upload(monkeypatch).json()["id"]
    assert client.post(f"/transcripts/{tid}/actions", json={"action_id": "nope"}).status_code == 422


def _cold_analysis(budget) -> dict:
    data = json.loads(json.dumps(ANALYSIS_JSON))
    data["priority"] = "cold"
    data["priority_reason"] = "Just browsing, tight budget."
    data["suggested_lead"] = {
        "name": "",
        "location": "",
        "property_requirement": "",
        "budget": budget,
        "buying_timeline": "",
        "customer_message": "",
    }
    return data


def test_cold_transcript_with_string_budget_stores_proper_lead(monkeypatch):
    tid = _upload_with(monkeypatch, _cold_analysis("80L")).json()["id"]
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq(json.dumps(LEAD_ANALYSIS_JSON)))
    resp = client.post(f"/transcripts/{tid}/actions", json={"action_id": "create-lead"})
    assert resp.status_code == 200
    lead_id = resp.json()["lead_id"]
    stored = memory.leads[lead_id]
    assert stored.budget == 8_000_000
    assert stored.origin == "call"
    assert stored.created_at
    assert stored.analysis is not None
    # Same shape as a manually created lead: fetchable via the leads API.
    assert client.get(f"/leads/{lead_id}").status_code == 200


def test_cold_transcript_with_garbage_budget_falls_back_and_stores(monkeypatch):
    tid = _upload_with(monkeypatch, _cold_analysis("tight budget, maybe later")).json()["id"]
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq(json.dumps(LEAD_ANALYSIS_JSON)))
    resp = client.post(f"/transcripts/{tid}/actions", json={"action_id": "create-lead"})
    assert resp.status_code == 200
    stored = memory.leads[resp.json()["lead_id"]]
    assert stored.budget == 1_000_000
    assert stored.name == "Call Lead"
