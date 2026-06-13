from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import crud, schemas

router = APIRouter(
    prefix="/patients",
    tags=["patients"]
)

@router.get("", response_model=List[schemas.PatientSummaryOut])
def read_patients(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    """
    Retrieve a list of patients.
    Returns lightweight summary information for list/table display.
    """
    patients = crud.get_all_patients(db, skip=skip, limit=limit)
    return patients

@router.get("/{patient_id}", response_model=schemas.PatientOut)
def read_patient(patient_id: int, db: Session = Depends(get_db)):
    """
    Retrieve details for a specific patient, including nested relationships:
    alerts, urination events, and AI insights.
    """
    patient = crud.get_patient_by_id(db, patient_id=patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found"
        )
    return patient
