from fastapi.testclient import TestClient

import app.routes.health as health_module
from app.main import app

client = TestClient(app)


def test_health_ok():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_status_reports_provider_flags_without_secrets(monkeypatch):
    monkeypatch.setattr(health_module.os.environ, "get", lambda k, d="": "x" if k == "GROQ_API_KEY" else d)
    monkeypatch.setattr(health_module, "_apify_reachable", lambda: True)
    resp = client.get("/status")
    assert resp.status_code == 200
    body = resp.json()
    assert body["backend"] == "ok"
    assert body["providers"]["groq"] is True
    assert body["providers"]["gemini"] is False
    assert body["apify_reachable"] is True
    assert "gsk_" not in resp.text
