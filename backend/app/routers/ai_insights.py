from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import crud, schemas
from app.models import User
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/ai-insights",
    tags=["ai-insights"]
)

@router.get("", response_model=List[schemas.AIInsightOut])
def read_ai_insights(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve AI health insights for monitored patients, ordered by generation timestamp (newest first).
    Requires authentication.
    """
    insights = crud.get_all_ai_insights(db, skip=skip, limit=limit)
    
    # Map patient disease fields to the output model
    result = []
    for insight in insights:
        out = schemas.AIInsightOut.model_validate(insight)
        if insight.patient:
            out.disease = insight.patient.disease
            out.disease_severity = insight.patient.disease_severity
        result.append(out)
        
    return result


@router.post("/generate/{patient_id}", response_model=schemas.AIInsightOut)
def generate_patient_insight(
    patient_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    POST /ai-insights/generate/{patient_id}

    Regenerate a disease-aware AI insight for a specific patient.
    Creates a NEW AIInsight record (preserves historical insights).

    Uses the Level 3 rule engine: Disease + Telemetry + Alerts.

    Returns the newly generated AIInsightOut object.
    """
    from app.services import disease_ai

    insight = disease_ai.generate_insight(db, patient_id)
    if not insight:
        raise HTTPException(
            status_code=404,
            detail=f"Patient with ID {patient_id} not found."
        )

    out = schemas.AIInsightOut.model_validate(insight)
    if insight.patient:
        out.disease = insight.patient.disease
        out.disease_severity = insight.patient.disease_severity
    return out
