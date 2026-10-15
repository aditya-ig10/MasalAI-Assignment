import pytest
from fastapi.testclient import TestClient

import app.services.ai_client as ai_client
from app.main import app
from app.store import memory

client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_ai_calls(monkeypatch):
    def _boom(*args, **kwargs):
        raise Exception("no network in tests")

    monkeypatch.setattr(ai_client.groq, "Groq", _boom)
    monkeypatch.setattr(ai_client.genai, "Client", _boom)


VALID = {
    "name": "Priya Nair",
    "location": "Whitefield, Bengaluru",
    "property_requirement": "3BHK apartment near ITPL",
    "budget": 12000000,
    "buying_timeline": "within 2 months",
    "customer_message": "My loan is approved and I want to visit this weekend.",
}


class _FakeResp:
    def __init__(self, content: str):
        self.choices = [type("C", (), {"message": type("M", (), {"content": content})()})()]


def _fake_groq(content: str, seen: dict):
    class _Completions:
        def create(self, **kwargs):
            seen.update(kwargs)
            return _FakeResp(content)

    class _Groq:
        def __init__(self, *args, **kwargs):
            self.chat = type("Ch", (), {"completions": _Completions()})()

    return _Groq


def _make_lead():
    return client.post("/leads", json=VALID).json()["id"]


def test_chat_grounds_on_full_record(monkeypatch):
    seen: dict = {}
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq("Yes, still available.", seen))
    lead_id = _make_lead()
    resp = client.post(f"/leads/{lead_id}/chat", json={"message": "Is this still available?"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["reply"] == "Yes, still available."
    assert body["history"] == [
        {"role": "user", "content": "Is this still available?"},
        {"role": "assistant", "content": "Yes, still available."},
    ]
    system = seen["messages"][0]
    assert system["role"] == "system"
    assert "LEAD RECORD" in system["content"]
    assert lead_id in system["content"]
    assert "12000000" in system["content"]


def test_chat_unknown_lead_404():
    assert client.post("/leads/nope/chat", json={"message": "hi"}).status_code == 404


def test_chat_blank_message_422(monkeypatch):
    lead_id = _make_lead()
    assert client.post(f"/leads/{lead_id}/chat", json={"message": "  "}).status_code == 422


def test_chat_outage_502_and_history_unchanged(monkeypatch):
    lead_id = _make_lead()
    resp = client.post(f"/leads/{lead_id}/chat", json={"message": "hello?"})
    assert resp.status_code == 502
    assert memory.histories.get(lead_id, []) == []


def test_chat_history_capped(monkeypatch):
    monkeypatch.setattr(ai_client.groq, "Groq", _fake_groq("ok", {}))
    lead_id = _make_lead()
    for i in range(25):
        client.post(f"/leads/{lead_id}/chat", json={"message": f"q{i}"})
    assert len(memory.histories[lead_id]) <= 20
