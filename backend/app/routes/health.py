import os

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


def _apify_reachable() -> bool:
    token = os.environ.get("APIFY_API_TOKEN", "")
    if not token:
        return False
    try:
        from apify_client import ApifyClient

        client = ApifyClient(token)
        actor = client.actor("thirdwatch/acres99-scraper").get()
        return actor is not None
    except Exception:
        return False


@router.get("/status")
def status() -> dict:
    """Connectivity snapshot for the Settings page. Booleans only, no secrets."""
    return {
        "backend": "ok",
        "version": "0.1.0",
        "providers": {
            "groq": bool(os.environ.get("GROQ_API_KEY", "")),
            "gemini": bool(os.environ.get("GEMINI_API_KEY", "")),
            "apify": bool(os.environ.get("APIFY_API_TOKEN", "")),
        },
        "apify_reachable": _apify_reachable(),
    }
