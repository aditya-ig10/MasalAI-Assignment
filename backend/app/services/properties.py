"""Live property search via Apify, with a persistent result store.

Every query runs a real Apify actor (99acres for India, Zillow for the US)
and every usable row is merged into ``data/apify_cache.json``. Repeat queries
are served instantly from the store; the store is only a cache — Apify is the
source of truth.
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
import uuid
from datetime import timedelta
from difflib import get_close_matches
from pathlib import Path

CACHE_PATH = Path(__file__).resolve().parents[2] / "data" / "apify_cache.json"
CACHE_LIMIT = 300
LIVE_BUDGET_SECS = 180

INDIA_ACTOR = os.environ.get("APIFY_INDIA_ACTOR", "thirdwatch/acres99-scraper")
INDIA_FALLBACK_ACTOR = os.environ.get("APIFY_INDIA_FALLBACK_ACTOR", "gio21/magicbricks-scraper")
US_ACTOR = os.environ.get("APIFY_ACTOR", "delicious_zebu/zillow-property-data-scraper")

INDIA_CITIES = {
    "mumbai": "Mumbai",
    "delhi": "Delhi",
    "gurgaon": "Gurgaon",
    "gurugram": "Gurgaon",
    "bangalore": "Bangalore",
    "bengaluru": "Bangalore",
    "hyderabad": "Hyderabad",
    "chennai": "Chennai",
    "pune": "Pune",
    "kolkata": "Kolkata",
    "ahmedabad": "Ahmedabad",
    "noida": "Noida",
    "thane": "Thane",
}

LOCALITY_TO_CITY = {
    "andheri": "Mumbai",
    "powai": "Mumbai",
    "bandra": "Mumbai",
    "sewri": "Mumbai",
    "jp nagar": "Bangalore",
    "whitefield": "Bangalore",
    "hsr": "Bangalore",
    "koramangala": "Bangalore",
    "electronic city": "Bangalore",
    "indiranagar": "Bangalore",
    "gachibowli": "Hyderabad",
    "hitech city": "Hyderabad",
    "hitech": "Hyderabad",
    "omr": "Chennai",
    "velachery": "Chennai",
    "baner": "Pune",
    "hinjewadi": "Pune",
    "dwarka": "Delhi",
    "rohini": "Delhi",
    "salt lake": "Kolkata",
    "austin": "",
}

US_MARKERS = {"austin", "texas", "tx", "houston", "dallas", "seattle", "zillow"}


def _to_number(value) -> float | None:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        cleaned = value.replace("₹", "").replace("Rs.", "").replace("$", "").replace(",", "").strip().lower()
        try:
            if "cr" in cleaned:
                return float(cleaned.replace("crore", "").replace("cr", "").strip()) * 10_000_000
            if "lakh" in cleaned or cleaned.endswith(" l"):
                return float(cleaned.replace("lakh", "").replace("l", "").strip()) * 100_000
            if cleaned.endswith("k"):
                return float(cleaned[:-1]) * 1_000
            return float(cleaned.split()[0])
        except (ValueError, IndexError):
            return None
    return None


TYPO_FIXES = {
    "banglore": "bangalore",
    "bangelore": "bangalore",
    "mumbay": "mumbai",
    "bombay": "mumbai",
    "delhi ": "delhi",
    "new delhi": "delhi",
    "gurugaram": "gurgaon",
    "hydrabad": "hyderabad",
    "chenai": "chennai",
    "madras": "chennai",
    "puna": "pune",
    "poona": "pune",
    "calcutta": "kolkata",
    "ahmedabad ": "ahmedabad",
}

GAZETTEER = [
    ("Mumbai", "city"), ("Delhi", "city"), ("Gurgaon", "city"), ("Bangalore", "city"),
    ("Hyderabad", "city"), ("Chennai", "city"), ("Pune", "city"), ("Kolkata", "city"),
    ("Ahmedabad", "city"), ("Noida", "city"), ("Thane", "city"), ("Navi Mumbai", "city"),
    ("Andheri West", "locality · Mumbai"), ("Powai", "locality · Mumbai"),
    ("Bandra West", "locality · Mumbai"), ("Thane West", "locality · Mumbai"),
    ("Dwarka", "locality · Delhi"), ("Rohini", "locality · Delhi"),
    ("Whitefield", "locality · Bangalore"), ("HSR Layout", "locality · Bangalore"),
    ("Koramangala", "locality · Bangalore"), ("Electronic City", "locality · Bangalore"),
    ("Indiranagar", "locality · Bangalore"), ("JP Nagar", "locality · Bangalore"),
    ("Sarjapur Road", "locality · Bangalore"), ("Gachibowli", "locality · Hyderabad"),
    ("Hitech City", "locality · Hyderabad"), ("OMR", "locality · Chennai"),
    ("Velachery", "locality · Chennai"), ("Baner", "locality · Pune"),
    ("Hinjewadi", "locality · Pune"), ("Salt Lake", "locality · Kolkata"),
    ("Austin, TX", "city · US"),
]


def fix_typos(text: str) -> str:
    lowered = text.strip().lower()
    for wrong, right in TYPO_FIXES.items():
        if wrong in lowered:
            lowered = lowered.replace(wrong, right)
    return lowered


def suggest_locations(query: str, limit: int = 8) -> list[dict]:
    q = fix_typos(query).strip().lower()
    if not q:
        return [{"label": label, "sub": sub} for label, sub in GAZETTEER[:limit]]
    scored: list[tuple[int, str, str]] = []
    for label, sub in GAZETTEER:
        low = label.lower()
        if low.startswith(q):
            scored.append((0, label, sub))
        elif q in low:
            scored.append((1, label, sub))
    for close in get_close_matches(q, [g[0].lower() for g in GAZETTEER], n=2, cutoff=0.72):
        for label, sub in GAZETTEER:
            if label.lower() == close and all(s[1] != label for s in scored):
                scored.append((2, label, sub))
    seen_cached = set()
    for row in _read_cache():
        loc = str(row.get("location", ""))
        if q in loc.lower() and loc not in seen_cached:
            seen_cached.add(loc)
            scored.append((3, loc, "recent"))
    scored.sort(key=lambda s: s[0])
    return [{"label": label, "sub": sub} for _, label, sub in scored[:limit]]
    q = query.strip().lower()
    if not q:
        return True
    hay = f"{prop.get('location', '')} {prop.get('property_requirement', '')}".lower()
    return all(token in hay for token in q.split())


def _matches(prop: dict, query: str) -> bool:
    q = fix_typos(query).strip().lower()
    if not q:
        return True
    hay = f"{prop.get('location', '')} {prop.get('property_requirement', '')}".lower()
    return all(token in hay for token in q.split())


def _read_cache() -> list[dict]:
    try:
        return json.loads(CACHE_PATH.read_text())
    except Exception:
        return []


def _write_cache(rows: list[dict]) -> None:
    try:
        CACHE_PATH.parent.mkdir(parents=True, exist_ok=True)
        CACHE_PATH.write_text(json.dumps(rows[-CACHE_LIMIT:], indent=1))
    except Exception:
        pass


def store_rows(rows: list[dict]) -> list[dict]:
    """Merge fresh Apify rows into the persistent store. Returns stored rows."""
    if not rows:
        return []
    cached = _read_cache()
    seen = {(p.get("location"), p.get("property_requirement"), p.get("budget")) for p in cached}
    fresh = []
    for r in rows:
        key = (r.get("location"), r.get("property_requirement"), r.get("budget"))
        if key not in seen:
            seen.add(key)
            fresh.append(r)
    if fresh:
        _write_cache(cached + fresh)
    return fresh if fresh else rows


def _detect_region(query: str) -> str:
    tokens = fix_typos(query).strip().lower().split()
    if any(t.strip(",") in US_MARKERS for t in tokens):
        return "us"
    return "india"


def _india_params(query: str, limit: int) -> dict:
    text = fix_typos(query).strip().lower()
    city = ""
    for key, name in INDIA_CITIES.items():
        if key in text:
            city = name
            break
    if not city:
        for loc, name in LOCALITY_TO_CITY.items():
            if loc in text and name:
                city = name
                break
    if not city:
        city = "Bangalore"
    stopwords = set(INDIA_CITIES) | {"new", "city"}
    localities = [t for t in query.strip().split() if t.lower().strip(",") not in stopwords]
    params: dict = {"city": city, "searchMode": "buy", "maxResults": limit}
    if localities:
        params["localities"] = [" ".join(localities)]
    return params


def _normalize_india(item: dict) -> dict | None:
    price = _to_number(item.get("price_inr", item.get("priceInr", item.get("price"))))
    locality = item.get("locality") or item.get("address") or ""
    city = item.get("city") or ""
    location = str(locality) if locality else str(city)
    title = str(item.get("title") or "")
    if not location and " in " in title:
        location = title.split(" in ", 1)[1].strip()
    if not location or price is None:
        return None
    bhk = item.get("bhk") or item.get("bedrooms")
    if not bhk and title:
        import re as _re

        m = _re.search(r"(\d+)\s*BHK", title, _re.IGNORECASE)
        if m:
            bhk = m.group(1)
    prop = item.get("property_type") or item.get("propertyType") or item.get("type") or "apartment"
    requirement = f"{bhk} BHK {prop}" if bhk else str(prop)
    images = item.get("images") or item.get("imageUrls") or []
    image = images[0] if images else item.get("imageUrl")
    return {
        "location": location,
        "property_requirement": requirement,
        "budget": price,
        "buying_timeline": "flexible",
        "source": "live",
        "url": item.get("url") or item.get("propertyUrl"),
        "image": image,
    }


def _normalize_us(item: dict) -> dict | None:
    price = _to_number(item.get("price_value", item.get("price", item.get("listPrice", item.get("rentPrice")))))
    location = item.get("address") or item.get("location")
    if not location and (item.get("city") or item.get("state")):
        location = ", ".join(p for p in [item.get("city"), item.get("state")] if p)
    if not location or price is None:
        return None
    beds = item.get("bedrooms") or item.get("beds")
    prop = item.get("home_type") or item.get("propertyType") or item.get("homeType") or "residential unit"
    requirement = f"{beds} bed {prop}" if beds else str(prop)
    images = item.get("images") or item.get("imageUrls") or []
    image = images[0] if images else item.get("imageUrl")
    return {
        "location": str(location),
        "property_requirement": requirement,
        "budget": price,
        "buying_timeline": "flexible",
        "source": "live",
        "url": item.get("url") or item.get("propertyUrl"),
        "image": image,
    }


def _run_actor(actor_id: str, run_input: dict, budget_secs: int = LIVE_BUDGET_SECS) -> list[dict]:
    token = os.environ.get("APIFY_API_TOKEN", "")
    if not token:
        raise RuntimeError("APIFY_API_TOKEN is not set")
    from apify_client import ApifyClient

    client = ApifyClient(token)
    run = client.actor(actor_id).start(run_input=run_input)
    deadline = time.time() + budget_secs
    final = run
    while time.time() < deadline:
        final = client.run(run.id).wait_for_finish(wait_duration=timedelta(seconds=20))
        if final and final.status in ("SUCCEEDED", "FAILED", "TIMED-OUT", "ABORTED"):
            break
    if not final or final.status != "SUCCEEDED":
        raise RuntimeError(f"actor {actor_id} did not succeed (status={final.status if final else 'unknown'})")
    return list(client.dataset(final.default_dataset_id).iterate_items())


def _india_jobs(location: str, limit: int) -> list[tuple[str, dict]]:
    """One (actor, input) job per platform — 99acres + MagicBricks in parallel."""
    params = _india_params(fix_typos(location), limit)
    city_wide = dict(params)
    city_wide.pop("localities", None)
    city_wide["maxResults"] = max(limit * 3, 15)
    return [
        (INDIA_ACTOR, params),
        (INDIA_ACTOR, city_wide),
        (
            INDIA_FALLBACK_ACTOR,
            {"searchTerm": location.strip() or "apartment", "city": params["city"], "maxItems": limit},
        ),
    ]


def _run_one(actor_id: str, run_input: dict, normalizer) -> tuple[list[dict], str]:
    try:
        items = _run_actor(actor_id, run_input, budget_secs=240)
        rows = [r for r in (normalizer(i) for i in items) if r]
        return rows, ""
    except Exception as exc:
        return [], f"{actor_id.split('/')[-1]}: {exc}"


def apify_search(location: str, limit: int) -> list[dict]:
    """Run live Apify searches across platforms in parallel, store, return matches."""
    import concurrent.futures

    region = _detect_region(fix_typos(location))
    rows: list[dict] = []
    errors: list[str] = []
    if region == "india":
        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
            futures = [
                pool.submit(_run_one, actor_id, run_input, _normalize_india)
                for actor_id, run_input in _india_jobs(location, limit)
            ]
            for future in concurrent.futures.as_completed(futures):
                batch, error = future.result()
                if error:
                    errors.append(error)
                rows.extend(batch)
    else:
        if "delicious_zebu" in US_ACTOR:
            run_input = {"forSaleLocations": [location or "Austin, TX"], "maxItems": limit}
        else:
            run_input = {"location": location or "Austin, TX", "maxItems": limit}
        items = _run_actor(US_ACTOR, run_input)
        rows = [r for r in (_normalize_us(i) for i in items) if r]
    store_rows(rows)
    matched = [r for r in rows if _matches(r, location)][:limit]
    if not matched and errors and not rows:
        raise RuntimeError("; ".join(errors))
    return matched


_JOBS: dict[str, dict] = {}
_JOBS_LOCK = threading.Lock()
JOB_PLATFORMS = ["99acres", "99acres · city", "MagicBricks"]


def start_search_job(location: str, limit: int) -> dict:
    """Launch a live multi-platform search in the background. Never blocks."""
    job_id = uuid.uuid4().hex[:12]
    job = {
        "job_id": job_id,
        "query": location,
        "status": "running",
        "platforms": list(JOB_PLATFORMS),
        "platforms_done": [],
        "rows": [],
        "error": "",
    }
    with _JOBS_LOCK:
        _JOBS[job_id] = job
    thread = threading.Thread(target=_job_worker, args=(job_id, location, limit), daemon=True)
    thread.start()
    return job


def _job_worker(job_id: str, location: str, limit: int) -> None:
    import concurrent.futures

    jobs = _india_jobs(location, limit)
    labels = list(JOB_PLATFORMS)
    with concurrent.futures.ThreadPoolExecutor(max_workers=len(jobs)) as pool:
        future_to_label = {
            pool.submit(_run_one, actor_id, run_input, _normalize_india): label
            for (actor_id, run_input), label in zip(jobs, labels)
        }
        for future in concurrent.futures.as_completed(future_to_label):
            label = future_to_label[future]
            try:
                batch, _error = future.result()
            except Exception:
                batch = []
            if batch:
                store_rows(batch)
                with _JOBS_LOCK:
                    job = _JOBS.get(job_id)
                    if job is None:
                        return
                    job["rows"].extend([r for r in batch if _matches(r, location)])
                    if label not in job["platforms_done"]:
                        job["platforms_done"].append(label)
            else:
                with _JOBS_LOCK:
                    job = _JOBS.get(job_id)
                    if job is None:
                        return
                    if label not in job["platforms_done"]:
                        job["platforms_done"].append(label)
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if job is not None:
            job["status"] = "done"


def get_search_job(job_id: str) -> dict | None:
    with _JOBS_LOCK:
        job = _JOBS.get(job_id)
        if job is None:
            return None
        return {
            "job_id": job["job_id"],
            "query": job["query"],
            "status": job["status"],
            "platforms": job["platforms"],
            "platforms_done": list(job["platforms_done"]),
            "count": len(job["rows"]),
            "rows": list(job["rows"]),
        }


def search_properties(location: str = "", limit: int = 8) -> tuple[list[dict], str]:
    cached = [p for p in _read_cache() if _matches(p, location)]
    if len(cached) >= min(3, limit):
        return cached[:limit], "stored"
    try:
        live = apify_search(location, limit)
        if live:
            return live, "live"
    except Exception:
        pass
    return cached[:limit], "stored"
