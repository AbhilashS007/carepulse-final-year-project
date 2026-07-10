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
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import AIInsight, Alert, Patient, Telemetry, UrinationEvent
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
            selectinload(Patient.alerts),
            selectinload(Patient.urination_events),
            selectinload(Patient.ai_insights),
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
    import uuid
    if patient_data.device_id == "unassigned":
        patient_data.device_id = f"unassigned_{uuid.uuid4().hex[:8]}"
        
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

    # Clean the DB's device_id for comparison
    db_device_id_clean = patient.device_id
    if db_device_id_clean.startswith("archived_"):
        parts = db_device_id_clean.split("_", 2)
        if len(parts) == 3:
            db_device_id_clean = parts[2]
    elif db_device_id_clean.startswith("unassigned_"):
        db_device_id_clean = "unassigned"

    # Only check uniqueness if the device_id is actually changing
    if patient_data.device_id != db_device_id_clean:
        import uuid
        if patient_data.device_id == "unassigned":
            patient_data.device_id = f"unassigned_{uuid.uuid4().hex[:8]}"
        elif patient.is_archived:
            patient_data.device_id = f"archived_{patient.id}_{patient_data.device_id}"
            
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
    else:
        # Don't overwrite with the "clean" one if it didn't actually change
        patient_data.device_id = patient.device_id

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
    Frees up the device_id for reassignment by prefixing it.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        return None

    if not patient.device_id.startswith("archived_"):
        patient.device_id = f"archived_{patient.id}_{patient.device_id}"

    patient.is_archived = True
    db.commit()
    return get_patient_by_id(db, patient_id)


def unarchive_patient(db: Session, patient_id: int) -> Optional[Patient]:
    """
    Restore a soft-archived patient by setting is_archived = False.
    Attempts to restore the original device_id if it's not currently in use.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        return None

    if patient.device_id.startswith("archived_"):
        parts = patient.device_id.split("_", 2)
        if len(parts) == 3:
            orig_device = parts[2]
            conflict = db.query(Patient).filter(Patient.device_id == orig_device).first()
            if conflict:
                patient.device_id = f"unassigned_{patient.id}"
            else:
                patient.device_id = orig_device
                
    patient.is_archived = False
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

    # ── 3. Connected devices (from telemetry freshness) ──────────
    device_statuses = get_all_device_statuses(db, threshold_seconds=30)
    connected_devices = device_statuses["connected_devices"]

    # ── 5. Wetness distribution ────────────────────────────────
    wetness_counts: dict[str, int] = {
        "dry": 0, "slightly_wet": 0, "moderately_wet": 0, "saturated": 0
    }
    for event in latest_events:
        bucket = event.wetness_level
        if bucket in wetness_counts:
            wetness_counts[bucket] += 1

    # ── 6. Device health distribution (from telemetry freshness) ──
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
        # Device health (from telemetry freshness)
        "devices_online":       device_statuses["devices_online"],
        "devices_offline":      device_statuses["devices_offline"],
        "devices_maintenance":  0,
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


# ================================================================
# TELEMETRY (Phase 4B)
# ================================================================

def create_telemetry(
    db: Session,
    telemetry_data: "schemas.TelemetryCreate",
) -> Telemetry:
    """
    Insert a new telemetry reading from the ESP32 device.

    All fields from the validated schema are persisted, including
    optional IoT metadata (wifi_rssi, firmware_version, esp32_timestamp).
    Missing optional fields are stored as NULL.
    """
    telemetry = Telemetry(**telemetry_data.model_dump())
    db.add(telemetry)
    db.commit()
    db.refresh(telemetry)
    return telemetry


def get_latest_telemetry(db: Session) -> Optional[Telemetry]:
    """
    Return the single most-recent telemetry reading across all devices.

    Returns None if no telemetry has been recorded yet.
    """
    return (
        db.query(Telemetry)
        .order_by(Telemetry.created_at.desc())
        .first()
    )


def get_recent_telemetry(
    db: Session,
    limit: int = 100,
) -> list[Telemetry]:
    """
    Return the most recent telemetry readings, newest first.

    Parameters
    ----------
    limit : Maximum rows to return (default 100).
    """
    return (
        db.query(Telemetry)
        .order_by(Telemetry.created_at.desc())
        .limit(limit)
        .all()
    )


# ================================================================
# ANALYTICS — Computed Stats (Phase 4E)
# ================================================================

def get_analytics_stats(db: Session, days: int = 7) -> dict:
    """
    Compute aggregate analytics stats from real UrinationEvent data.

    Returns a dict with:
        avg_wetness       : float — average wetness_percent across all events
        avg_interval_hrs  : float — average hours between consecutive events
        shortest_interval : str   — e.g. "45 min" or "N/A"
        longest_interval  : str   — e.g. "4.2 hrs" or "N/A"
        peak_time         : str   — hour of day with most events, e.g. "03:00 AM"
        today_events      : int
        weekly_events     : int
        monthly_events    : int
        ward_average      : float — same as avg_interval_hrs (all patients)
        max_wetness       : float — peak wetness in window
        date_range_start  : str   — ISO date of window start
        date_range_end    : str   — ISO date of today
    """
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=days)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week_start = now - timedelta(days=7)
    month_start = now - timedelta(days=30)

    # All events in the window
    events: list[UrinationEvent] = (
        db.query(UrinationEvent)
        .filter(UrinationEvent.recorded_at >= since)
        .order_by(UrinationEvent.recorded_at.asc())
        .all()
    )

    if not events:
        return {
            "avg_wetness": 0.0,
            "avg_interval_hrs": 0.0,
            "shortest_interval": "N/A",
            "longest_interval": "N/A",
            "peak_time": "N/A",
            "today_events": 0,
            "weekly_events": 0,
            "monthly_events": 0,
            "ward_average": 0.0,
            "max_wetness": 0.0,
            "date_range_start": since.strftime("%Y-%m-%d"),
            "date_range_end": now.strftime("%Y-%m-%d"),
        }

    # Average and max wetness
    wetness_vals = [e.wetness_percent for e in events]
    avg_wetness = round(sum(wetness_vals) / len(wetness_vals), 1)
    max_wetness = round(max(wetness_vals), 1)

    # Intervals between consecutive events (per patient)
    from collections import defaultdict
    patient_events: dict[int, list[datetime]] = defaultdict(list)
    for e in events:
        ts = e.recorded_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        patient_events[e.patient_id].append(ts)

    intervals_hrs: list[float] = []
    for pid, timestamps in patient_events.items():
        timestamps.sort()
        for i in range(1, len(timestamps)):
            delta_h = (timestamps[i] - timestamps[i - 1]).total_seconds() / 3600
            if delta_h > 0.01:  # Ignore sub-minute gaps (same event)
                intervals_hrs.append(round(delta_h, 2))

    if intervals_hrs:
        avg_interval = round(sum(intervals_hrs) / len(intervals_hrs), 1)
        shortest = min(intervals_hrs)
        longest = max(intervals_hrs)
        shortest_str = f"{int(shortest * 60)} min" if shortest < 1 else f"{round(shortest, 1)} hrs"
        longest_str = f"{int(longest * 60)} min" if longest < 1 else f"{round(longest, 1)} hrs"
    else:
        avg_interval = 0.0
        shortest_str = "N/A"
        longest_str = "N/A"

    # Peak time — hour of day with most events
    from collections import Counter
    hour_counts: Counter = Counter()
    for e in events:
        ts = e.recorded_at
        if ts.tzinfo is None:
            ts = ts.replace(tzinfo=timezone.utc)
        hour_counts[ts.hour] += 1

    if hour_counts:
        peak_hour = hour_counts.most_common(1)[0][0]
        ampm = "AM" if peak_hour < 12 else "PM"
        display_hour = peak_hour if peak_hour <= 12 else peak_hour - 12
        if display_hour == 0:
            display_hour = 12
        peak_time = f"{display_hour:02d}:00 {ampm}"
    else:
        peak_time = "N/A"

    # Count events for today / week / month
    today_events = sum(
        1 for e in events
        if (e.recorded_at.replace(tzinfo=timezone.utc) if e.recorded_at.tzinfo is None else e.recorded_at) >= today_start
    )
    weekly_events = sum(
        1 for e in events
        if (e.recorded_at.replace(tzinfo=timezone.utc) if e.recorded_at.tzinfo is None else e.recorded_at) >= week_start
    )
    monthly_events = sum(
        1 for e in events
        if (e.recorded_at.replace(tzinfo=timezone.utc) if e.recorded_at.tzinfo is None else e.recorded_at) >= month_start
    )

    return {
        "avg_wetness": avg_wetness,
        "avg_interval_hrs": avg_interval,
        "shortest_interval": shortest_str,
        "longest_interval": longest_str,
        "peak_time": peak_time,
        "today_events": today_events,
        "weekly_events": weekly_events,
        "monthly_events": monthly_events,
        "ward_average": avg_interval,
        "max_wetness": max_wetness,
        "date_range_start": since.strftime("%Y-%m-%d"),
        "date_range_end": now.strftime("%Y-%m-%d"),
    }


# ================================================================
# DEVICE STATUS — Telemetry Freshness (Phase 4E)
# ================================================================

def get_device_status_for_patient(
    db: Session,
    device_id: str,
    threshold_seconds: int = 30,
) -> str:
    """
    Compute device ONLINE/OFFLINE status from telemetry freshness.

    If the last telemetry reading for this device_id was received
    within `threshold_seconds` of now, the device is ONLINE.
    Otherwise it is OFFLINE. If no telemetry exists, returns 'Never Connected'.
    """
    latest = (
        db.query(Telemetry)
        .filter(Telemetry.device_id == device_id)
        .order_by(Telemetry.created_at.desc())
        .first()
    )

    if latest is None:
        return "Never Connected"

    ts = latest.created_at
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    age_seconds = (datetime.now(timezone.utc) - ts).total_seconds()

    return "Online" if age_seconds <= threshold_seconds else "Offline"


def get_all_device_statuses(
    db: Session,
    threshold_seconds: int = 30,
) -> dict:
    """
    Compute ONLINE/OFFLINE counts for all devices from telemetry freshness.

    Returns dict with: devices_online, devices_offline, devices_never, connected_devices
    """
    # Get all active patients' device IDs
    patients = (
        db.query(Patient)
        .filter(Patient.is_archived == False)  # noqa: E712
        .all()
    )

    online = 0
    offline = 0
    never = 0

    for p in patients:
        status = get_device_status_for_patient(db, p.device_id, threshold_seconds)
        if status == "Online":
            online += 1
        elif status == "Offline":
            offline += 1
        else:
            never += 1

    return {
        "devices_online": online,
        "devices_offline": offline,
        "devices_never": never,
        "connected_devices": online,
    }


# ================================================================
# DIAPER CHANGE — Using Existing Architecture (Phase 4E)
# ================================================================

def perform_diaper_change(
    db: Session,
    patient_id: int,
    changed_by: str = "Caregiver",
    notes: Optional[str] = None,
) -> dict:
    """
    Record a diaper change using the existing alert system.

    Workflow:
    1. Resolve all active 'high_wetness' alerts for this patient.
    2. Create a 'diaper_changed' info alert as the change record.
    3. Return summary of what was done.

    Uses the existing Alert table — no new tables required.
    """
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if patient is None:
        return {"error": "Patient not found"}

    # 1. Resolve all active high_wetness alerts for this patient
    now = datetime.now(timezone.utc)
    active_wetness_alerts = (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient_id,
            Alert.alert_type == "high_wetness",
            Alert.resolved == False,  # noqa: E712
        )
        .all()
    )

    resolved_count = 0
    for alert in active_wetness_alerts:
        alert.resolved = True
        alert.resolved_at = now
        resolved_count += 1

    # 2. Create a diaper_changed info alert as the change record
    diaper_alert = Alert(
        patient_id=patient_id,
        alert_type="diaper_changed",
        severity="info",
        message=f"Diaper changed by {changed_by}." + (f" Notes: {notes}" if notes else ""),
        resolved=True,
        resolved_at=now,
    )
    db.add(diaper_alert)
    db.commit()

    return {
        "success": True,
        "patient_id": patient_id,
        "resolved_alerts": resolved_count,
        "diaper_change_alert_id": diaper_alert.id,
        "changed_at": now.isoformat(),
        "changed_by": changed_by,
    }


def get_last_diaper_change(db: Session, patient_id: int) -> Optional[datetime]:
    """
    Return the timestamp of the most recent diaper change for a patient.

    Looks for the latest 'diaper_changed' alert record.
    Returns None if no diaper change has been recorded.
    """
    latest = (
        db.query(Alert)
        .filter(
            Alert.patient_id == patient_id,
            Alert.alert_type == "diaper_changed",
        )
        .order_by(Alert.created_at.desc())
        .first()
    )

    return latest.created_at if latest else None


