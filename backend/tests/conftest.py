import os

import pytest

os.environ.setdefault("GROQ_API_KEY", "test-groq-key")
os.environ.setdefault("GEMINI_API_KEY", "test-gemini-key")
os.environ.setdefault("MASALAI_NO_FIRESTORE", "1")
os.environ.setdefault("MASALAI_NO_SEED", "1")

from app.store import memory


@pytest.fixture(autouse=True)
def _clean_store():
    memory.clear()
    yield
    memory.clear()
