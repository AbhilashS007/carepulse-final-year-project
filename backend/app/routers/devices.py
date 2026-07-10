from typing import List
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Telemetry, Patient
from app import schemas

router = APIRouter(
    prefix="/devices",
    tags=["Devices"],
)

@router.get("", response_model=List[schemas.DeviceOverview])
def get_all_devices(db: Session = Depends(get_db)):
    """
    Returns an overview of all known devices (from the telemetry table)
    and their current assignment status.
    """
    # 1. Get the latest telemetry per device
    subq = db.query(
        Telemetry.device_id,
        func.max(Telemetry.created_at).label("last_packet")
    ).group_by(Telemetry.device_id).subquery()

    # 2. Join to get the full telemetry row for firmware version and rssi
    telemetry_info = db.query(
        Telemetry.device_id,
        Telemetry.firmware_version,
        Telemetry.wifi_rssi,
        subq.c.last_packet
    ).join(
        subq,
        (Telemetry.device_id == subq.c.device_id) & (Telemetry.created_at == subq.c.last_packet)
    ).all()

    # 3. Get all assigned devices from active patients
    # We do not filter by device_id.not_like("archived_%") because schemas handle cleaning it up for UI.
    active_patients = db.query(Patient.device_id, Patient.id, Patient.name).filter(
        Patient.is_archived == False
    ).all()
    
    assigned_map = {p.device_id: {"id": p.id, "name": p.name} for p in active_patients}

    # 4. Build response
    now = datetime.utcnow()
    devices = []
    
    # Track which devices from telemetry we've added
    seen_devices = set()

    for t in telemetry_info:
        seen_devices.add(t.device_id)
        is_online = (now - t.last_packet) < timedelta(seconds=30)
        
        # In case the telemetry device_id doesn't match exactly because assigned_map 
        # might have unassigned_... (which we clean up later)
        assigned = assigned_map.get(t.device_id)
        
        devices.append({
            "device_id": t.device_id,
            "status": "online" if is_online else "offline",
            "last_packet_at": t.last_packet,
            "firmware_version": t.firmware_version,
            "wifi_rssi": t.wifi_rssi,
            "assigned_patient_id": assigned["id"] if assigned else None,
            "assigned_patient_name": assigned["name"] if assigned else None,
        })
        
    # Also add any assigned devices that have never sent telemetry
    for p in active_patients:
        clean_device_id = p.device_id
        if clean_device_id.startswith("unassigned_"):
            clean_device_id = "unassigned"
            
        if clean_device_id not in seen_devices and clean_device_id != "unassigned":
            devices.append({
                "device_id": clean_device_id,
                "status": "offline",
                "last_packet_at": None,
                "firmware_version": None,
                "wifi_rssi": None,
                "assigned_patient_id": p.id,
                "assigned_patient_name": p.name,
            })
            
    # Sort by device_id
    devices.sort(key=lambda x: x["device_id"])
    return devices
