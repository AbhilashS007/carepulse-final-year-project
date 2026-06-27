"""
CarePulse Backend — routers/gemini.py
--------------------------------------
Phase 3: Gemini Clinical Intelligence Router.

Provides the REST endpoint for generating Gemini clinical narrative
reports.  This router orchestrates data collection from the existing
Level 3 Rule Engine and passes it to the Gemini service layer.

The Rule Engine remains the sole source of truth for all quantitative
clinical metrics.  Gemini is the narrative-generation layer only.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from app.database import get_db
from app import crud, schemas
from app.models import User
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/gemini",
    tags=["gemini-clinical-intelligence"],
)


@router.post("/report/{patient_id}", response_model=schemas.GeminiReportOut)
async def generate_clinical_report(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    POST /gemini/report/{patient_id}

    Generate a Gemini-powered clinical narrative report for a patient.

    Workflow:
        1. Fetch patient from database
        2. Retrieve the latest rule engine insight (or generate one)
        3. Run telemetry and alert analysis from the rule engine
        4. Pass all structured data to the Gemini service
        5. Return the combined rule engine + Gemini narrative report

    Authentication: Required (JWT Bearer token)
    """
    from app.services import disease_ai, gemini_service

    # ── 1. Fetch patient ──
    patient = crud.get_patient_by_id(db, patient_id)
    if not patient:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with ID {patient_id} not found.",
        )

    # ── 2. Get latest rule engine insight (or generate one) ──
    latest_insight = None
    if patient.ai_insights:
        # Sort by generated_at descending, take the most recent
        sorted_insights = sorted(
            patient.ai_insights,
            key=lambda i: i.generated_at,
            reverse=True,
        )
        latest_insight = sorted_insights[0]

    if not latest_insight:
        # No insight exists yet — generate one from the rule engine
        latest_insight = disease_ai.generate_insight(db, patient_id)
        if not latest_insight:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate rule engine insight for this patient.",
            )

    # ── 3. Run telemetry and alert analysis ──
    telemetry = disease_ai.analyze_telemetry(db, patient_id)
    alert_data = disease_ai.analyze_alerts(db, patient_id)
    diagnosis_days = disease_ai.compute_diagnosis_duration(patient)

    # ── 4. Prepare patient data dict ──
    patient_dict = {
        "name": patient.name,
        "age": patient.age,
        "ward": patient.ward,
        "room": patient.room,
        "condition": patient.condition,
        "caregiver_name": patient.caregiver_name,
        "disease": patient.disease,
        "disease_severity": patient.disease_severity,
    }

    insight_dict = {
        "risk_score": latest_insight.risk_score,
        "risk_level": latest_insight.risk_level,
        "trend_direction": latest_insight.trend_direction,
        "trend_percent": latest_insight.trend_percent,
        "confidence": latest_insight.confidence,
        "insight_text": latest_insight.insight_text,
        "risk_explanation": latest_insight.risk_explanation,
        "recommendation": latest_insight.recommendation,
        "monitoring_advice": latest_insight.monitoring_advice,
    }

    # ── 5. Call Gemini service ──
    try:
        report = await gemini_service.generate_clinical_report(
            patient=patient_dict,
            insight=insight_dict,
            telemetry=telemetry,
            alerts=alert_data,
            diagnosis_days=diagnosis_days,
        )
    except ValueError as e:
        # Missing API key
        raise HTTPException(status_code=503, detail=str(e))
    except RuntimeError as e:
        # Gemini API failure
        raise HTTPException(status_code=502, detail=str(e))

    # ── 6. Build response ──
    generated_at = datetime.now(timezone.utc).isoformat()

    # Format diagnosis duration for display
    if diagnosis_days is not None:
        if diagnosis_days <= 30:
            diag_display = f"{diagnosis_days} days"
        elif diagnosis_days <= 365:
            diag_display = f"{diagnosis_days // 30} months ({diagnosis_days} days)"
        else:
            years = diagnosis_days // 365
            months = (diagnosis_days % 365) // 30
            diag_display = f"{years} year(s), {months} month(s)"
    else:
        diag_display = None

    return schemas.GeminiReportOut(
        # Patient metadata
        patient_id=patient.id,
        patient_name=patient.name,
        patient_age=patient.age,
        patient_ward=patient.ward,
        patient_room=patient.room,
        disease=patient.disease,
        disease_severity=patient.disease_severity,
        diagnosis_duration=diag_display,

        # Rule engine fields (source of truth)
        risk_score=latest_insight.risk_score,
        risk_level=latest_insight.risk_level,
        trend_direction=latest_insight.trend_direction,
        trend_percent=latest_insight.trend_percent,
        confidence=latest_insight.confidence,
        rule_engine_insight=latest_insight.insight_text,
        rule_engine_risk_explanation=latest_insight.risk_explanation,
        rule_engine_recommendation=latest_insight.recommendation,
        rule_engine_monitoring=latest_insight.monitoring_advice,

        # Telemetry summary
        telemetry_event_count=telemetry.get("event_count_7d", 0),
        telemetry_avg_wetness=telemetry.get("avg_wetness", 0.0),
        telemetry_max_wetness=telemetry.get("max_wetness", 0.0),
        telemetry_avg_daily_freq=telemetry.get("avg_daily_frequency", 0.0),

        # Alert summary
        alert_active_count=alert_data.get("active_count", 0),
        alert_critical_active=alert_data.get("critical_active", 0),
        alert_total_7d=alert_data.get("total_7d", 0),

        # Gemini narratives
        clinical_summary=report.clinical_summary,
        caregiver_recommendation=report.caregiver_recommendation,
        nursing_notes=report.nursing_notes,
        monitoring_plan=report.monitoring_plan,
        priority_actions=report.priority_actions,
        patient_explanation=report.patient_explanation,

        # Metadata
        generated_at=generated_at,
        generated_by_risk="CarePulse Rule Engine (Level 3)",
        generated_by_narrative="Google Gemini 2.0 Flash",
    )
