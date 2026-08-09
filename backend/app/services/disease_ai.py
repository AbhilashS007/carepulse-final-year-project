"""
CarePulse Backend — disease_ai.py
-----------------------------------
Phase 2 Level 3: Disease + Telemetry + Alerts AI Engine.

Generates disease-specific clinical intelligence using rule-based logic
that analyses real UrinationEvent telemetry, Alert history, diagnosis
duration, computed trends, and data-driven confidence scores.

Engine identifier: "rule_engine"
"""

from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date, timedelta, timezone
import math

from app.models import Patient, AIInsight, Alert, UrinationEvent
from app.schemas import AIInsightCreate
from app import crud


# ================================================================
# TASK 1 — REAL TELEMETRY ANALYSIS
# ================================================================

def analyze_telemetry(db: Session, patient_id: int, days: int = 7) -> Dict[str, Any]:
    """
    Query UrinationEvent records for the last `days` days and compute
    real telemetry metrics.

    Returns a dict with:
        event_count_7d      : int   — total events in window
        avg_wetness         : float — mean wetness_percent
        max_wetness         : float — peak wetness_percent
        avg_daily_frequency : float — events per day
        latest_battery      : float — most recent battery_percent (or None)
        wetness_readings    : list  — chronological (recorded_at, wetness_percent) tuples
        latest_event_age_h  : float — hours since most recent event (or None)
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    events: List[UrinationEvent] = (
        db.query(UrinationEvent)
        .filter(
            UrinationEvent.patient_id == patient_id,
            UrinationEvent.recorded_at >= since,
        )
        .order_by(UrinationEvent.recorded_at.asc())
        .all()
    )

    if not events:
        return {
            "event_count_7d": 0,
            "avg_wetness": 0.0,
            "max_wetness": 0.0,
            "avg_daily_frequency": 0.0,
            "latest_battery": None,
            "wetness_readings": [],
            "latest_event_age_h": None,
        }

    wetness_values = [e.wetness_percent for e in events]
    avg_wetness = sum(wetness_values) / len(wetness_values)
    max_wetness = max(wetness_values)

    # Count distinct days with events to compute daily frequency
    distinct_days = len(set(
        e.recorded_at.date() if hasattr(e.recorded_at, 'date') else e.recorded_at
        for e in events
    ))
    avg_daily_frequency = len(events) / max(distinct_days, 1)

    # Latest battery reading
    latest_event = events[-1]
    latest_battery = latest_event.battery_percent

    # Hours since latest event
    latest_ts = latest_event.recorded_at
    if latest_ts.tzinfo is None:
        latest_ts = latest_ts.replace(tzinfo=timezone.utc)
    latest_event_age_h = (datetime.now(timezone.utc) - latest_ts).total_seconds() / 3600

    # Chronological wetness readings for trend computation
    wetness_readings = [
        (e.recorded_at, e.wetness_percent) for e in events
    ]

    return {
        "event_count_7d": len(events),
        "avg_wetness": round(avg_wetness, 1),
        "max_wetness": round(max_wetness, 1),
        "avg_daily_frequency": round(avg_daily_frequency, 1),
        "latest_battery": round(latest_battery, 1) if latest_battery is not None else None,
        "wetness_readings": wetness_readings,
        "latest_event_age_h": round(latest_event_age_h, 1) if latest_event_age_h is not None else None,
    }


# ================================================================
# TASK 2 — ALERT ANALYSIS
# ================================================================

def analyze_alerts(db: Session, patient_id: int, days: int = 7) -> Dict[str, Any]:
    """
    Query Alert records for the given patient and compute alert metrics.

    Returns a dict with:
        active_count          : int  — currently unresolved alerts
        critical_active       : int  — unresolved critical-severity alerts
        total_7d              : int  — total alerts created in the last `days` days
        critical_7d           : int  — critical alerts in the last `days` days
        severity_distribution : dict — {"critical": n, "warning": n, "info": n}
    """
    since = datetime.now(timezone.utc) - timedelta(days=days)

    all_patient_alerts: List[Alert] = (
        db.query(Alert)
        .filter(Alert.patient_id == patient_id)
        .all()
    )

    active_alerts = [a for a in all_patient_alerts if not a.resolved]
    critical_active = sum(1 for a in active_alerts if a.severity == "critical")

    recent_alerts = [
        a for a in all_patient_alerts
        if a.created_at and a.created_at >= since.replace(tzinfo=None)
    ]
    # Also try with timezone-aware comparison
    if not recent_alerts:
        recent_alerts = [
            a for a in all_patient_alerts
            if a.created_at and (
                (a.created_at.replace(tzinfo=timezone.utc) if a.created_at.tzinfo is None else a.created_at)
                >= since
            )
        ]

    critical_7d = sum(1 for a in recent_alerts if a.severity == "critical")

    severity_dist = {"critical": 0, "warning": 0, "info": 0}
    for a in recent_alerts:
        sev = a.severity if a.severity in severity_dist else "info"
        severity_dist[sev] += 1

    return {
        "active_count": len(active_alerts),
        "critical_active": critical_active,
        "total_7d": len(recent_alerts),
        "critical_7d": critical_7d,
        "severity_distribution": severity_dist,
    }


# ================================================================
# TASK 3 — DIAGNOSIS DURATION
# ================================================================

def compute_diagnosis_duration(patient: Patient) -> Optional[int]:
    """
    Compute the number of days since the patient's diagnosis_date.
    Returns None if diagnosis_date is not set.
    """
    if not patient.diagnosis_date:
        return None

    diag = patient.diagnosis_date
    if isinstance(diag, str):
        diag = date.fromisoformat(diag)

    today = date.today()
    delta = today - diag
    return max(delta.days, 0)


# ================================================================
# TASK 4 — REAL TREND DETECTION
# ================================================================

def compute_trend(
    telemetry: Dict[str, Any],
    alerts: Dict[str, Any],
) -> tuple:
    """
    Compute whether the patient is improving, stable, or deteriorating
    by comparing the first half vs second half of the 7-day telemetry window.

    Returns (direction: str, percent: float)
        direction: "up" (deteriorating) | "down" (improving) | "stable"
        percent:   absolute percentage change
    """
    readings = telemetry.get("wetness_readings", [])

    if len(readings) < 2:
        # Not enough data — default to stable with 0%
        return ("stable", 0.0)

    # Split into first-half and second-half chronologically
    midpoint = len(readings) // 2
    first_half = readings[:midpoint]
    second_half = readings[midpoint:]

    # Average wetness per half
    avg_first = sum(r[1] for r in first_half) / len(first_half)
    avg_second = sum(r[1] for r in second_half) / len(second_half)

    # Wetness change percentage
    if avg_first > 0:
        wetness_change_pct = ((avg_second - avg_first) / avg_first) * 100
    else:
        wetness_change_pct = 0.0 if avg_second == 0 else 100.0

    # Frequency change: count events per half, normalise to per-day
    # Estimate days span for each half
    def days_span(half):
        if len(half) < 2:
            return 1
        first_ts = half[0][0]
        last_ts = half[-1][0]
        if hasattr(first_ts, 'timestamp'):
            delta = (last_ts - first_ts).total_seconds() / 86400
        else:
            delta = 1
        return max(delta, 1)

    freq_first = len(first_half) / days_span(first_half)
    freq_second = len(second_half) / days_span(second_half)

    if freq_first > 0:
        freq_change_pct = ((freq_second - freq_first) / freq_first) * 100
    else:
        freq_change_pct = 0.0 if freq_second == 0 else 100.0

    # Weighted combined delta: 60% wetness, 40% frequency
    combined_delta = (wetness_change_pct * 0.6) + (freq_change_pct * 0.4)

    # Alert frequency bonus: if more recent alerts, push toward "up"
    alert_total = alerts.get("total_7d", 0)
    if alert_total >= 5:
        combined_delta += 5
    elif alert_total >= 3:
        combined_delta += 2

    # Determine direction
    if combined_delta > 10:
        direction = "up"
    elif combined_delta < -10:
        direction = "down"
    else:
        direction = "stable"

    trend_percent = round(min(abs(combined_delta), 100.0), 1)

    return (direction, trend_percent)


# ================================================================
# TASK 5 — DATA-DRIVEN CONFIDENCE SCORE
# ================================================================

def compute_confidence(telemetry: Dict[str, Any], alerts: Dict[str, Any]) -> float:
    """
    Compute AI insight confidence based on data quality and coverage.

    Formula:
        base                 = 50
        data_coverage_bonus  = min(event_count / 20, 1.0) × 25   (0–25)
        recency_bonus        = based on latest_event_age_h        (0–15)
        consistency_bonus    = based on wetness std deviation      (0–10)

    Returns a float in range [50, 99].
    """
    base = 50.0

    # Data coverage: more events = more confidence (max at 20 events)
    event_count = telemetry.get("event_count_7d", 0)
    data_coverage = min(event_count / 20.0, 1.0) * 25.0

    # Recency: more recent data = more confidence
    age_h = telemetry.get("latest_event_age_h")
    if age_h is not None:
        if age_h < 24:
            recency = 15.0
        elif age_h < 48:
            recency = 10.0
        elif age_h < 72:
            recency = 5.0
        else:
            recency = 0.0
    else:
        recency = 0.0

    # Consistency: lower std deviation in wetness = more predictable pattern
    readings = telemetry.get("wetness_readings", [])
    if len(readings) >= 3:
        values = [r[1] for r in readings]
        mean = sum(values) / len(values)
        variance = sum((v - mean) ** 2 for v in values) / len(values)
        std_dev = math.sqrt(variance)
        if std_dev < 20:
            consistency = 10.0
        elif std_dev < 30:
            consistency = 5.0
        else:
            consistency = 0.0
    else:
        consistency = 0.0

    confidence = base + data_coverage + recency + consistency
    return round(min(max(confidence, 50.0), 99.0), 1)


# ================================================================
# ENHANCED — COMPOSITE RISK CALCULATION
# ================================================================

def calculate_base_risk(
    patient: Patient,
    telemetry: Dict[str, Any],
    alerts: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Calculate composite risk score from real telemetry, alerts, and severity.

    Formula:
        telemetry_score (0–40):
            avg_wetness_norm  = (avg_wetness / 100) × 20
            max_wetness_norm  = (max_wetness / 100) × 10
            freq_norm         = min(avg_daily_freq / 10, 1.0) × 10

        alert_score (0–25):
            active_norm   = min(active_alerts × 5, 15)
            critical_norm = min(critical_active × 5, 10)

        severity_score (0–20):
            mild=0, moderate=5, severe=10, critical=20

        disease_base (0–15):
            From disease profile lookup
    """
    # ── Telemetry component (0–40) ──
    avg_w = telemetry.get("avg_wetness", 0.0)
    max_w = telemetry.get("max_wetness", 0.0)
    freq = telemetry.get("avg_daily_frequency", 0.0)

    avg_wetness_norm = (avg_w / 100.0) * 20.0
    max_wetness_norm = (max_w / 100.0) * 10.0
    freq_norm = min(freq / 10.0, 1.0) * 10.0

    telemetry_score = avg_wetness_norm + max_wetness_norm + freq_norm

    # ── Alert component (0–25) ──
    active = alerts.get("active_count", 0)
    critical = alerts.get("critical_active", 0)

    active_norm = min(active * 5, 15)
    critical_norm = min(critical * 5, 10)

    alert_score = active_norm + critical_norm

    # ── Severity component (0–20) ──
    severity_map = {
        "mild": 0,
        "moderate": 5,
        "severe": 10,
        "critical": 20,
    }
    severity_score = severity_map.get(patient.disease_severity or "", 0)

    # ── Disease base from profile (0–15) ──
    profile = get_disease_profile(patient.disease)
    disease_base = profile.get("base_risk", 5)

    # ── Composite ──
    raw_score = telemetry_score + alert_score + severity_score + disease_base
    score = int(min(100, max(0, round(raw_score))))

    # Classify risk level
    if score >= 80:
        risk_level = "critical"
    elif score >= 60:
        risk_level = "high"
    elif score >= 40:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return {
        "score": score,
        "level": risk_level,
        # Component breakdown for debugging / explanation
        "_telemetry_score": round(telemetry_score, 1),
        "_alert_score": round(alert_score, 1),
        "_severity_score": severity_score,
        "_disease_base": disease_base,
    }


# ================================================================
# DISEASE PROFILES — Extended with base_risk
# ================================================================

def get_disease_profile(disease: Optional[str]) -> Dict[str, Any]:
    """
    Return a disease-specific clinical profile.
    Each profile now includes a 'base_risk' weight (0–15) used in the
    composite risk formula.
    """
    disease = (disease or "").lower()

    if "kidney" in disease or "ckd" in disease or "renal" in disease:
        return {
            "insight": "Patients with this renal profile require careful monitoring for fluid retention and urination irregularities.",
            "risk_exp": "CKD patients are at high risk of acute kidney injury if hydration and output are not strictly balanced.",
            "rec": "Monitor fluid intake closely and report any sudden drops in urine output to the nephrologist.",
            "mon": "Measure output volume every 4 hours. Check for edema in lower extremities.",
            "tags": "Renal,Fluid Balance,CKD",
            "base_risk": 12,
        }
    elif "diabetes" in disease:
        return {
            "insight": "Diabetic profiles may present with increased frequency due to hyperglycemia or ketoacidosis.",
            "risk_exp": "Excessive urination can be an early indicator of hyperglycemia or ketoacidosis in diabetic patients.",
            "rec": "Verify current blood glucose levels and ensure the patient remains adequately hydrated.",
            "mon": "Check blood sugar according to schedule. Monitor for signs of dehydration (dry mouth, confusion).",
            "tags": "Endocrine,Hyperglycemia,Increased Frequency",
            "base_risk": 10,
        }
    elif "uti" in disease or "urinary tract" in disease:
        return {
            "insight": "UTI profiles are often characterized by a high frequency of small-volume events due to urinary tract irritation.",
            "risk_exp": "UTI can rapidly progress to systemic infection (sepsis) in elderly patients if untreated.",
            "rec": "Ensure prescribed antibiotics are administered. Encourage fluid intake to flush the urinary tract.",
            "mon": "Monitor for fever, confusion, or hematuria. Check vital signs every 6 hours.",
            "tags": "Infection,UTI,Urgency",
            "base_risk": 11,
        }
    elif "stroke" in disease:
        return {
            "insight": "Post-stroke patients may exhibit neurogenic bladder patterns with consistent but unmanaged output.",
            "risk_exp": "Prolonged skin exposure to moisture increases the risk of pressure ulcers and dermatitis.",
            "rec": "Establish a scheduled toileting routine to rebuild bladder control and prevent skin breakdown.",
            "mon": "Perform skin integrity checks during every diaper change. Reposition every 2 hours.",
            "tags": "Neurological,Incontinence,Skin Care",
            "base_risk": 9,
        }
    elif "parkinson" in disease:
        return {
            "insight": "Parkinson's patients may experience mobility delays reaching the restroom, impacting continence.",
            "risk_exp": "Urgency combined with mobility issues significantly increases fall risk.",
            "rec": "Provide mobility assistance promptly when the patient indicates need. Keep pathways clear.",
            "mon": "Ensure call bell is within reach. Consider a bedside commode for nighttime use.",
            "tags": "Mobility,Fall Risk,Parkinsons",
            "base_risk": 8,
        }
    elif "surgical" in disease or "surgery" in disease:
        return {
            "insight": "Post-operative patients require monitoring for urinary retention or sensory changes from anesthesia.",
            "risk_exp": "Anesthesia and pain medications can cause urinary retention or reduced bladder sensation.",
            "rec": "Continue to monitor output to ensure kidneys are clearing anesthesia and IV fluids effectively.",
            "mon": "Measure exact I/O (Input/Output). Report if output falls below 30ml/hr.",
            "tags": "Post-Op,Recovery,I/O",
            "base_risk": 7,
        }
    else:
        return {
            "insight": "General monitoring for baseline continence patterns is recommended.",
            "risk_exp": "Standard monitoring is required to prevent discomfort and maintain hygiene.",
            "rec": "Maintain standard care protocols. Change diaper when saturated.",
            "mon": "Routine checks every 4 hours.",
            "tags": "General,Routine",
            "base_risk": 5,
        }


# ================================================================
# INSIGHT TEXT ENRICHMENT HELPERS
# ================================================================

def _enrich_insight_text(base_text: str, telemetry: Dict, alerts: Dict, trend_dir: str, trend_pct: float) -> str:
    """Enrich the disease-profile insight with real telemetry data."""
    parts = []
    
    event_count = telemetry.get("event_count_7d", 0)
    
    if event_count < 2:
        parts.append("Insufficient data to establish a conclusive trend.")
        if event_count > 0:
            parts.append(f"Only {event_count} reading(s) recorded in the last 7 days.")
        else:
            parts.append("No wetness events recorded in the last 7 days.")
    else:
        if trend_dir == "up":
            parts.append(f"Increased wetness event frequency and/or severity detected (up {trend_pct}% vs earlier baseline).")
        elif trend_dir == "down":
            parts.append(f"Decreased wetness event frequency and/or severity detected (down {trend_pct}% vs earlier baseline).")
        else:
            parts.append("Stable pattern detected, consistent with the patient's recent baseline.")
            
        parts.append(
            f"Over the last 7 days, analysis of {event_count} readings shows an average wetness of "
            f"{telemetry.get('avg_wetness', 0)}% (peak: {telemetry.get('max_wetness', 0)}%) "
            f"with approximately {telemetry.get('avg_daily_frequency', 0)} events per day."
        )

    if base_text:
        parts.append(f"Clinical Context: {base_text}")
    
    if telemetry.get("latest_battery") is not None and telemetry["latest_battery"] < 30:
        parts.append(f"⚠ Device battery is low at {telemetry['latest_battery']}%.")

    return " ".join(parts)


def _enrich_risk_explanation(base_text: str, alerts: Dict, risk_breakdown: Dict, trend_dir: str) -> str:
    """Enrich risk explanation with alert data, score breakdown, and real telemetry trends."""
    parts = []
    
    score = risk_breakdown.get("score", 0)
    level = risk_breakdown.get("level", "low")
    
    parts.append(f"The patient is assessed at a {level.upper()} risk level (score: {score}/100).")
    
    # Determine the primary driver of the risk score
    tel_score = risk_breakdown.get('_telemetry_score', 0)
    alt_score = risk_breakdown.get('_alert_score', 0)
    sev_score = risk_breakdown.get('_severity_score', 0)
    dis_score = risk_breakdown.get('_disease_base', 0)
    
    drivers = [
        ("telemetry patterns", tel_score),
        ("active alerts", alt_score),
        ("disease severity and base risk", sev_score + dis_score)
    ]
    highest_driver = max(drivers, key=lambda x: x[1])
    
    parts.append(f"This risk level is primarily driven by {highest_driver[0]}.")
    
    if trend_dir == "up":
        parts.append("The recent upward trend in wetness events further elevates this risk.")
        
    if alerts.get("active_count", 0) > 0:
        alert_detail = f"{alerts['active_count']} unresolved alert(s)"
        if alerts.get("critical_active", 0) > 0:
            alert_detail += f" including {alerts['critical_active']} critical"
        parts.append(f"Attention is needed for {alert_detail}.")

    parts.append(base_text)
    return " ".join(parts)


def _enrich_recommendation(base_rec: str, diagnosis_days: Optional[int], disease: Optional[str]) -> str:
    """Enrich recommendation with diagnosis duration context."""
    parts = [base_rec]

    if diagnosis_days is not None:
        if diagnosis_days <= 30:
            parts.append(
                f"Note: Diagnosis is recent ({diagnosis_days} days ago). "
                "Closely monitor for initial disease progression and treatment response."
            )
        elif diagnosis_days <= 180:
            parts.append(
                f"Diagnosis was {diagnosis_days} days ago. Continue monitoring for stabilization "
                "patterns and adjust care plan as the treatment trajectory clarifies."
            )
        else:
            months = diagnosis_days // 30
            parts.append(
                f"Long-term management ({months} months since diagnosis). "
                "Focus on maintenance protocols and watch for any deviation from established baseline."
            )

    return " ".join(parts)


# ================================================================
# MAIN ENTRY POINT — ENHANCED generate_insight
# ================================================================

def generate_insight(db: Session, patient_id: int) -> Optional[AIInsight]:
    """
    Generate and save a Level 3 disease-aware AI insight for the given patient.

    Creates a NEW AIInsight record each time (preserving history).
    Uses real telemetry, alert analysis, diagnosis duration, computed trends,
    and data-driven confidence.
    """
    patient = crud.get_patient_by_id(db, patient_id)
    if not patient:
        return None

    # ── Gather all analysis data ──
    telemetry = analyze_telemetry(db, patient_id)
    alert_data = analyze_alerts(db, patient_id)
    diagnosis_days = compute_diagnosis_duration(patient)

    # ── Compute risk from composite formula ──
    risk = calculate_base_risk(patient, telemetry, alert_data)

    # ── Compute real trend ──
    trend_dir, trend_pct = compute_trend(telemetry, alert_data)

    # ── Compute data-driven confidence ──
    confidence = compute_confidence(telemetry, alert_data)

    # ── Get disease-specific profile ──
    profile = get_disease_profile(patient.disease)

    # ── Enrich text with real data ──
    insight_text = _enrich_insight_text(
        profile["insight"], telemetry, alert_data, trend_dir, trend_pct
    )
    risk_explanation = _enrich_risk_explanation(
        profile["risk_exp"], alert_data, risk, trend_dir
    )
    recommendation = _enrich_recommendation(
        profile["rec"], diagnosis_days, patient.disease
    )

    # ── Build and persist the insight ──
    insight_data = AIInsightCreate(
        patient_id=patient.id,
        risk_score=risk["score"],
        risk_level=risk["level"],
        trend_direction=trend_dir,
        trend_percent=trend_pct,
        insight_text=insight_text,
        risk_explanation=risk_explanation,
        recommendation=recommendation,
        monitoring_advice=profile["mon"],
        confidence=confidence,
        tags=profile["tags"],
        generated_by="rule_engine",
        generated_at=datetime.now(timezone.utc),
    )

    # Create a NEW record (never overwrite historical insights)
    insight = AIInsight(**insight_data.model_dump())
    db.add(insight)
    db.commit()
    db.refresh(insight)
    return insight
