import json

from fastapi.testclient import TestClient

import app.services.ai_client as ai_client
from app.main import app

client = TestClient(app)

VALID = {
    "name": "Priya Nair",
    "location": "Whitefield, Bengaluru",
    "property_requirement": "3BHK apartment near ITPL",
    "budget": 12000000,
    "buying_timeline": "within 2 months",
    "customer_message": "My loan is approved and I want to visit this weekend.",
}

ANALYSIS_JSON = {
    "summary": "Buyer with approved loan wants a Whitefield 3BHK and a weekend visit.",
    "intent": "buy",
    "requirements": ["3BHK", "Whitefield", "weekend site visit"],
    "objections": ["price negotiability"],
    "next_action": "Confirm a site visit slot for Saturday morning.",
    "suggested_response": "Thanks! Saturday 11 AM works for the visit. Shall I confirm?",
    "priority": "hot",
    "priority_reason": "Loan approved and wants to visit this weekend.",
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
        def __init__(self, *args, **kwargs):
            self.chat = type("Ch", (), {"completions": _Completions()})()

    return _Groq


def _failing_groq():
    class _Groq:
        def __init__(self, *args, **kwargs):
            raise Exception("429 rate limited")

    return _Groq


def _fake_gemini(content: str):
    class _Models:
        def generate_content(self, **kwargs):
            return type("R", (), {"text": content})()

    class _Client:
        def __init__(self, *args, **kwargs):
            self.models = _Models()

    return _Client


def test_post_lead_runs_groq_analysis(monkeypatch):
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq(json.dumps(ANALYSIS_JSON)))
    resp = client.post("/leads", json=VALID)
    assert resp.status_code == 201
    body = resp.json()
    assert body["analysis"]["priority"] == "hot"
    assert body["analysis"]["influencer"]["present"] is False
    assert body["analysis_error"] is None


def test_post_lead_falls_back_to_gemini(monkeypatch):
    monkeypatch.setattr(ai_client.groq, "Groq", _failing_groq())
    monkeypatch.setattr(ai_client.genai, "Client", _fake_gemini(json.dumps(ANALYSIS_JSON)))
    resp = client.post("/leads", json=VALID)
    assert resp.status_code == 201
    assert resp.json()["analysis"]["priority"] == "hot"


def test_post_lead_garbage_json_still_201_with_error(monkeypatch):
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq("not json at all"))
    monkeypatch.setattr(ai_client.genai, "Client", _fake_gemini("still not json"))
    resp = client.post("/leads", json=VALID)
    assert resp.status_code == 201
    body = resp.json()
    assert body["analysis"] is None
    assert body["analysis_error"]
