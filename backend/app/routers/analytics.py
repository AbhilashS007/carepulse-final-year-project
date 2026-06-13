from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app import crud, schemas
from app.models import User
from app.dependencies import get_current_user

# Router for /analytics
router = APIRouter(
    prefix="/analytics",
    tags=["analytics"]
)

# Router for /dashboard
dashboard_router = APIRouter(
    prefix="/dashboard",
    tags=["dashboard"]
)

@dashboard_router.get("/stats", response_model=schemas.DashboardStats)
def read_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve real-time aggregate statistics for the dashboard KPI cards,
    wetness distribution, and device status counts.
    Requires authentication.
    """
    stats = crud.get_dashboard_stats(db)
    return stats

@router.get("/wetness-trend", response_model=List[schemas.WetnessTrendPoint])
def read_wetness_trend(
    days: int = Query(7, description="Number of days of history to include"),
    bucket_hours: int = Query(4, description="Time bucket interval in hours"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve average and peak wetness levels bucketed into time intervals,
    used to render the wetness trend area chart.
    Requires authentication.
    """
    trend = crud.get_wetness_trend(db, days=days, bucket_hours=bucket_hours)
    return trend

@router.get("/urination-frequency", response_model=List[schemas.DailyEventCount])
def read_urination_frequency(
    days: int = Query(7, description="Number of days of history to include"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve the count of daily urination events across all patients,
    used to render the daily frequency bar chart.
    Requires authentication.
    """
    frequency = crud.get_urination_frequency(db, days=days)
    return frequency
