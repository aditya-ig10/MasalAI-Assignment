"""Firestore persistence for leads via the REST API (no service key needed).

The project's Firestore rules are open for development, so the backend can
read/write the ``leads`` collection with plain HTTPS. Every call is
best-effort with short timeouts — the in-memory store is always primary,
Firestore is the durable mirror.
"""

from __future__ import annotations

import os

import httpx

_TIMEOUT = 8.0


def _disabled() -> bool:
    return bool(os.environ.get("MASALAI_NO_FIRESTORE"))


def _base() -> str | None:
    pid = os.environ.get("NEXT_PUBLIC_FIREBASE_PROJECT_ID", "")
    if not pid:
        return None
    return f"https://firestore.googleapis.com/v1/projects/{pid}/databases/(default)/documents/leads"


def _to_value(value):
    if value is None:
        return {"nullValue": None}
    if isinstance(value, bool):
        return {"booleanValue": value}
    if isinstance(value, (int, float)):
        return {"doubleValue": float(value)}
    if isinstance(value, str):
        return {"stringValue": value}
    if isinstance(value, list):
        return {"arrayValue": {"values": [_to_value(v) for v in value]}}
    if isinstance(value, dict):
        return {"mapValue": {"fields": {k: _to_value(v) for k, v in value.items()}}}
    return {"stringValue": str(value)}


def _from_value(value):
    if not isinstance(value, dict):
        return value
    if "stringValue" in value:
        return value["stringValue"]
    if "doubleValue" in value:
        return value["doubleValue"]
    if "integerValue" in value:
        return float(value["integerValue"])
    if "booleanValue" in value:
        return value["booleanValue"]
    if "nullValue" in value:
        return None
    if "arrayValue" in value:
        return [_from_value(v) for v in value["arrayValue"].get("values", [])]
    if "mapValue" in value:
        return {k: _from_value(v) for k, v in value["mapValue"].get("fields", {}).items()}
    return None


def _doc_to_lead(doc: dict) -> dict | None:
    try:
        fields = doc.get("fields", {})
        lead = {k: _from_value(v) for k, v in fields.items()}
        if not lead.get("id"):
            name = doc.get("name", "")
            lead["id"] = name.split("/")[-1] if name else ""
        return lead if lead.get("id") else None
    except Exception:
        return None


def fetch_all() -> list[dict]:
    base = _base()
    if not base or _disabled():
        return []
    rows: list[dict] = []
    url: str | None = f"{base}?pageSize=300"
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            while url:
                resp = client.get(url)
                resp.raise_for_status()
                body = resp.json()
                for doc in body.get("documents", []):
                    lead = _doc_to_lead(doc)
                    if lead:
                        rows.append(lead)
                token = body.get("nextPageToken")
                url = f"{base}?pageSize=300&pageToken={token}" if token else None
    except Exception:
        return []
    return rows


def save(lead: dict) -> None:
    base = _base()
    if not base or not lead.get("id") or _disabled():
        return
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            client.patch(
                f"{base}/{lead['id']}",
                json={"fields": {k: _to_value(v) for k, v in lead.items()}},
            )
    except Exception:
        pass


def delete(lead_id: str) -> None:
    base = _base()
    if not base or not lead_id or _disabled():
        return
    try:
        with httpx.Client(timeout=_TIMEOUT) as client:
            client.delete(f"{base}/{lead_id}")
    except Exception:
        pass
