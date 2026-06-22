"""
CarePulse Backend — routers/patients.py
-----------------------------------------
Patient management endpoints:

    GET    /patients                  List patients (with archive filter)
    GET    /patients/{id}             Patient detail (with nested relations)
    POST   /patients                  Create a new patient
    PUT    /patients/{id}             Full patient update
    PATCH  /patients/{id}/archive     Soft-archive a patient (non-destructive)

All write endpoints require a valid JWT (get_current_user dependency).
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Literal

from app.database import get_db
from app import crud, schemas
from app.models import User
from app.dependencies import get_current_user

router = APIRouter(
    prefix="/patients",
    tags=["patients"]
)


# ================================================================
# READ — patient list
# ================================================================

@router.get("", response_model=List[schemas.PatientSummaryOut])
def read_patients(
    skip:     int = 0,
    limit:    int = 100,
    archived: str = Query(
        "active",
        description="Filter: 'active' (default) | 'archived' | 'all'"
    ),
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Retrieve a paginated list of patients.

    - **archived=active** (default): only non-archived patients
    - **archived=archived**: only archived patients
    - **archived=all**: every patient regardless of archive status

    Returns lightweight summary rows (no nested telemetry data).
    """
    patients = crud.get_all_patients(db, skip=skip, limit=limit, archived=archived)
    return patients


# ================================================================
# READ — patient detail
# ================================================================

@router.get("/{patient_id}", response_model=schemas.PatientOut)
def read_patient(
    patient_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Retrieve full details for a single patient including nested relationships:
    alerts, urination events, and AI insights.
    """
    patient = crud.get_patient_by_id(db, patient_id=patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found",
        )
    return patient


# ================================================================
# CREATE — new patient
# ================================================================

@router.post("", response_model=schemas.PatientOut, status_code=status.HTTP_201_CREATED)
def create_patient(
    patient_data: schemas.PatientCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Register a new patient in the monitoring system.

    - **device_id** must be globally unique (one device per patient).
    - Returns the full patient object, ready for the detail panel.

    Raises **409 Conflict** if the device_id is already in use.
    """
    try:
        patient = crud.create_patient(db, patient_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    return patient


# ================================================================
# UPDATE — full patient update (PUT semantics)
# ================================================================

@router.put("/{patient_id}", response_model=schemas.PatientOut)
def update_patient(
    patient_id:   int,
    patient_data: schemas.PatientCreate,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Fully replace a patient's mutable fields.

    All fields from PatientCreate are required. Optional disease fields
    may be set to null by omitting them from the request body.

    Raises **404** if the patient does not exist.
    Raises **409 Conflict** if the new device_id is used by another patient.
    """
    try:
        patient = crud.update_patient(db, patient_id, patient_data)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found",
        )
    return patient


# ================================================================
# ARCHIVE — soft delete (non-destructive)
# ================================================================

@router.patch("/{patient_id}/archive", response_model=schemas.PatientOut)
def archive_patient(
    patient_id:   int,
    db:           Session = Depends(get_db),
    current_user: User    = Depends(get_current_user),
):
    """
    Soft-archive a patient.

    Sets **is_archived = True**. All historical data (alerts, sensor events,
    AI insights) is fully preserved. The patient is excluded from the active
    patient list but remains queryable via **GET /patients?archived=archived**.

    Raises **404** if the patient does not exist.
    """
    patient = crud.archive_patient(db, patient_id)
    if patient is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Patient with ID {patient_id} not found",
        )
    return patient
