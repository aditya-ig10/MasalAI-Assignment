from pydantic import BaseModel, Field, field_validator
from typing import Literal

Priority = Literal["hot", "warm", "cold"]
Intent = Literal["buy", "sell", "rent", "invest", "just_browsing", "unclear"]


class Influencer(BaseModel):
    present: bool = False
    who: str = ""
    evidence_phrase: str = ""
    suggested_action: str = ""


class Analysis(BaseModel):
    summary: str
    intent: Intent
    requirements: list[str] = []
    objections: list[str] = []
    next_action: str
    suggested_response: str
    priority: Priority
    priority_reason: str
    influencer: Influencer = Influencer()


class LeadIn(BaseModel):
    name: str = Field(min_length=1)
    location: str = Field(min_length=1)
    property_requirement: str = Field(min_length=1)
    budget: float = Field(gt=0)
    buying_timeline: str = Field(min_length=1)
    customer_message: str = Field(min_length=1)

    @field_validator("name", "location", "property_requirement", "buying_timeline", "customer_message")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class Lead(LeadIn):
    id: str
    created_at: str
    analysis: Analysis | None = None
    analysis_error: str | None = None
    origin: str = ""


class LeadList(BaseModel):
    leads: list[Lead]


class ChatIn(BaseModel):
    message: str = Field(min_length=1)

    @field_validator("message")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatOut(BaseModel):
    reply: str
    history: list[ChatMessage]


class LeadsChatIn(BaseModel):
    message: str = Field(min_length=1)
    leads: list[Lead] = Field(default_factory=list, max_length=20)
    history: list[ChatMessage] = Field(default_factory=list, max_length=20)

    @field_validator("message")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v.strip()


class TranscriptSuggestion(BaseModel):
    id: str
    label: str
    description: str
    kind: Literal["create_lead", "schedule_visit", "send_followup", "mark_cold", "needs_review"]


class TranscriptAnalysis(BaseModel):
    summary: str
    intent: Intent
    priority: Priority
    priority_reason: str
    requirements: list[str] = []
    objections: list[str] = []
    next_action: str
    suggested_response: str
    suggested_lead: dict = {}
    suggestions: list[TranscriptSuggestion] = []


class Transcript(BaseModel):
    id: str
    filename: str
    created_at: str
    transcript: str
    analysis: TranscriptAnalysis | None = None
    analysis_error: str | None = None
    chosen_action: str | None = None
    action_note: str | None = None
    lead_id: str | None = None


class TranscriptList(BaseModel):
    transcripts: list[Transcript]


class TranscriptActionIn(BaseModel):
    action_id: str = Field(min_length=1)

    @field_validator("action_id")
    @classmethod
    def _not_blank(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("must not be blank")
        return v.strip()
