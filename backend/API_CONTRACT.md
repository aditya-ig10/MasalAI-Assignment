# MasalAI Backend API Contract

Version: 0.1.0 (2026-10-15)
Status: stub, endpoints land behind this contract
Owner: JACK (backend). Consumer: CLOE (frontend).

Base URL comes from `BACKEND_URL` in `.shared.env`. All bodies are JSON.
Breaking change to any shipped shape is announced in `memory/BLOCKERS.md` tagging CLOE before merge.

## Conventions

- `id` is an opaque string (UUID hex), assigned server side.
- `created_at` is ISO 8601 UTC, assigned server side.
- Error envelope is always `{"detail": "<message>"}`.
- AI keys (`GROQ_API_KEY`, `GEMINI_API_KEY`) stay server side and never appear in any payload.

## Schemas

### LeadIn (request body for lead creation)

| Field | Type | Required | Rule |
|---|---|---|---|
| name | string | yes | non-blank after trim |
| location | string | yes | non-blank after trim |
| property_requirement | string | yes | non-blank after trim |
| budget | number | yes | above zero, in listing currency, no conversion server side |
| buying_timeline | string | yes | non-blank after trim, free text, e.g. "within 2 months", "ASAP", "flexible" |
| customer_message | string | yes | non-blank after trim, the raw message from the customer |

### Influencer (Hidden Decision-Maker Flag)

| Field | Type | Rule |
|---|---|---|
| present | boolean | true only when the message shows another person affecting the decision |
| who | string | who that person is, e.g. "wife", "father", empty when present is false |
| evidence_phrase | string | exact quote from the customer message, empty when present is false |
| suggested_action | string | what the agent should do about it, empty when present is false |

### Analysis (produced by one AI call per lead)

| Field | Type | Rule |
|---|---|---|
| summary | string | one or two sentence recap of the lead |
| intent | string | one of `buy`, `sell`, `rent`, `invest`, `just_browsing`, `unclear` |
| requirements | string[] | concrete needs extracted from the message |
| objections | string[] | concerns or blockers extracted from the message |
| next_action | string | single recommended next step for the agent |
| suggested_response | string | short reply the agent can send the customer |
| priority | string | one of `hot`, `warm`, `cold` |
| priority_reason | string | why this priority was assigned |
| influencer | Influencer | Hidden Decision-Maker Flag, same AI call, zero extra cost |

### Lead

`LeadIn` plus `id`, `created_at`, `analysis` (`Analysis` or `null`), `analysis_error` (string or `null`).

### LeadList

`{"leads": [Lead, ...]}` sorted by priority: `hot` first, then `warm`, then `cold`, then leads with `analysis: null` last. Ties break by `created_at` ascending.

### Chat

- Request: `{"message": "<non-blank text>"}`
- Response: `{"reply": "<assistant text>", "history": [{"role": "user"|"assistant", "content": "..."}]}`.
- Every call sends the full lead record plus analysis as system context, plus recent history. History stored server side per lead, capped at the last 20 entries.

## Endpoints

### GET /health

Liveness probe, also used as the deploy health check.

Response 200:

```json
{"status": "ok"}
```

### POST /leads

Create a lead and run AI analysis on it.

Request 201 body: `LeadIn`.

Example:

```json
{
  "name": "Priya Nair",
  "location": "Whitefield, Bengaluru",
  "property_requirement": "3BHK apartment near ITPL",
  "budget": 12000000,
  "buying_timeline": "within 2 months",
  "customer_message": "Hi, I loved the 3BHK listing in Whitefield. My loan is approved and I want to visit this weekend. Is the price negotiable?"
}
```

Response 201: `Lead` with `analysis` filled on success.

Example:

```json
{
  "id": "a3f19c2e7b4a4d9c8e6f0a1b2c3d4e5f",
  "created_at": "2026-10-15T23:50:00.123456+00:00",
  "name": "Priya Nair",
  "location": "Whitefield, Bengaluru",
  "property_requirement": "3BHK apartment near ITPL",
  "budget": 12000000,
  "buying_timeline": "within 2 months",
  "customer_message": "Hi, I loved the 3BHK listing in Whitefield. My loan is approved and I want to visit this weekend. Is the price negotiable?",
  "analysis": {
    "summary": "Buyer with approved loan wants a Whitefield 3BHK and a weekend visit.",
    "intent": "buy",
    "requirements": ["3BHK", "Whitefield", "weekend site visit"],
    "objections": ["price negotiability"],
    "next_action": "Confirm a site visit slot for Saturday morning.",
    "suggested_response": "Thanks! Saturday 11 AM works for the visit. Shall I confirm?",
    "priority": "hot",
    "priority_reason": "Loan approved and wants to visit this weekend.",
    "influencer": {"present": false, "who": "", "evidence_phrase": "", "suggested_action": ""}
  },
  "analysis_error": null
}
```

If both AI providers fail, the lead is still created: response is 201 with `analysis: null` and `analysis_error` holding a non-empty message. CLOE treats this as pending analysis, not as a failed create.

Statuses: 201 created, 422 validation failed (missing field, blank string, budget not above zero).

### GET /leads

List all leads in priority sort order.

Response 200: `LeadList`.

Example:

```json
{
  "leads": [
    {"id": "hot-lead-id", "name": "Priya Nair", "analysis": {"priority": "hot"}},
    {"id": "warm-lead-id", "name": "Rahul Shah", "analysis": {"priority": "warm"}},
    {"id": "cold-lead-id", "name": "Asha Verma", "analysis": {"priority": "cold"}},
    {"id": "pending-lead-id", "name": "Demo Buyer 4", "analysis": null}
  ]
}
```

(Shapes trimmed for brevity. Real items are full `Lead` objects.)

### GET /leads/{id}

Fetch one lead with its analysis.

Response 200: `Lead`.
Response 404: `{"detail": "lead not found"}`.

### POST /leads/{id}/chat

Grounded chat about one lead.

Request:

```json
{"message": "Is this still available?"}
```

Response 200:

```json
{
  "reply": "Yes. The Whitefield 3BHK you asked about is still listed, and your visit is set for Saturday 11 AM.",
  "history": [
    {"role": "user", "content": "Is this still available?"},
    {"role": "assistant", "content": "Yes. The Whitefield 3BHK you asked about is still listed, and your visit is set for Saturday 11 AM."}
  ]
}
```

Statuses: 200 ok, 404 unknown lead id (`{"detail": "lead not found"}`), 422 blank message, 502 both AI providers failed (stored history left unchanged).

## Seed data

On startup the backend loads `backend/seed_data.json` when present: a list of full `Lead` objects whose analyses were generated once through the real AI path. Property fields (location, requirement, budget) come from an Apify listings actor. Customer messages are hand-written demo texts covering hot, cold, objection, investor, and ambiguous cases. Full split is disclosed in `backend/README.md`.

## Changelog

- 0.1.0 (2026-10-15): initial contract. All 5 required features (lead intake, AI analysis, grounded chat, lead list, priority sort) plus the influencer field.
