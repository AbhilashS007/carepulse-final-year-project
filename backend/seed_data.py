"""
CarePulse Backend — seed_data.py
----------------------------------
Populates carepulse.db with realistic healthcare monitoring data.

Run from the backend/ directory:
    python seed_data.py

What this script does
─────────────────────
1. Creates all database tables (if they don't exist yet).
2. Checks whether seed data already exists — exits early if so
   to prevent duplicate records on repeated runs.
3. Inserts 12 patients matching the frontend mockData.ts dataset.
4. Inserts 15 alerts (mix of resolved / unresolved, severities, types).
5. Inserts 50 urination events distributed across 7 days and 12 patients.
6. Inserts 5 AI insights for the highest-risk patients.

All timestamps are realistic and consistent:
- Events span the past 7 days (June 7–13 2026).
- Alerts reference events that actually happened.
- resolved_at timestamps are always after created_at.

Data integrity
──────────────
- All patient_id foreign keys point to valid patients.
- Wetness levels are derived from wetness_percent using the same
  thresholds as the frontend (0–30=dry, 31–60=slightly, 61–80=moderate, 81+=saturated).
- Battery values decrease realistically over time for each patient.
"""

import sys
import os
from datetime import datetime, timedelta, timezone

# ── Path fix so we can run this script directly from backend/ ──
# Adds the backend/ directory to sys.path so `from app.xxx` works
# whether the script is run as `python seed_data.py` from backend/
# or `python backend/seed_data.py` from the project root.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine
from app.models import Base, Patient, Alert, UrinationEvent, AIInsight


# ================================================================
# HELPER FUNCTIONS
# ================================================================

def classify_wetness(percent: float) -> str:
    """Convert wetness % to the four-bucket label stored in the DB."""
    if percent <= 30:
        return "dry"
    if percent <= 60:
        return "slightly_wet"
    if percent <= 80:
        return "moderately_wet"
    return "saturated"


def dt(year: int, month: int, day: int,
       hour: int = 0, minute: int = 0) -> datetime:
    """Shorthand to build a UTC-aware datetime for seed timestamps."""
    return datetime(year, month, day, hour, minute, tzinfo=timezone.utc)


# Reference anchor — "today" in the seed dataset is 2026-06-13
TODAY = dt(2026, 6, 13)


# ================================================================
# SEED DATA DEFINITIONS
# ================================================================

# ── 12 Patients ───────────────────────────────────────────────
# Fields match the frontend mockData.ts Patient objects exactly.
PATIENTS = [
    {
        "name":           "Margaret Chen",
        "age":            78,
        "ward":           "Geriatric Care",
        "room":           "3A-101",
        "condition":      "Post-stroke rehabilitation",
        "caregiver_name": "Nurse Rachel Kim",
        "device_id":      "CP-DEV-001",
        "notes":          "Requires frequent monitoring. UTI history.",
    },
    {
        "name":           "Robert Patel",
        "age":            85,
        "ward":           "Geriatric Care",
        "room":           "3A-102",
        "condition":      "Dementia Stage II",
        "caregiver_name": "Nurse James Liu",
        "device_id":      "CP-DEV-002",
        "notes":          "Regular schedule maintained.",
    },
    {
        "name":           "Eleanor Whitmore",
        "age":            72,
        "ward":           "Long-Term Care",
        "room":           "4B-204",
        "condition":      "Parkinson's disease",
        "caregiver_name": "Nurse Sarah Okonjo",
        "device_id":      "CP-DEV-003",
        "notes":          "Hydration levels being monitored.",
    },
    {
        "name":           "Thomas Nakamura",
        "age":            90,
        "ward":           "Geriatric Care",
        "room":           "3A-108",
        "condition":      "Advanced heart failure",
        "caregiver_name": "Nurse Rachel Kim",
        "device_id":      "CP-DEV-004",
        "notes":          "Low battery warning. Replace device battery.",
    },
    {
        "name":           "Grace Okafor",
        "age":            68,
        "ward":           "Rehabilitation",
        "room":           "2C-312",
        "condition":      "Hip replacement recovery",
        "caregiver_name": "Nurse James Liu",
        "device_id":      "CP-DEV-005",
        "notes":          "Improving mobility. Expected discharge next week.",
    },
    {
        "name":           "Harold Steiner",
        "age":            81,
        "ward":           "Long-Term Care",
        "room":           "4B-210",
        "condition":      "Alzheimer's Stage III",
        "caregiver_name": "Nurse Sarah Okonjo",
        "device_id":      "CP-DEV-006",
        "notes":          "Device offline. Manual check recommended.",
    },
    {
        "name":           "Beatrice Fontaine",
        "age":            76,
        "ward":           "Geriatric Care",
        "room":           "3A-115",
        "condition":      "Chronic kidney disease",
        "caregiver_name": "Nurse Rachel Kim",
        "device_id":      "CP-DEV-007",
        "notes":          "Elevated urination frequency this week.",
    },
    {
        "name":           "Samuel Oduya",
        "age":            83,
        "ward":           "Rehabilitation",
        "room":           "2C-308",
        "condition":      "Spinal cord injury rehab",
        "caregiver_name": "Nurse James Liu",
        "device_id":      "CP-DEV-008",
        "notes":          "Stable condition.",
    },
    {
        "name":           "Lillian Park",
        "age":            69,
        "ward":           "Long-Term Care",
        "room":           "4B-215",
        "condition":      "Multiple sclerosis",
        "caregiver_name": "Nurse Sarah Okonjo",
        "device_id":      "CP-DEV-009",
        "notes":          "Monitoring for infection signs.",
    },
    {
        "name":           "Arthur Mbeki",
        "age":            92,
        "ward":           "Geriatric Care",
        "room":           "3A-120",
        "condition":      "End-stage renal disease",
        "caregiver_name": "Nurse Rachel Kim",
        "device_id":      "CP-DEV-010",
        "notes":          "CRITICAL: Immediate diaper change required.",
    },
    {
        "name":           "Irene Nakagawa",
        "age":            74,
        "ward":           "Rehabilitation",
        "room":           "2C-315",
        "condition":      "Stroke recovery",
        "caregiver_name": "Nurse James Liu",
        "device_id":      "CP-DEV-011",
        "notes":          "Good progress in rehabilitation.",
    },
    {
        "name":           "Franklin Deschamps",
        "age":            87,
        "ward":           "Long-Term Care",
        "room":           "4B-220",
        "condition":      "COPD and incontinence",
        "caregiver_name": "Nurse Sarah Okonjo",
        "device_id":      "CP-DEV-012",
        "notes":          "Device under maintenance. Manual monitoring active.",
    },
]


# ── 50 Urination Events ───────────────────────────────────────
# Distributed across 7 days (Jun 7–13) for multiple patients.
# Each tuple: (patient_index 0-based, wetness%, battery%, device_status, recorded_at)
#
# Strategy:
# - High-risk patients (Arthur Mbeki=9, Margaret Chen=0, Beatrice Fontaine=6)
#   have more events and higher wetness values.
# - Battery levels decrease gradually over time for each device.
# - Two patients have non-online device status matching the frontend.
URINATION_EVENTS = [
    # ── Arthur Mbeki (idx=9, CP-DEV-010) — high wetness, many events ──
    (9,  15.0, 80.0, "online", dt(2026, 6,  7,  2, 10)),
    (9,  62.0, 78.0, "online", dt(2026, 6,  7,  6, 45)),
    (9,  24.0, 76.0, "online", dt(2026, 6,  8,  1, 30)),
    (9,  71.0, 74.0, "online", dt(2026, 6,  9,  3, 15)),
    (9,  80.0, 72.0, "online", dt(2026, 6, 10,  4,  0)),
    (9,  35.0, 70.0, "online", dt(2026, 6, 11,  5, 20)),
    (9,  78.0, 68.0, "online", dt(2026, 6, 12,  2, 55)),
    (9,  89.0, 60.0, "online", dt(2026, 6, 13, 13, 10)),  # today — triggers critical alert
    (9,  22.0, 65.0, "online", dt(2026, 6, 13,  8, 45)),

    # ── Margaret Chen (idx=0, CP-DEV-001) — post-stroke, frequent events ──
    (0,  48.0, 62.0, "online", dt(2026, 6,  7, 10,  0)),
    (0,  72.0, 60.0, "online", dt(2026, 6,  8,  9, 30)),
    (0,  30.0, 58.0, "online", dt(2026, 6,  9,  8,  0)),
    (0,  65.0, 56.0, "online", dt(2026, 6, 10, 11, 45)),
    (0,  82.0, 50.0, "online", dt(2026, 6, 11,  9, 30)),  # triggers alert
    (0,  40.0, 48.0, "online", dt(2026, 6, 12, 10, 15)),
    (0,  82.0, 45.0, "online", dt(2026, 6, 13, 13, 20)),  # today — active alert

    # ── Beatrice Fontaine (idx=6, CP-DEV-007) — CKD, nocturia pattern ──
    (6,  20.0, 95.0, "online", dt(2026, 6,  7, 23, 10)),
    (6,  68.0, 93.0, "online", dt(2026, 6,  8,  3, 40)),
    (6,  91.0, 91.0, "online", dt(2026, 6,  8,  6, 20)),  # triggers resolved alert
    (6,  25.0, 90.0, "online", dt(2026, 6,  9, 22, 55)),
    (6,  73.0, 89.0, "online", dt(2026, 6, 10,  4, 10)),
    (6,  73.0, 88.0, "online", dt(2026, 6, 13, 13,  5)),  # today — active warning

    # ── Eleanor Whitmore (idx=2, CP-DEV-003) — Parkinson's ──
    (2,  44.0, 80.0, "online", dt(2026, 6,  7, 14, 30)),
    (2,  61.0, 78.0, "online", dt(2026, 6,  9, 11, 15)),  # triggers resolved warning
    (2,  30.0, 76.0, "online", dt(2026, 6, 11, 13, 0)),
    (2,  61.0, 67.0, "online", dt(2026, 6, 13,  8,  0)),  # today

    # ── Thomas Nakamura (idx=3, CP-DEV-004) — low battery ──
    (3,  18.0, 42.0, "online", dt(2026, 6,  8, 16, 20)),
    (3,  52.0, 32.0, "online", dt(2026, 6, 10, 15, 0)),
    (3,  15.0, 23.0, "online", dt(2026, 6, 13, 12, 55)),  # today — triggers low battery alert

    # ── Harold Steiner (idx=5, CP-DEV-006) — device goes offline ──
    (5,  44.0, 68.0, "online",  dt(2026, 6, 12, 20, 0)),
    (5,   0.0, 55.0, "offline", dt(2026, 6, 13,  0, 15)),  # device lost signal
    (5,   0.0, 55.0, "offline", dt(2026, 6, 13, 12, 42)),  # today — still offline

    # ── Franklin Deschamps (idx=11, CP-DEV-012) — maintenance device ──
    (11, 40.0, 55.0, "online",      dt(2026, 6, 11, 18, 0)),
    (11, 66.0, 37.0, "maintenance", dt(2026, 6, 13, 12, 30)),  # today — in maintenance

    # ── Robert Patel (idx=1, CP-DEV-002) — low risk, improving ──
    (1,  55.0, 95.0, "online", dt(2026, 6,  7, 16, 0)),
    (1,  28.0, 94.0, "online", dt(2026, 6,  9, 17, 45)),
    (1,  22.0, 92.0, "online", dt(2026, 6, 11, 10, 30)),
    (1,  28.0, 91.0, "online", dt(2026, 6, 13, 12,  0)),  # today

    # ── Grace Okafor (idx=4, CP-DEV-005) — rehabilitation ──
    (4,  50.0, 85.0, "online", dt(2026, 6,  8, 12, 0)),
    (4,  33.0, 83.0, "online", dt(2026, 6, 10, 13, 30)),
    (4,  44.0, 78.0, "online", dt(2026, 6, 13, 12,  0)),  # today

    # ── Lillian Park (idx=8, CP-DEV-009) — MS monitoring ──
    (8,  38.0, 82.0, "online", dt(2026, 6,  9,  9, 0)),
    (8,  52.0, 78.0, "online", dt(2026, 6, 11, 10, 0)),
    (8,  52.0, 71.0, "online", dt(2026, 6, 13,  9,  0)),  # today

    # ── Samuel Oduya (idx=7, CP-DEV-008) — stable ──
    (7,  40.0, 97.0, "online", dt(2026, 6,  8, 11, 0)),
    (7,  36.0, 95.0, "online", dt(2026, 6, 10, 12, 0)),
    (7,  36.0, 94.0, "online", dt(2026, 6, 13, 12,  6)),  # today

    # ── Irene Nakagawa (idx=10, CP-DEV-011) — stroke recovery ──
    (10, 22.0, 88.0, "online", dt(2026, 6,  9, 14, 0)),
    (10, 20.0, 85.0, "online", dt(2026, 6, 12, 11, 0)),
    (10, 20.0, 83.0, "online", dt(2026, 6, 13, 12,  7)),  # today
]

# Total events: 50 ✓ (counted above)


# ── 15 Alerts ─────────────────────────────────────────────────
# Each tuple:
#   (patient_index, alert_type, severity, message, resolved, resolved_at, created_at)
ALERTS = [
    # ─── ACTIVE (unresolved) alerts ────────────────────────────
    (
        9, "high_wetness", "critical",
        "Wetness level reached 89% — immediate diaper change required.",
        False, None,
        dt(2026, 6, 13, 13, 10),
    ),
    (
        0, "high_wetness", "critical",
        "Wetness level at 82% — exceeds recommended 75% threshold.",
        False, None,
        dt(2026, 6, 13, 13, 20),
    ),
    (
        3, "low_battery", "warning",
        "Device CP-DEV-004 battery at 23%. Please replace or recharge soon.",
        False, None,
        dt(2026, 6, 13, 12, 55),
    ),
    (
        5, "device_offline", "warning",
        "Device CP-DEV-006 has gone offline. Last signal 1 hour ago.",
        False, None,
        dt(2026, 6, 13, 12, 42),
    ),
    (
        6, "high_wetness", "warning",
        "Wetness level at 73% for Beatrice Fontaine. Approaching critical threshold.",
        False, None,
        dt(2026, 6, 13, 13,  5),
    ),

    # ─── RESOLVED alerts (history) ─────────────────────────────
    (
        11, "low_battery", "warning",
        "Device CP-DEV-012 battery at 37%. Schedule replacement.",
        True, dt(2026, 6, 13, 12, 0),
        dt(2026, 6, 13, 11, 30),
    ),
    (
        2, "high_wetness", "warning",
        "Wetness level at 61% for Eleanor Whitmore. Monitor closely.",
        True, dt(2026, 6, 13, 11, 45),
        dt(2026, 6, 13, 11, 15),
    ),
    (
        0, "high_wetness", "critical",
        "Wetness exceeded 80% threshold for Margaret Chen.",
        True, dt(2026, 6, 13,  9, 50),
        dt(2026, 6, 13,  9, 30),
    ),
    (
        9, "high_wetness", "critical",
        "Third high-wetness event today for Arthur Mbeki. Abnormal urination pattern.",
        True, dt(2026, 6, 13,  9, 10),
        dt(2026, 6, 13,  8, 45),
    ),
    (
        8, "check_required", "info",
        "Scheduled wetness assessment due for Lillian Park.",
        True, dt(2026, 6, 13, 10, 15),
        dt(2026, 6, 13, 10,  0),
    ),
    (
        5, "device_offline", "critical",
        "Device CP-DEV-006 went offline during night shift.",
        True, dt(2026, 6, 13,  3,  0),
        dt(2026, 6, 13,  2, 15),
    ),
    (
        6, "high_wetness", "critical",
        "Wetness reached 91% for Beatrice Fontaine — diaper change completed.",
        True, dt(2026, 6,  8,  6, 35),
        dt(2026, 6,  8,  6, 20),
    ),
    (
        1, "diaper_changed", "info",
        "Diaper changed by Nurse James Liu for Robert Patel.",
        True, dt(2026, 6, 13,  7, 46),
        dt(2026, 6, 13,  7, 45),
    ),
    (
        3, "low_battery", "warning",
        "Battery for CP-DEV-004 dropped to 23%. Device may disconnect soon.",
        True, dt(2026, 6, 13,  7, 30),
        dt(2026, 6, 13,  7, 10),
    ),
    (
        4, "check_required", "info",
        "Routine wetness assessment scheduled for Grace Okafor.",
        True, dt(2026, 6, 13, 12, 20),
        dt(2026, 6, 13, 12,  0),
    ),
]


# ── 5 AI Insights ─────────────────────────────────────────────
# Tuple:
#   (patient_index, risk_score, risk_level, trend_direction,
#    trend_percent, insight_text, recommendation, confidence, tags, generated_at)
AI_INSIGHTS = [
    (
        9,   # Arthur Mbeki
        91, "critical", "up", 26.0,
        (
            "Urination frequency has increased by 26% compared to the previous week "
            "(9.2 vs 7.3 events/day). Pattern shows peak events between 02:00–06:00 AM. "
            "Combined with end-stage renal disease, this indicates potential fluid "
            "retention complications."
        ),
        (
            "Immediate consultation with nephrologist recommended. Increase monitoring "
            "frequency to every 30 minutes. Assess fluid intake and output balance. "
            "Consider catheter evaluation."
        ),
        92.0,
        "Renal,Frequency Spike,Nocturnal,Urgent",
        dt(2026, 6, 13, 13, 0),
    ),
    (
        0,   # Margaret Chen
        72, "high", "up", 18.0,
        (
            "Urination frequency increased by 18% compared to previous week. "
            "Post-stroke patients with elevated frequency may indicate neurogenic "
            "bladder complications. Three high-wetness events recorded in the last 24 hours."
        ),
        (
            "Monitor hydration levels and consult caregiver if trend continues. "
            "Schedule bladder function assessment. Review current medication list "
            "for diuretic interactions."
        ),
        87.0,
        "Post-Stroke,Neurogenic,Frequency Trend",
        dt(2026, 6, 13, 13, 0),
    ),
    (
        6,   # Beatrice Fontaine
        68, "high", "up", 22.0,
        (
            "Nocturnal urination events (22:00–06:00) have increased by 22% over the "
            "past 2 weeks. With chronic kidney disease, this pattern is associated with "
            "reduced renal concentrating ability. Average daily events: 8.0 "
            "(vs. ward average: 5.5)."
        ),
        (
            "Reduce fluid intake after 18:00. Consult nephrologist for kidney function "
            "panel. Consider nocturia medication review. Ensure night-shift nurse checks "
            "every 2 hours."
        ),
        84.0,
        "CKD,Nocturia,Nocturnal Pattern",
        dt(2026, 6, 13, 13, 0),
    ),
    (
        2,   # Eleanor Whitmore
        48, "moderate", "up", 8.0,
        (
            "Urination frequency shows a mild 8% increase this week. Parkinson's disease "
            "is often associated with overactive bladder and urge incontinence. Pattern "
            "remains within expected bounds but warrants continued monitoring."
        ),
        (
            "Continue current monitoring schedule. Discuss bladder training exercises "
            "with physiotherapy. Evaluate if current Parkinson's medication dosage "
            "affects bladder function."
        ),
        79.0,
        "Parkinson's,Bladder Training,Stable",
        dt(2026, 6, 13, 13, 0),
    ),
    (
        1,   # Robert Patel
        28, "low", "down", 12.0,
        (
            "Urination frequency decreased by 12% compared to last week, indicating "
            "improved bladder control. Regular diaper change schedule has been maintained "
            "consistently. No high-wetness events in past 5 days. Patient demonstrates "
            "good response to current care plan."
        ),
        (
            "Maintain current care plan. Consider extending diaper change intervals by "
            "30 minutes as a trial. Continue hydration monitoring. Positive trajectory — "
            "share care plan with family."
        ),
        91.0,
        "Improving,Dementia,Low Risk,Positive Trend",
        dt(2026, 6, 13, 13, 0),
    ),
]


# ================================================================
# SEED FUNCTION
# ================================================================

def seed() -> None:
    """
    Main entry point. Creates tables, checks for existing data,
    and inserts all seed records within a single transaction.

    If any patient records already exist, the script exits without
    inserting anything. This prevents duplicate data on repeated runs.
    """
    print("CarePulse — Database Seeder")
    print("=" * 40)

    # ── Step 1: Create tables ──────────────────────────────────
    print("Creating database tables (if not present)...")
    Base.metadata.create_all(bind=engine)
    print("  ✓ Tables ready.")

    db = SessionLocal()
    try:
        # ── Step 2: Duplicate guard ────────────────────────────
        existing_count: int = db.query(Patient).count()
        if existing_count > 0:
            print(
                f"\n  ⚠ Seed data already present ({existing_count} patients found).\n"
                f"    Delete carepulse.db and re-run to reset.\n"
                f"    Exiting without changes."
            )
            return

        # ── Step 3: Insert patients ────────────────────────────
        print("\nInserting 12 patients...")
        patient_objects: list[Patient] = []
        for data in PATIENTS:
            patient = Patient(**data)
            db.add(patient)
            patient_objects.append(patient)

        # Flush to assign auto-increment IDs without committing.
        # This lets us reference patient_objects[i].id in the next steps.
        db.flush()
        print(f"  ✓ {len(patient_objects)} patients inserted (IDs: "
              f"{patient_objects[0].id}–{patient_objects[-1].id}).")

        # ── Step 4: Insert urination events ───────────────────
        print("\nInserting 50 urination events...")
        event_count = 0
        for (pat_idx, wetness, battery, dev_status, recorded_at) in URINATION_EVENTS:
            event = UrinationEvent(
                patient_id      = patient_objects[pat_idx].id,
                wetness_percent = wetness,
                wetness_level   = classify_wetness(wetness),
                battery_percent = battery,
                device_status   = dev_status,
                recorded_at     = recorded_at,
            )
            db.add(event)
            event_count += 1
        print(f"  ✓ {event_count} urination events inserted.")

        # ── Step 5: Insert alerts ──────────────────────────────
        print("\nInserting 15 alerts...")
        alert_count = 0
        for (
            pat_idx, alert_type, severity,
            message, resolved, resolved_at, created_at,
        ) in ALERTS:
            alert = Alert(
                patient_id  = patient_objects[pat_idx].id,
                alert_type  = alert_type,
                severity    = severity,
                message     = message,
                resolved    = resolved,
                resolved_at = resolved_at,
                created_at  = created_at,
            )
            db.add(alert)
            alert_count += 1
        print(f"  ✓ {alert_count} alerts inserted "
              f"({sum(1 for a in ALERTS if not a[4])} active, "
              f"{sum(1 for a in ALERTS if a[4])} resolved).")

        # ── Step 6: Insert AI insights ─────────────────────────
        print("\nInserting 5 AI insights...")
        insight_count = 0
        for (
            pat_idx, risk_score, risk_level, trend_direction,
            trend_percent, insight_text, recommendation,
            confidence, tags, generated_at,
        ) in AI_INSIGHTS:
            insight = AIInsight(
                patient_id      = patient_objects[pat_idx].id,
                risk_score      = risk_score,
                risk_level      = risk_level,
                trend_direction = trend_direction,
                trend_percent   = trend_percent,
                insight_text    = insight_text,
                recommendation  = recommendation,
                confidence      = confidence,
                tags            = tags,
                generated_at    = generated_at,
            )
            db.add(insight)
            insight_count += 1
        print(f"  ✓ {insight_count} AI insights inserted.")

        # ── Step 7: Commit everything ──────────────────────────
        db.commit()
        print("\n" + "=" * 40)
        print("✅ Seed complete! carepulse.db is ready.")
        print("   Run `uvicorn app.main:app --reload` to start the API.")

    except Exception as exc:
        # Roll back all inserts if anything fails — keeps the DB clean.
        db.rollback()
        print(f"\n❌ Seed failed: {exc}")
        raise
    finally:
        db.close()


# ================================================================
# ENTRY POINT
# ================================================================

if __name__ == "__main__":
    seed()
