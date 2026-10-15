import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.models.schemas import (
    Lead,
    LeadIn,
    Transcript,
    TranscriptActionIn,
    TranscriptList,
)
from app.services.ai_client import AIFailure
from app.services.analysis import analyze_lead
from app.services.transcript_analysis import analyze_transcript, fallback_analysis
from app.services.transcription import TranscriptionFailure, transcribe_audio
from app.store import memory

router = APIRouter(prefix="/transcripts", tags=["transcripts"])

ALLOWED_EXTENSIONS = {".mp3", ".wav", ".m4a", ".ogg", ".webm", ".mp4"}
MAX_BYTES = 25 * 1024 * 1024


def _ext(filename: str) -> str:
    dot = filename.rfind(".")
    return filename[dot:].lower() if dot != -1 else ""


_BUDGET_DEFAULT = 1_000_000.0

_BUDGET_MULTIPLIERS = (
    ("crores", 10_000_000.0),
    ("crore", 10_000_000.0),
    ("cr", 10_000_000.0),
    ("lakhs", 100_000.0),
    ("lak", 100_000.0),
    ("lac", 100_000.0),
    ("l", 100_000.0),
    ("k", 1_000.0),
)


def _to_budget(raw: object) -> float:
    """Lenient budget parsing: numbers, numeric strings, '80L', '1.2Cr',
    '₹80,00,000'. Anything else falls back to the default — never raises,
    so a vague cold-call budget can never block storing the lead."""
    if isinstance(raw, bool):
        return _BUDGET_DEFAULT
    if isinstance(raw, (int, float)):
        return float(raw) if float(raw) > 0 else _BUDGET_DEFAULT
    text = str(raw or "").strip().lower()
    for junk in ("₹", "rs.", "rs", "inr"):
        text = text.replace(junk, "")
    text = text.replace(",", "").strip()
    if not text:
        return _BUDGET_DEFAULT
    multiplier = 1.0
    for suffix, mult in _BUDGET_MULTIPLIERS:
        if text.endswith(suffix):
            multiplier = mult
            text = text[: -len(suffix)].strip()
            break
    try:
        value = float(text) * multiplier
    except ValueError:
        return _BUDGET_DEFAULT
    return value if value > 0 else _BUDGET_DEFAULT


@router.post("/upload", status_code=status.HTTP_201_CREATED, response_model=Transcript)
async def upload_transcript(file: UploadFile = File(...)) -> Transcript:
    filename = file.filename or "call-audio"
    ext = _ext(filename)
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"unsupported audio type '{ext or 'unknown'}'. Upload mp3 or wav (m4a/ogg/webm also accepted).",
        )
    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="uploaded file is empty")
    if len(content) > MAX_BYTES:
        raise HTTPException(status_code=413, detail="audio file is too large (max 25 MB)")

    try:
        text = transcribe_audio(filename, content)
    except TranscriptionFailure as exc:
        raise HTTPException(status_code=502, detail=f"transcription failed: {exc}")

    try:
        analysis = analyze_transcript(text, filename)
        analysis_error = None
    except AIFailure as exc:
        analysis = fallback_analysis(text, filename)
        analysis_error = str(exc)

    record = Transcript(
        id=uuid.uuid4().hex,
        filename=filename,
        created_at=datetime.now(timezone.utc).isoformat(),
        transcript=text,
        analysis=analysis,
        analysis_error=analysis_error,
    )
    memory.transcripts[record.id] = record
    return record


@router.get("", response_model=TranscriptList)
def list_transcripts() -> TranscriptList:
    rows = sorted(memory.transcripts.values(), key=lambda t: t.created_at, reverse=True)
    return TranscriptList(transcripts=rows)


@router.get("/{transcript_id}", response_model=Transcript)
def get_transcript(transcript_id: str) -> Transcript:
    record = memory.transcripts.get(transcript_id)
    if record is None:
        raise HTTPException(status_code=404, detail="transcript not found")
    return record


@router.post("/{transcript_id}/actions", response_model=Transcript)
def apply_transcript_action(transcript_id: str, payload: TranscriptActionIn) -> Transcript:
    record = memory.transcripts.get(transcript_id)
    if record is None:
        raise HTTPException(status_code=404, detail="transcript not found")
    if record.analysis is None:
        raise HTTPException(status_code=422, detail="transcript has no AI analysis yet")
    valid_ids = {s.id for s in record.analysis.suggestions}
    # Also accept kind slugs so the UI can post stable values.
    valid_kinds = {s.kind for s in record.analysis.suggestions}
    if payload.action_id not in valid_ids and payload.action_id not in valid_kinds:
        raise HTTPException(status_code=422, detail=f"unknown action '{payload.action_id}'")

    chosen = next(
        (s for s in record.analysis.suggestions if s.id == payload.action_id or s.kind == payload.action_id),
        None,
    )
    record.chosen_action = chosen.id if chosen else payload.action_id
    record.action_note = chosen.description if chosen else None

    if chosen is not None and chosen.kind == "create_lead" and record.lead_id is None:
        raw = dict(record.analysis.suggested_lead or {})
        lead_in = LeadIn(
            name=str(raw.get("name") or "Call Lead").strip() or "Call Lead",
            location=str(raw.get("location") or "Unknown").strip() or "Unknown",
            property_requirement=str(raw.get("property_requirement") or "Follow up on sales call").strip()
            or "Follow up on sales call",
            budget=_to_budget(raw.get("budget")),
            buying_timeline=str(raw.get("buying_timeline") or "flexible").strip() or "flexible",
            customer_message=str(raw.get("customer_message") or record.transcript[:2000]).strip()
            or record.transcript[:2000],
        )
        lead = Lead(
            **lead_in.model_dump(),
            id=uuid.uuid4().hex,
            created_at=datetime.now(timezone.utc).isoformat(),
            analysis=None,
            analysis_error=None,
            origin="call",
        )
        try:
            lead.analysis = analyze_lead(lead_in)
        except AIFailure as exc:
            lead.analysis_error = str(exc)
        memory.leads[lead.id] = lead
        record.lead_id = lead.id
        try:
            from app.services import firestore_sync

            firestore_sync.save(lead.model_dump())
        except Exception:
            pass

    memory.transcripts[record.id] = record
    return record
