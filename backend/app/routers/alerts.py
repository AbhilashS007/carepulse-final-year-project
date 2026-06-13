from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app import crud, schemas

router = APIRouter(
    prefix="/alerts",
    tags=["alerts"]
)

@router.get("", response_model=List[schemas.AlertOut])
def read_alerts(
    resolved: Optional[bool] = Query(None, description="Filter by resolution status (true = resolved, false = active)"),
    severity: Optional[str] = Query(None, description="Filter by severity (critical, warning, info)"),
    alert_type: Optional[str] = Query(None, description="Filter by alert type (high_wetness, low_battery, device_offline, diaper_changed, check_required)"),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    """
    Retrieve a list of alerts, with optional filters.
    Unresolved alerts are returned first, sorted by most recent first.
    """
    alerts = crud.get_all_alerts(
        db,
        resolved=resolved,
        severity=severity,
        alert_type=alert_type,
        skip=skip,
        limit=limit
    )
    return alerts
