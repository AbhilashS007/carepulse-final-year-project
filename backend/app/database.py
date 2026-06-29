"""
CarePulse Backend — database.py
--------------------------------
Sets up the SQLAlchemy engine and session for SQLite.

SQLite is used for Phase 1 (local development / demo).
To migrate to MySQL later, change DATABASE_URL to:
    "mysql+pymysql://user:password@host:3306/carepulse"
and install PyMySQL.
"""

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# ── Database URL ──────────────────────────────────────────────
# SQLite file will be created in the backend/ directory.
# The "check_same_thread" argument is required for SQLite + FastAPI
# because FastAPI can use multiple threads for async handling.
DATABASE_URL = "sqlite:///./carepulse.db"

# ── Engine ────────────────────────────────────────────────────
# echo=False in production; set echo=True during development
# to print all SQL statements to the console for debugging.
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},  # SQLite-specific
    echo=False,
)

from sqlalchemy import event
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()

# ── Session Factory ───────────────────────────────────────────
# autocommit=False: transactions must be committed manually.
# autoflush=False:  SQLAlchemy will not flush automatically
#                   before every query.
SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
)

# ── Declarative Base ──────────────────────────────────────────
# All ORM models inherit from this Base class.
# SQLAlchemy uses it to discover and create database tables.
class Base(DeclarativeBase):
    pass


# ── Dependency ────────────────────────────────────────────────
# FastAPI dependency that provides a database session per request
# and ensures it is closed after the request finishes.
def get_db():
    """
    Yields a SQLAlchemy session for use in FastAPI route handlers.

    Usage in a route:
        @router.get("/example")
        def example(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
