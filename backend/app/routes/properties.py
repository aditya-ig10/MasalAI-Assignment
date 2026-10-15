from fastapi import APIRouter, Query
from pydantic import BaseModel

from app.services.properties import get_search_job, search_properties, start_search_job, suggest_locations

router = APIRouter(prefix="/properties", tags=["properties"])


class SearchStart(BaseModel):
    location: str = ""
    limit: int = 8


@router.get("/search")
def search(location: str = Query(default=""), limit: int = Query(default=8, ge=1, le=25)) -> dict:
    results, source = search_properties(location, limit)
    return {"query": location, "source": source, "count": len(results), "properties": results}


@router.post("/search/jobs")
def start_job(payload: SearchStart) -> dict:
    limit = min(max(payload.limit, 1), 25)
    location = payload.location.strip()
    cached, _ = search_properties(location, limit)
    job = start_search_job(location, limit)
    return {
        "job_id": job["job_id"],
        "query": location,
        "status": job["status"],
        "platforms": job["platforms"],
        "cached": cached,
    }


@router.get("/search/jobs/{job_id}")
def job_status(job_id: str) -> dict:
    from fastapi import HTTPException

    job = get_search_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="job not found")
    return job


@router.get("/suggest")
def suggest(q: str = Query(default=""), limit: int = Query(default=8, ge=1, le=12)) -> dict:
    return {"query": q, "suggestions": suggest_locations(q, limit)}
