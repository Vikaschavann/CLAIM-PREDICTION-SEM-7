"""SQLite database layer for InsureSight.

Tables:
  - predictions: logs every API prediction with inputs, outputs, timestamps
  - feedback:    optional user feedback on predictions (correct / incorrect)

Uses Python's built-in sqlite3 — zero external dependencies.
Thread-safe via check_same_thread=False + connection-per-request pattern.
"""
from __future__ import annotations
import sqlite3
import json
import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger("insuresight.db")

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "insuresight.db"

# ─── Schema ─────────────────────────────────────────────────────────────────

_CREATE_TABLES = """
CREATE TABLE IF NOT EXISTS predictions (
    id            TEXT PRIMARY KEY,
    created_at    TEXT NOT NULL,
    input_json    TEXT NOT NULL,
    model_used    TEXT NOT NULL,
    prediction    TEXT NOT NULL,
    probability   REAL NOT NULL,
    risk_score    INTEGER NOT NULL,
    risk_level    TEXT NOT NULL,
    top_factors   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
    id              TEXT PRIMARY KEY,
    prediction_id   TEXT NOT NULL REFERENCES predictions(id),
    created_at      TEXT NOT NULL,
    is_correct      INTEGER NOT NULL,
    comment         TEXT
);

CREATE INDEX IF NOT EXISTS idx_predictions_created   ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_risk       ON predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_model      ON predictions(model_used);
CREATE INDEX IF NOT EXISTS idx_feedback_prediction    ON feedback(prediction_id);
"""

# ─── Connection helpers ─────────────────────────────────────────────────────

def _get_conn() -> sqlite3.Connection:
    """Create a new SQLite connection (safe for use in any thread)."""
    DB_DIR.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    return conn


@contextmanager
def get_db():
    """Context manager that yields a connection and commits/rolls back."""
    conn = _get_conn()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    """Create tables if they don't exist yet. Call once at startup."""
    with get_db() as conn:
        conn.executescript(_CREATE_TABLES)
    logger.info("SQLite database initialised at %s", DB_PATH)


# ─── CRUD: predictions ──────────────────────────────────────────────────────

def save_prediction(
    input_data: dict,
    model_used: str,
    prediction: str,
    probability: float,
    risk_score: int,
    risk_level: str,
    top_factors: list[dict],
) -> str:
    """Insert a prediction row and return its UUID."""
    pred_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO predictions
               (id, created_at, input_json, model_used, prediction,
                probability, risk_score, risk_level, top_factors)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                pred_id,
                now,
                json.dumps(input_data),
                model_used,
                prediction,
                probability,
                risk_score,
                risk_level,
                json.dumps(top_factors),
            ),
        )
    logger.debug("Saved prediction %s", pred_id)
    return pred_id


def get_prediction(pred_id: str) -> dict | None:
    """Fetch a single prediction by ID."""
    with get_db() as conn:
        row = conn.execute(
            "SELECT * FROM predictions WHERE id = ?", (pred_id,)
        ).fetchone()
    if row is None:
        return None
    return _row_to_dict(row)


def list_predictions(
    limit: int = 50,
    offset: int = 0,
    risk_level: str | None = None,
    model: str | None = None,
) -> list[dict]:
    """Return recent predictions with optional filters."""
    query = "SELECT * FROM predictions WHERE 1=1"
    params: list[Any] = []
    if risk_level:
        query += " AND risk_level = ?"
        params.append(risk_level)
    if model:
        query += " AND model_used = ?"
        params.append(model)
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    with get_db() as conn:
        rows = conn.execute(query, params).fetchall()
    return [_row_to_dict(r) for r in rows]


def count_predictions() -> dict:
    """Return summary counts for the history dashboard."""
    with get_db() as conn:
        total = conn.execute("SELECT COUNT(*) FROM predictions").fetchone()[0]
        by_risk = conn.execute(
            "SELECT risk_level, COUNT(*) as cnt FROM predictions GROUP BY risk_level"
        ).fetchall()
        by_model = conn.execute(
            "SELECT model_used, COUNT(*) as cnt FROM predictions GROUP BY model_used"
        ).fetchall()
    return {
        "total": total,
        "by_risk_level": {r["risk_level"]: r["cnt"] for r in by_risk},
        "by_model": {r["model_used"]: r["cnt"] for r in by_model},
    }


# ─── CRUD: feedback ─────────────────────────────────────────────────────────

def save_feedback(prediction_id: str, is_correct: bool, comment: str | None = None) -> str:
    """Attach user feedback to a prediction."""
    fb_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            """INSERT INTO feedback (id, prediction_id, created_at, is_correct, comment)
               VALUES (?, ?, ?, ?, ?)""",
            (fb_id, prediction_id, now, int(is_correct), comment),
        )
    return fb_id


def get_feedback_for_prediction(prediction_id: str) -> list[dict]:
    """Get all feedback entries for a given prediction."""
    with get_db() as conn:
        rows = conn.execute(
            "SELECT * FROM feedback WHERE prediction_id = ? ORDER BY created_at DESC",
            (prediction_id,),
        ).fetchall()
    return [dict(r) for r in rows]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _row_to_dict(row: sqlite3.Row) -> dict:
    """Convert a predictions Row to a dict, deserialising JSON fields."""
    d = dict(row)
    d["input_data"] = json.loads(d.pop("input_json"))
    d["top_factors"] = json.loads(d["top_factors"])
    return d
