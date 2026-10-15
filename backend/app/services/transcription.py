import os

import groq

TRANSCRIBE_MODEL = os.environ.get("GROQ_TRANSCRIBE_MODEL", "whisper-large-v3-turbo")


class TranscriptionFailure(Exception):
    pass


def transcribe_audio(filename: str, content: bytes) -> str:
    """Transcribe mp3/wav audio via Groq Whisper. Returns plain text."""
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key:
        raise TranscriptionFailure("GROQ_API_KEY is not configured")
    try:
        client = groq.Groq(api_key=api_key)
        resp = client.audio.transcriptions.create(
            model=TRANSCRIBE_MODEL,
            file=(filename, content),
            response_format="text",
        )
        text = resp if isinstance(resp, str) else getattr(resp, "text", str(resp))
        text = (text or "").strip()
        if not text:
            raise TranscriptionFailure("transcription came back empty")
        return text
    except TranscriptionFailure:
        raise
    except Exception as exc:
        raise TranscriptionFailure(str(exc))
