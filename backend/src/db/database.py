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

            CREATE TABLE IF NOT EXISTS exercise_attempts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                exercise_id TEXT NOT NULL,
                topic TEXT NOT NULL,
                result TEXT NOT NULL,
                attempted_at TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_attempts_user ON exercise_attempts(user_id);
            CREATE INDEX IF NOT EXISTS idx_attempts_exercise ON exercise_attempts(user_id, exercise_id);

            CREATE TABLE IF NOT EXISTS call_history (
                id               INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id          TEXT    NOT NULL,
                started_at       TEXT    NOT NULL,
                ended_at         TEXT,
                duration_seconds INTEGER,
                topic            TEXT,
                performance      TEXT,
                status           TEXT    NOT NULL,
                retry_of         INTEGER,
                retry_attempted  INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_callhist_user ON call_history(user_id);

            CREATE TABLE IF NOT EXISTS escalations (
                reference_id      TEXT PRIMARY KEY,
                user_id           TEXT NOT NULL,
                name              TEXT,
                reason            TEXT NOT NULL,
                summary           TEXT NOT NULL,
                what_was_checked  TEXT,
                urgency           TEXT DEFAULT 'medium',
                language          TEXT,
                follow_up_method  TEXT,
                status            TEXT DEFAULT 'open',
                created_at        TEXT NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(user_id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_escalations_user ON escalations(user_id);
            CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
        """)

        # Add new columns to users table idempotently (Day 6)
        import contextlib

        for _col_sql in [
            "ALTER TABLE users ADD COLUMN preferred_time TEXT",
            "ALTER TABLE users ADD COLUMN call_opt_out INTEGER DEFAULT 0",
            "ALTER TABLE users ADD COLUMN sip_uri TEXT",
        ]:
            with contextlib.suppress(sqlite3.OperationalError):
                conn.execute(_col_sql)

        # Add outcome and analytics columns to call_history idempotently (Day 8 extended)
        for _col_sql in [
            "ALTER TABLE call_history ADD COLUMN outcome TEXT",
            "ALTER TABLE call_history ADD COLUMN failure_reason TEXT",
            "ALTER TABLE call_history ADD COLUMN channel TEXT DEFAULT 'browser'",
            "ALTER TABLE call_history ADD COLUMN latency_ms INTEGER DEFAULT 800",
            "ALTER TABLE call_history ADD COLUMN exercises_completed INTEGER DEFAULT 0",
        ]:
            with contextlib.suppress(sqlite3.OperationalError):
                conn.execute(_col_sql)


# Run once at import time so any module that does `from src.db.database import ...`
# gets a ready-to-use database automatically.
init_db()
