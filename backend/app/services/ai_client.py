import json
import os

import groq
from google import genai
from google.genai import types

GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-20b")
GEMINI_MODEL = os.environ.get("GEMINI_MODEL", "gemini-3.8-flash")


class AIFailure(Exception):
    pass


def _groq_json(system: str, user: str) -> dict:
    client = groq.Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.2,
        max_tokens=800,
        response_format={"type": "json_object"},
    )
    return json.loads(resp.choices[0].message.content or "")


def _gemini_json(system: str, user: str) -> dict:
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))
    resp = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[system, user],
        config=types.GenerateContentConfig(response_mime_type="application/json"),
    )
    return json.loads(resp.text or "")


def generate_json(system: str, user: str) -> dict:
    errors = []
    try:
        return _groq_json(system, user)
    except Exception as exc:
        errors.append(f"groq: {exc}")
    try:
        return _gemini_json(system, user)
    except Exception as exc:
        errors.append(f"gemini: {exc}")
    raise AIFailure("; ".join(errors))


def _groq_text(system: str, messages: list[dict]) -> str:
    client = groq.Groq(api_key=os.environ.get("GROQ_API_KEY", ""))
    resp = client.chat.completions.create(
        model=GROQ_MODEL,
        messages=[{"role": "system", "content": system}, *messages],
        temperature=0.3,
        max_tokens=400,
    )
    return resp.choices[0].message.content or ""


def _gemini_text(system: str, messages: list[dict]) -> str:
    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY", ""))
    parts = [system] + [m["content"] for m in messages]
    resp = client.models.generate_content(model=GEMINI_MODEL, contents=parts)
    return resp.text or ""


def generate_text(system: str, messages: list[dict]) -> str:
    errors = []
    try:
        return _groq_text(system, messages)
    except Exception as exc:
        errors.append(f"groq: {exc}")
    try:
        return _gemini_text(system, messages)
    except Exception as exc:
        errors.append(f"gemini: {exc}")
    raise AIFailure("; ".join(errors))
