# LeadAnalyzer Backend

Python FastAPI backend.

## Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Env

Copy values from `.shared.env` into the environment: `GROQ_API_KEY`, `GEMINI_API_KEY`, `APIFY_API_TOKEN`, `BACKEND_URL`, `FRONTEND_URL`. Keys stay server side, never commit values.

## Run

From `backend/`:

```bash
uvicorn app.main:app --reload
```

## Test

From `backend/`:

```bash
python -m pytest
```

## Seed data

Leads live in Firestore (`leads` collection, loaded on startup — no JSON
files). The 12 demo leads are Indian buyers (Mumbai, Delhi, Bengaluru,
Hyderabad, Chennai, Pune, Kochi) with hand-written inquiry messages covering
hot, cold, objection, investor, and ambiguous cases. Each analysis was
generated through the real AI path (`scripts/seed_indian_leads.py`). To
re-seed, run that script and copy the rows into Firestore (see script header).

## Contract

Endpoint shapes follow the route schemas in `app/models/schemas.py`, which the
frontend mirrors in `frontend/lib/types.ts`.
