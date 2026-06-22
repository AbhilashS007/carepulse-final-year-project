"""
CarePulse Backend — migration_utils.py
---------------------------------------
SQLite-safe column migration helper.

Adds new columns to the existing carepulse.db without data loss.
Each ALTER TABLE statement is wrapped in a try/except so repeated
FastAPI startups are completely safe — already-existing columns are
silently skipped (SQLite raises OperationalError: "duplicate column name").

Usage (called from main.py before the app accepts requests):
    from app.migration_utils import run_migrations
    from app.database import engine
    run_migrations(engine)
"""

from sqlalchemy import text
from sqlalchemy.engine import Engine


# ── Migration statements ───────────────────────────────────────────
# Ordered list of ALTER TABLE statements.
# New migrations are appended at the bottom to maintain ordering.
MIGRATIONS: list[str] = [
    # ── Phase 1: Archive support ───────────────────────────────
    "ALTER TABLE patients ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT 0",

    # ── Phase 1: Disease-Aware Schema (Gemini Phase 2 readiness) ─
    "ALTER TABLE patients ADD COLUMN disease VARCHAR(200)",
    "ALTER TABLE patients ADD COLUMN disease_severity VARCHAR(20)",
    "ALTER TABLE patients ADD COLUMN diagnosis_date DATE",
    
    # ── Phase 2: Disease-Aware AI fields ─────────────────────────
    "ALTER TABLE ai_insights ADD COLUMN risk_explanation TEXT",
    "ALTER TABLE ai_insights ADD COLUMN monitoring_advice TEXT",

    # ── Phase 2 Level 3: AI engine provenance ─────────────────
    "ALTER TABLE ai_insights ADD COLUMN generated_by VARCHAR(50) NOT NULL DEFAULT 'rule_engine'",
]


def run_migrations(engine: Engine) -> None:
    """
    Executes all pending ALTER TABLE migrations against the connected database.

    Each statement is executed in its own transaction so that a failure
    on one column does not roll back the others. SQLite raises an
    OperationalError when a column already exists; we catch this and
    continue, making the function idempotent across restarts.

    Parameters
    ----------
    engine : The SQLAlchemy engine connected to carepulse.db.
    """
    with engine.connect() as conn:
        for migration_sql in MIGRATIONS:
            try:
                conn.execute(text(migration_sql))
                conn.commit()
            except Exception:
                # Column already exists (duplicate column name) — safe to skip.
                # Roll back the failed statement before continuing.
                conn.rollback()
