"""
CarePulse Backend — services/device_mapper.py
---------------------------------------------
Service for resolving Patient records from IoT device identifiers.
This prepares the system for future many-to-many device reassignments.
"""

import logging
from typing import Optional
from sqlalchemy.orm import Session
from app.models import Patient

logger = logging.getLogger(__name__)

def get_patient_by_device_id(db: Session, device_id: str) -> Optional[Patient]:
    """
    Finds the active patient currently assigned to the given device_id.
    """
    patient = db.query(Patient).filter(
        Patient.device_id == device_id,
        Patient.is_archived == False
    ).first()
    
    if not patient:
        logger.warning(f"DeviceMapper: No active patient found for device_id '{device_id}'")
        return None
        
    return patient
