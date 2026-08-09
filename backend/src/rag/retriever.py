"""
RAG retriever — gracefully disabled when vector store is unavailable.

When the knowledge base isn't available, the agent answers from general knowledge.
"""

import logging

from langchain_core.tools import tool

logger = logging.getLogger(__name__)

_vs = None  # Vector store singleton (always None when RAG is disabled)


def init_retriever() -> None:
    """Attempt to load the vector store; logs a warning if unavailable."""
    global _vs
    try:
        from rag.vector_store import load_or_build_vector_store

        _vs = load_or_build_vector_store()
        if _vs is None:
            logger.info(
                "Knowledge base unavailable — search_knowledge_base will return fallback."
            )
        else:
            logger.info("RAG retriever initialised successfully.")
    except Exception:
        logger.exception("Failed to initialise RAG retriever — continuing without RAG.")
        _vs = None


@tool
def search_knowledge_base(query: str) -> str:
    """Search the Vidya curriculum knowledge base for relevant educational content.

    Use this tool before answering factual questions about curriculum topics
    (science, mathematics, history, etc.). It returns the top-3 most relevant
    text chunks from the indexed documents together with the name of the source
    document each chunk came from.

    Args:
        query: A natural-language question or topic to look up.

    Returns:
        A newline-separated string of up to 3 results, each prefixed with the
        source document name. Returns a short message if the knowledge base is
        unavailable or if the search fails.
    """
    if _vs is None:
        return "Knowledge base not available."

    try:
        docs = _vs.similarity_search(query, k=3)
        return "\n\n".join(
            f"[{d.metadata.get('source', 'unknown')}]\n{d.page_content}" for d in docs
        )
    except Exception:
        logger.exception("search_knowledge_base failed for query %r.", query)
        return "Knowledge base search failed."
