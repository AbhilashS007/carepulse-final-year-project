"""
CarePulse Backend — crud.py
-----------------------------
Database query functions for all four tables.

Design principles:
- Each function accepts a SQLAlchemy Session as its first argument.
- Functions return ORM objects (or plain dicts for aggregates).
  The router layer is responsible for converting them to Pydantic schemas.
- No business logic lives here — only data retrieval.
- Comments explain the query strategy and any non-obvious SQL behaviour.

Functions provided
──────────────────
  Patients  : get_all_patients, get_patient_by_id,
              create_patient, update_patient, archive_patient
  Alerts    : get_all_alerts
  Analytics : get_dashboard_stats, get_wetness_trend, get_urination_frequency
  AI Insights: get_all_ai_insights
"""

from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Optional

from sqlalchemy import func, text
from sqlalchemy.orm import Session, joinedload

from app.models import AIInsight, Alert, Patient, UrinationEvent
from app import schemas


# ================================================================
# HELPER — wetness_level classifier
# ================================================================

def _classify_wetness(percent: float) -> str:
    """
    Convert a raw wetness percentage into the four-bucket label.
    Used internally when CRUD needs to reason about wetness category
    without querying the stored wetness_level string.

    Thresholds mirror the IoT sensor firmware logic:
        0 – 30  →  dry
       31 – 60  →  slightly_wet
       61 – 80  →  moderately_wet
       81 – 100 →  saturated
    """
    if percent <= 30:
        return "dry"
    if percent <= 60:
        return "slightly_wet"
    if percent <= 80:
        return "moderately_wet"
    return "saturated"


# ================================================================
# PATIENTS
# ================================================================

def get_all_patients(
    db: Session,
    skip: int = 0,
    limit: int = 100,
    archived: str = "active",
) -> list[Patient]:
    """
    Return a flat list of Patient rows ordered by name.

    Parameters
    ----------
    skip     : Number of rows to skip (for pagination).
    limit    : Maximum rows to return (capped at 100 by default).
    archived : Filter mode — one of:
               "active"   → only non-archived patients (default)
               "archived" → only archived patients
               "all"      → all patients regardless of archive status

    Notes
    -----
    - Relationships are NOT eagerly loaded here — the list endpoint uses
      PatientSummaryOut which does not include nested data.
    """
    query = db.query(Patient)

    if archived == "active":
        query = query.filter(Patient.is_archived == False)   # noqa: E712
    elif archived == "archived":
        query = query.filter(Patient.is_archived == True)    # noqa: E712
    # "all" → no filter applied

    return (
        query
        .order_by(Patient.name)
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_patient_by_id(db: Session, patient_id: int) -> Optional[Patient]:
    """
    Return a single Patient with all relationships eagerly loaded.

    Uses joinedload so that accessing patient.alerts, .urination_events,
    and .ai_insights does NOT fire additional SQL queries (avoids N+1).
    This is the function used by the patient detail panel on the frontend.

    Returns None if no patient with the given id exists.
    """
    return (
        db.query(Patient)
        .options(
            joinedload(Patient.alerts),
            joinedload(Patient.urination_events),
            joinedload(Patient.ai_insights),
        )
        .filter(Patient.id == patient_id)
        .first()
    )


def create_patient(db: Session, patient_data: "schemas.PatientCreate") -> Patient:
    """
    Insert a new patient into the database.

    Raises
    ------
    ValueError
        If another patient already uses the same device_id.
        The router converts this to a 409 Conflict HTTP response.
    """
    # Device ID must be globally unique
    existing = (
        db.query(Patient)
        .filter(Patient.device_id == patient_data.device_id)
        .first()
    )
    if existing:
        raise ValueError(
            f"Device ID '{patient_data.device_id}' is already assigned to patient "
            f"'{existing.name}' (ID {existing.id})."
        )

    # Exclude None disease fields so the DB defaults (NULL) are used cleanly
    patient = Patient(**patient_data.model_dump(exclude_none=True))
    db.add(patient)
    db.commit()

    # Reload with relationships so the response includes empty arrays
    return get_patient_by_id(db, patient.id)  # type: ignore[return-value]


def update_patient(
    db: Session,
    patient_id: int,
    patient_data: "schemas.PatientCreate",
) -> Optional[Patient]:
    """
    Fully replace a patient's mutable fields (PUT semantics).

    Returns None if the patient does not exist.

    Raises
    ------
    ValueError
        If the new device_id is already used by a *different* patient.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        return None

    # Only check uniqueness if the device_id is actually changing
    if patient_data.device_id != patient.device_id:
        conflict = (
            db.query(Patient)
            .filter(
                Patient.device_id == patient_data.device_id,
                Patient.id != patient_id,
            )
            .first()
        )
        if conflict:
            raise ValueError(
                f"Device ID '{patient_data.device_id}' is already assigned to patient "
                f"'{conflict.name}' (ID {conflict.id})."
            )

    # Check if disease or severity changed before updating
    disease_changed = (patient.disease != getattr(patient_data, "disease", None)) or (patient.disease_severity != getattr(patient_data, "disease_severity", None))

    # Apply all fields from the payload, setting disease fields to None when omitted
    data = patient_data.model_dump()
    for field, value in data.items():
        setattr(patient, field, value)

    db.commit()
    
    if disease_changed:
        try:
            from app.services import disease_ai
            disease_ai.generate_insight(db, patient_id)
        except ImportError:
            pass
            
    return get_patient_by_id(db, patient_id)


def archive_patient(db: Session, patient_id: int) -> Optional[Patient]:
    """
    Soft-archive a patient by setting is_archived = True.

    This is non-destructive: all alerts, urination events, and AI insights
    are fully preserved. The patient simply disappears from the active list.

    Returns None if the patient does not exist.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        return None

    patient.is_archived = True
    db.commit()
    return get_patient_by_id(db, patient_id)


# ================================================================
# ALERTS
# ================================================================

def get_all_alerts(
    db: Session,
    resolved: Optional[bool] = None,
    severity: Optional[str] = None,
    alert_type: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
) -> list[Alert]:
    """
    Return alerts, with optional filters matching the frontend Alert Center.

    Parameters
    ----------
    resolved   : If True → only resolved alerts.
                 If False → only active (unresolved) alerts.
                 If None → all alerts (default).
    severity   : Filter by severity string ("critical" | "warning" | "info").
    alert_type : Filter by type string (e.g., "high_wetness").
    skip       : Pagination offset.
    limit      : Maximum rows returned.

    Ordering
    --------
    Unresolved alerts appear first (resolved=False sorts before True in SQLite).
    Within each group, most-recent alerts appear first.
    This mirrors the ordering shown in the frontend alert list.
    """
    query = db.query(Alert)

    # Apply optional filters
    if resolved is not None:
        query = query.filter(Alert.resolved == resolved)
    if severity:
        query = query.filter(Alert.severity == severity.lower())
    if alert_type:
        query = query.filter(Alert.alert_type == alert_type.lower())

    # Unresolved first, then newest first within each group
    query = query.order_by(Alert.resolved.asc(), Alert.created_at.desc())

    return query.offset(skip).limit(limit).all()


# ================================================================
# ANALYTICS — Dashboard Stats
# ================================================================

def get_dashboard_stats(db: Session) -> dict:
    """
    Compute the four KPI card values and device/wetness distribution
    counts shown on the frontend Dashboard page.

    Returns a plain dict (not an ORM object) because this is an
    aggregate result assembled from multiple queries. The router
    passes it to schemas.DashboardStats for validation/serialisation.

    Queries
    -------
    1. total_patients       → COUNT(*) on patients table.
    2. active_alerts        → COUNT of unresolved alerts.
    3. connected_devices    → COUNT of patients whose latest event
                              has device_status = "online".
    4. today_event_count    → COUNT of urination_events recorded today
                              (UTC date boundary).
    5. Wetness distribution → For each patient, take the most-recent
                              urination event and bucket its wetness_level.
    6. Device health        → Same most-recent event per patient,
                              bucket by device_status.
    """

    # ── 1. Total active patients ────────────────────────────────
    # Archived patients are excluded from all dashboard KPIs.
    total_patients: int = (
        db.query(func.count(Patient.id))
        .filter(Patient.is_archived == False)        # noqa: E712
        .scalar()
        or 0
    )

    # ── 2. Active (unresolved) alerts ──────────────────────────
    # Only count alerts for non-archived patients.
    active_alerts: int = (
        db.query(func.count(Alert.id))
        .join(Patient, Alert.patient_id == Patient.id)
        .filter(Alert.resolved == False, Patient.is_archived == False)  # noqa: E712
        .scalar()
        or 0
    )

    # ── 3 & 4. Today's events + connected devices ──────────────
    # "Today" = from midnight UTC to now.
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    today_event_count: int = (
        db.query(func.count(UrinationEvent.id))
        .filter(UrinationEvent.recorded_at >= today_start)
        .scalar()
        or 0
    )

    # ── Most-recent event per patient (subquery) ───────────────
    # We need the latest urination_event for each patient to
    # determine their current device status and wetness level.
    # Strategy: subquery finds MAX(recorded_at) per patient_id,
    # then we join back to get the full row.
    latest_event_subq = (
        db.query(
            UrinationEvent.patient_id,
            func.max(UrinationEvent.recorded_at).label("max_recorded_at"),
        )
        .group_by(UrinationEvent.patient_id)
        .subquery()
    )

    latest_events: list[UrinationEvent] = (
        db.query(UrinationEvent)
        .join(
            latest_event_subq,
            (UrinationEvent.patient_id == latest_event_subq.c.patient_id)
            & (UrinationEvent.recorded_at == latest_event_subq.c.max_recorded_at),
        )
        .all()
    )

    # ── 3. Connected devices ───────────────────────────────────
    connected_devices: int = sum(
        1 for e in latest_events if e.device_status == "online"
    )

    # ── 5. Wetness distribution ────────────────────────────────
    wetness_counts: dict[str, int] = {
        "dry": 0, "slightly_wet": 0, "moderately_wet": 0, "saturated": 0
    }
    for event in latest_events:
        bucket = event.wetness_level
        if bucket in wetness_counts:
            wetness_counts[bucket] += 1

    # ── 6. Device health distribution ─────────────────────────
    device_counts: dict[str, int] = {"online": 0, "offline": 0, "maintenance": 0}
    for event in latest_events:
        status = event.device_status
        if status in device_counts:
            device_counts[status] += 1

    return {
        "total_patients":       total_patients,
        "active_alerts":        active_alerts,
        "connected_devices":    connected_devices,
        "today_event_count":    today_event_count,
        # Wetness distribution
        "count_dry":            wetness_counts["dry"],
        "count_slightly_wet":   wetness_counts["slightly_wet"],
        "count_moderately_wet": wetness_counts["moderately_wet"],
        "count_saturated":      wetness_counts["saturated"],
        # Device health
        "devices_online":       device_counts["online"],
        "devices_offline":      device_counts["offline"],
        "devices_maintenance":  device_counts["maintenance"],
    }


# ================================================================
# ANALYTICS — Wetness Trend
# ================================================================

def get_wetness_trend(
    db: Session,
    days: int = 7,
    bucket_hours: int = 4,
) -> list[dict]:
    """
    Return average and peak wetness readings bucketed into time windows,
    suitable for the Analytics page AreaChart.

    Parameters
    ----------
    days         : How many days of historical data to include (default 7).
    bucket_hours : Size of each time bucket in hours (default 4).
                   With days=7 and bucket_hours=4 this produces 42 data points,
                   matching the frontend mock data density.

    Strategy
    --------
    SQLite does not have a native DATE_TRUNC function. We load the relevant
    rows into Python and bucket them manually. This is acceptable at demo
    scale (≤ a few thousand rows). For production, a raw SQL approach or
    migration to PostgreSQL (with its date_trunc()) would be preferred.

    Returns
    -------
    A list of dicts, each with keys:
        recorded_at   : datetime — start of the bucket window
        avg_wetness   : float    — mean wetness_percent in this bucket
        max_wetness   : float    — peak wetness_percent in this bucket
        patient_count : int      — number of distinct patients measured
    Ordered chronologically (oldest first).
    """
    # Calculate the start of the query window
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Fetch all events in the window — only the columns we need
    rows: list[UrinationEvent] = (
        db.query(UrinationEvent)
        .filter(UrinationEvent.recorded_at >= since)
        .order_by(UrinationEvent.recorded_at.asc())
        .all()
    )

    if not rows:
        return []

    # ── Bucket the rows ────────────────────────────────────────
    # Key = bucket_start (a datetime truncated to bucket_hours boundaries)
    buckets: dict[datetime, dict] = {}

    bucket_delta = timedelta(hours=bucket_hours)

    for row in rows:
        # Normalise recorded_at to a timezone-aware UTC datetime
        ts = row.recorded_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)

        # Snap the timestamp down to the nearest bucket boundary
        # e.g., 13:47 with bucket_hours=4 → 12:00
        epoch = datetime(2026, 1, 1, tzinfo=timezone.utc)
        offset_seconds = (ts - epoch).total_seconds()
        bucket_seconds = bucket_hours * 3600
        snapped_seconds = int(offset_seconds // bucket_seconds) * bucket_seconds
        bucket_start = epoch + timedelta(seconds=snapped_seconds)

        if bucket_start not in buckets:
            buckets[bucket_start] = {
                "recorded_at":  bucket_start,
                "wetness_sum":  0.0,
                "wetness_max":  0.0,
                "count":        0,
                "patient_ids":  set(),
            }

        b = buckets[bucket_start]
        b["wetness_sum"]  += row.wetness_percent
        b["wetness_max"]   = max(b["wetness_max"], row.wetness_percent)
        b["count"]        += 1
        b["patient_ids"].add(row.patient_id)

    # ── Flatten to list of dicts ───────────────────────────────
    result = []
    for bucket_start in sorted(buckets.keys()):
        b = buckets[bucket_start]
        result.append({
            "recorded_at":   b["recorded_at"],
            "avg_wetness":   round(b["wetness_sum"] / b["count"], 1),
            "max_wetness":   round(b["wetness_max"], 1),
            "patient_count": len(b["patient_ids"]),
        })

    return result


# ================================================================
# ANALYTICS — Urination Frequency
# ================================================================

def get_urination_frequency(
    db: Session,
    days: int = 7,
) -> list[dict]:
    """
    Return total urination event counts per calendar day for the
    Analytics page BarChart (Daily Urination Frequency).

    Parameters
    ----------
    days : Number of past days to include (default 7).

    Returns
    -------
    A list of dicts ordered by date (oldest first), each with:
        date        : str — ISO date "YYYY-MM-DD"
        event_count : int — total events across all patients on that day

    Implementation note
    -------------------
    SQLite's strftime('%Y-%m-%d', recorded_at) is used to extract the
    calendar date from the datetime column — this is SQLite-native and
    will need to be replaced with DATE() or DATE_FORMAT() for MySQL.
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    # Use SQLite's strftime to group by calendar date
    rows = (
        db.query(
            func.strftime("%Y-%m-%d", UrinationEvent.recorded_at).label("event_date"),
            func.count(UrinationEvent.id).label("event_count"),
        )
        .filter(UrinationEvent.recorded_at >= since)
        .group_by(text("event_date"))
        .order_by(text("event_date asc"))
        .all()
    )

    return [
        {"date": row.event_date, "event_count": row.event_count}
        for row in rows
    ]


# ================================================================
# AI INSIGHTS
# ================================================================

def get_all_ai_insights(
    db: Session,
    skip: int = 0,
    limit: int = 50,
) -> list[AIInsight]:
    """
    Return AI insight records, most-recently generated first.

    Each AIInsight is joined with its parent Patient so that the
    patient's name and age are available without a second query.
    The frontend AI Insights page displays patient name and age
    alongside each insight card.

    Returns
    -------
    A list of AIInsight ORM objects with .patient pre-loaded.
    """
    return (
        db.query(AIInsight)
        .options(joinedload(AIInsight.patient))     # pre-load patient data
        .order_by(AIInsight.generated_at.desc())    # newest insight first
        .offset(skip)
        .limit(limit)
        .all()
    )
