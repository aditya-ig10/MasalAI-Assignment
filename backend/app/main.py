import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.models.schemas import Lead
from app.routes.health import router as health_router
from app.routes.chat import router as chat_router
from app.routes.leads import router as leads_router
from app.routes.properties import router as properties_router
from app.routes.transcripts import router as transcripts_router
from app.services import firestore_sync
from app.store import memory


def _load_seed() -> None:
    if os.environ.get("MASALAI_NO_SEED"):
        return
    loaded = 0
    for raw in firestore_sync.fetch_all():
        try:
            lead = Lead.model_validate(raw)
        except Exception:
            continue
        memory.leads.setdefault(lead.id, lead)
        loaded += 1
    if loaded:
        return
    path = Path(__file__).resolve().parents[1] / "seed_data.json"
    if not path.exists():
        return
    for raw in json.loads(path.read_text()):
        lead = Lead.model_validate(raw)
        memory.leads.setdefault(lead.id, lead)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _load_seed()
    yield


app = FastAPI(title="LeadAnalyzer Backend", version="0.1.0", lifespan=lifespan)

frontend_url = (
    os.environ.get("FRONTEND_URL")
    or os.environ.get("RENDER_EXTERNAL_URL", "http://localhost:3000")
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[frontend_url],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(leads_router)
app.include_router(properties_router)
app.include_router(transcripts_router)
