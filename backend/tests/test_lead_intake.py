from fastapi.testclient import TestClient

from app.main import app
from app.store import memory

client = TestClient(app)

VALID = {
    "name": "Priya Nair",
    "location": "Whitefield, Bengaluru",
    "property_requirement": "3BHK apartment near ITPL",
    "budget": 12000000,
    "buying_timeline": "within 2 months",
    "customer_message": "My loan is approved and I want to visit this weekend.",
}


def test_create_lead_returns_201_with_shape():
    resp = client.post("/leads", json=VALID)
    assert resp.status_code == 201
    body = resp.json()
    assert body["id"]
    assert body["created_at"]
    assert body["name"] == "Priya Nair"
    assert body["analysis"] is None
    assert body["id"] in memory.leads


def test_create_lead_missing_field_422():
    bad = dict(VALID)
    del bad["budget"]
    assert client.post("/leads", json=bad).status_code == 422


def test_create_lead_blank_name_422():
    bad = dict(VALID, name="   ")
    assert client.post("/leads", json=bad).status_code == 422


def test_create_lead_negative_budget_422():
    bad = dict(VALID, budget=-5)
    assert client.post("/leads", json=bad).status_code == 422


def test_create_lead_string_budget_422():
    bad = dict(VALID, budget="50L")
    assert client.post("/leads", json=bad).status_code == 422
