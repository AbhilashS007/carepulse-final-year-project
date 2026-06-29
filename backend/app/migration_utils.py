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

    # ── Phase 4B: Telemetry table for raw ESP32 sensor data ──
    # CREATE TABLE IF NOT EXISTS is idempotent — safe on every startup.
    """CREATE TABLE IF NOT EXISTS telemetry (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id VARCHAR(50) NOT NULL,
        moisture_raw INTEGER NOT NULL,
        wetness_percent INTEGER NOT NULL,
        battery_percent INTEGER NOT NULL,
        wifi_rssi INTEGER,
        firmware_version VARCHAR(20),
        esp32_timestamp DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL
    )""",
    # Indexes for fast latest/recent queries
    "CREATE INDEX IF NOT EXISTS ix_telemetry_device_id ON telemetry (device_id)",
    "CREATE INDEX IF NOT EXISTS ix_telemetry_created_at ON telemetry (created_at)",

    # ── Phase 4B Refinement: IoT metadata columns ────────────
    # ALTER TABLE for databases where the table already exists
    # without these columns (safe to fail silently if present).
    "ALTER TABLE telemetry ADD COLUMN wifi_rssi INTEGER",
    "ALTER TABLE telemetry ADD COLUMN firmware_version VARCHAR(20)",
    "ALTER TABLE telemetry ADD COLUMN esp32_timestamp DATETIME",
    "ALTER TABLE telemetry ADD COLUMN processed BOOLEAN NOT NULL DEFAULT 0",
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
