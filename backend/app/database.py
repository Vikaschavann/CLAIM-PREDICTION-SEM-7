"""Dual database layer for InsureSight:
- Supabase (PostgreSQL) when DATABASE_URL is provided in environment variables
- SQLite fallback locally when no DATABASE_URL is set

Tables:
  - predictions: logs every API prediction with inputs, outputs, timestamps
  - feedback:    optional user feedback on predictions (correct / incorrect)
"""
from __future__ import annotations
import os
import json
import logging
import uuid
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from contextlib import contextmanager
from typing import Any

logger = logging.getLogger("insuresight.db")

DB_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DB_DIR / "insuresight.db"

# Check if Supabase / PostgreSQL URL is configured
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
# Handle 'postgres://' vs 'postgresql://' for psycopg2 compatibility
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

IS_POSTGRES = bool(DATABASE_URL.startswith("postgresql://"))

# ─── Schema ─────────────────────────────────────────────────────────────────

_CREATE_TABLES_SQLITE = """
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

_CREATE_TABLES_PG = """
CREATE TABLE IF NOT EXISTS predictions (
    id            TEXT PRIMARY KEY,
    created_at    TIMESTAMPTZ NOT NULL,
    input_json    TEXT NOT NULL,
    model_used    TEXT NOT NULL,
    prediction    TEXT NOT NULL,
    probability   FLOAT NOT NULL,
    risk_score    INTEGER NOT NULL,
    risk_level    TEXT NOT NULL,
    top_factors   TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS feedback (
    id              TEXT PRIMARY KEY,
    prediction_id   TEXT NOT NULL REFERENCES predictions(id),
    created_at      TIMESTAMPTZ NOT NULL,
    is_correct      INTEGER NOT NULL,
    comment         TEXT
);

CREATE INDEX IF NOT EXISTS idx_predictions_created   ON predictions(created_at);
CREATE INDEX IF NOT EXISTS idx_predictions_risk       ON predictions(risk_level);
CREATE INDEX IF NOT EXISTS idx_predictions_model      ON predictions(model_used);
CREATE INDEX IF NOT EXISTS idx_feedback_prediction    ON feedback(prediction_id);
"""

# ─── Connection helpers ─────────────────────────────────────────────────────

@contextmanager
def get_db():
    """Context manager yielding a cursor and committing transactions."""
    if IS_POSTGRES:
        import psycopg2
        from psycopg2.extras import RealDictCursor
        conn = psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)
        try:
            with conn.cursor() as cur:
                yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()
    else:
        DB_DIR.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")
        try:
            cur = conn.cursor()
            yield cur
            conn.commit()
        except Exception:
            conn.rollback()
            raise
        finally:
            conn.close()


def init_db():
    """Create tables if they don't exist yet."""
    global IS_POSTGRES
    if IS_POSTGRES:
        try:
            import psycopg2
            conn = psycopg2.connect(DATABASE_URL)
            with conn.cursor() as cur:
                cur.execute(_CREATE_TABLES_PG)
            conn.commit()
            conn.close()
            logger.info("Connected to Supabase PostgreSQL database successfully")
            return
        except Exception as e:
            logger.warning("Supabase PostgreSQL connection failed (%s). Gracefully falling back to SQLite.", e)
            IS_POSTGRES = False

    with get_db() as cur:
        cur.executescript(_CREATE_TABLES_SQLITE)
    logger.info("Local SQLite database initialised at %s", DB_PATH)


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
    ph = "%s" if IS_POSTGRES else "?"

    sql = f"""INSERT INTO predictions
              (id, created_at, input_json, model_used, prediction,
               probability, risk_score, risk_level, top_factors)
              VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})"""

    with get_db() as cur:
        cur.execute(
            sql,
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
    logger.debug("Saved prediction %s to %s", pred_id, "Supabase" if IS_POSTGRES else "SQLite")
    return pred_id


def get_prediction(pred_id: str) -> dict | None:
    """Fetch a single prediction by ID."""
    ph = "%s" if IS_POSTGRES else "?"
    with get_db() as cur:
        cur.execute(f"SELECT * FROM predictions WHERE id = {ph}", (pred_id,))
        row = cur.fetchone()
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
    ph = "%s" if IS_POSTGRES else "?"
    query = "SELECT * FROM predictions WHERE 1=1"
    params: list[Any] = []
    if risk_level:
        query += f" AND risk_level = {ph}"
        params.append(risk_level)
    if model:
        query += f" AND model_used = {ph}"
        params.append(model)
    query += f" ORDER BY created_at DESC LIMIT {ph} OFFSET {ph}"
    params.extend([limit, offset])

    with get_db() as cur:
        cur.execute(query, tuple(params))
        rows = cur.fetchall()
    return [_row_to_dict(r) for r in rows]


def count_predictions() -> dict:
    """Return summary counts for the history dashboard."""
    with get_db() as cur:
        cur.execute("SELECT COUNT(*) FROM predictions")
        first = cur.fetchone()
        total = first[0] if isinstance(first, (tuple, list)) else first["count"]

        cur.execute("SELECT risk_level, COUNT(*) as cnt FROM predictions GROUP BY risk_level")
        by_risk = cur.fetchall()

        cur.execute("SELECT model_used, COUNT(*) as cnt FROM predictions GROUP BY model_used")
        by_model = cur.fetchall()

    return {
        "total": total,
        "by_risk_level": {
            (r[0] if isinstance(r, (tuple, list)) else r["risk_level"]): (r[1] if isinstance(r, (tuple, list)) else r["cnt"])
            for r in by_risk
        },
        "by_model": {
            (r[0] if isinstance(r, (tuple, list)) else r["model_used"]): (r[1] if isinstance(r, (tuple, list)) else r["cnt"])
            for r in by_model
        },
    }


# ─── CRUD: feedback ─────────────────────────────────────────────────────────

def save_feedback(prediction_id: str, is_correct: bool, comment: str | None = None) -> str:
    """Attach user feedback to a prediction."""
    fb_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    ph = "%s" if IS_POSTGRES else "?"

    sql = f"""INSERT INTO feedback (id, prediction_id, created_at, is_correct, comment)
              VALUES ({ph}, {ph}, {ph}, {ph}, {ph})"""

    with get_db() as cur:
        cur.execute(sql, (fb_id, prediction_id, now, int(is_correct), comment))
    return fb_id


def get_feedback_for_prediction(prediction_id: str) -> list[dict]:
    """Get all feedback entries for a given prediction."""
    ph = "%s" if IS_POSTGRES else "?"
    with get_db() as cur:
        cur.execute(
            f"SELECT * FROM feedback WHERE prediction_id = {ph} ORDER BY created_at DESC",
            (prediction_id,),
        )
        rows = cur.fetchall()
    return [dict(r) for r in rows]


# ─── Helpers ─────────────────────────────────────────────────────────────────

def _row_to_dict(row: Any) -> dict:
    """Convert a row to a dict, deserialising JSON fields and normalizing timestamps."""
    d = dict(row)
    if isinstance(d.get("created_at"), datetime):
        d["created_at"] = d["created_at"].isoformat()
    if isinstance(d.get("input_json"), str):
        d["input_data"] = json.loads(d.pop("input_json"))
    elif "input_json" in d:
        d["input_data"] = d.pop("input_json")
    if isinstance(d.get("top_factors"), str):
        d["top_factors"] = json.loads(d["top_factors"])
    return d
