import pytest
from fastapi.testclient import TestClient

import app.services.ai_client as ai_client
from app.main import app
from app.models.schemas import Analysis, Influencer
from app.store import memory

client = TestClient(app)


@pytest.fixture(autouse=True)
def _no_ai_calls(monkeypatch):
    def _boom(*args, **kwargs):
        raise Exception("no network in tests")

    monkeypatch.setattr(ai_client.groq, "Groq", _boom)
    monkeypatch.setattr(ai_client.genai, "Client", _boom)


VALID = {
    "name": "A",
    "location": "L",
    "property_requirement": "P",
    "budget": 100,
    "buying_timeline": "T",
    "customer_message": "M",
}


def _analysis(priority):
    return Analysis(
        summary="s",
        intent="buy",
        requirements=[],
        objections=[],
        next_action="n",
        suggested_response="r",
        priority=priority,
        priority_reason="because",
        influencer=Influencer(),
    )


def test_list_sorted_hot_warm_cold_unanalyzed():
    ids = {}
    for tag in ["cold", "none", "hot", "warm"]:
        resp = client.post("/leads", json=dict(VALID, name=tag))
        ids[tag] = resp.json()["id"]
    memory.leads[ids["hot"]].analysis = _analysis("hot")
    memory.leads[ids["warm"]].analysis = _analysis("warm")
    memory.leads[ids["cold"]].analysis = _analysis("cold")
    resp = client.get("/leads")
    assert resp.status_code == 200
    got = [l["name"] for l in resp.json()["leads"]]
    assert got == ["hot", "warm", "cold", "none"]


def test_get_single_lead_and_404():
    created = client.post("/leads", json=VALID).json()
    assert client.get(f"/leads/{created['id']}").status_code == 200
    resp = client.get("/leads/does-not-exist")
    assert resp.status_code == 404
    assert resp.json() == {"detail": "lead not found"}


def test_update_lead_rewrites_fields_and_reanalyzes():
    created = client.post("/leads", json=VALID).json()
    resp = client.put(f"/leads/{created['id']}", json=dict(VALID, name="Renamed", budget=500))
    assert resp.status_code == 200
    body = resp.json()
    assert body["name"] == "Renamed"
    assert body["budget"] == 500
    assert body["id"] == created["id"]


def test_update_unknown_lead_404():
    assert client.put("/leads/does-not-exist", json=VALID).status_code == 404


def test_delete_lead_removes_it():
    created = client.post("/leads", json=VALID).json()
    assert client.delete(f"/leads/{created['id']}").status_code == 204
    assert client.get(f"/leads/{created['id']}").status_code == 404


def test_delete_unknown_lead_404():
    assert client.delete("/leads/does-not-exist").status_code == 404
