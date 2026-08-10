"""
RAG vector store — disabled due to disk space constraints.

The RAG pipeline requires sentence-transformers/PyTorch (~700 MB).
The agent falls back gracefully to answering from general knowledge.
"""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

VECTOR_STORE_PATH = Path(__file__).parent.parent.parent / "data" / "vector_store"


def build_vector_store(docs: object) -> None:
    """No-op — RAG disabled."""
    logger.warning(
        "RAG vector store is disabled (sentence-transformers not installed)."
    )
    return None


def load_vector_store() -> None:
    """No-op — RAG disabled."""
    return None


def load_or_build_vector_store() -> None:
    """Returns None — agent will answer from general knowledge."""
    logger.info("RAG disabled — agent will use general knowledge only.")
    return None
