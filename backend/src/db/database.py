"""
SQLite database setup for Vidya persistent learner memory.

Provides:
- DB_PATH: absolute path to the SQLite database file
- get_connection(): context manager yielding a configured sqlite3 connection
- init_db(): creates all tables and indexes (idempotent, safe to call multiple times)
"""

import os
import sqlite3
from collections.abc import Generator
from contextlib import contextmanager

# Resolve the database path relative to this file:
# src/db/database.py → src/db/ → src/ → backend/ → backend/data/vidya.db
_HERE = os.path.dirname(os.path.abspath(__file__))
_BACKEND_DIR = os.path.dirname(os.path.dirname(_HERE))
DB_PATH = os.path.join(_BACKEND_DIR, "data", "vidya.db")


@contextmanager
def get_connection() -> Generator[sqlite3.Connection, None, None]:
    """Yield a sqlite3 connection with row_factory and foreign keys enabled."""
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db() -> None:
    """
    Create all tables and indexes if they do not already exist.

    Safe to call multiple times — uses CREATE TABLE IF NOT EXISTS throughout.
    Called automatically at module import time.
    """
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)

    with get_connection() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS users (
                user_id TEXT PRIMARY KEY,
                name TEXT,
                language_preference TEXT,
                current_level TEXT,
                learning_goal TEXT,
                last_interaction TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS learner_facts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(user_id, key),
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS learning_topics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                status TEXT DEFAULT 'studying',
                last_discussed TEXT,
                UNIQUE(user_id, topic),
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_facts_user ON learner_facts(user_id);
            CREATE INDEX IF NOT EXISTS idx_topics_user ON learning_topics(user_id);
        """)


# Run once at import time so any module that does `from src.db.database import ...`
# gets a ready-to-use database automatically.
init_db()
