"""
RAG document loader — loads and chunks .pdf and .txt files from the knowledge directory.
"""

import logging
from pathlib import Path

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    DirectoryLoader,
    PyPDFLoader,
    TextLoader,
)
from langchain_core.documents import Document

logger = logging.getLogger(__name__)

KNOWLEDGE_DIR = Path(__file__).parent.parent.parent / "data" / "knowledge"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 80


def load_documents() -> list[Document]:
    """Load all .pdf and .txt files from the knowledge directory and split into chunks.

    If the knowledge directory does not exist, it is created and an empty list is
    returned. All exceptions are caught and logged so this function never raises.

    Returns:
        A list of Document chunks ready for indexing, or [] on any failure.
    """
    try:
        if not KNOWLEDGE_DIR.exists():
            logger.warning(
                "Knowledge directory %s does not exist — creating it. "
                "Add .pdf or .txt files there to enable RAG.",
                KNOWLEDGE_DIR,
            )
            KNOWLEDGE_DIR.mkdir(parents=True, exist_ok=True)
            return []

        # Load .txt files (explicit utf-8 encoding for cross-platform compatibility)
        txt_loader = DirectoryLoader(
            str(KNOWLEDGE_DIR),
            glob="**/*.txt",
            loader_cls=TextLoader,
            loader_kwargs={"encoding": "utf-8"},
            silent_errors=True,
        )

        # Load .pdf files
        pdf_loader = DirectoryLoader(
            str(KNOWLEDGE_DIR),
            glob="**/*.pdf",
            loader_cls=PyPDFLoader,
            silent_errors=True,
        )

        txt_docs = txt_loader.load()
        pdf_docs = pdf_loader.load()
        all_docs = txt_docs + pdf_docs

        if not all_docs:
            logger.warning(
                "No .pdf or .txt documents found in %s. Knowledge base will be empty.",
                KNOWLEDGE_DIR,
            )
            return []

        logger.info(
            "Loaded %d raw document(s) from %s (%d txt, %d pdf).",
            len(all_docs),
            KNOWLEDGE_DIR,
            len(txt_docs),
            len(pdf_docs),
        )

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=CHUNK_SIZE,
            chunk_overlap=CHUNK_OVERLAP,
        )
        chunks = splitter.split_documents(all_docs)

        logger.info(
            "Split into %d chunk(s) (chunk_size=%d, overlap=%d).",
            len(chunks),
            CHUNK_SIZE,
            CHUNK_OVERLAP,
        )
        return chunks

    except Exception:
        logger.exception(
            "Failed to load documents from %s — returning empty list.", KNOWLEDGE_DIR
        )
        return []
