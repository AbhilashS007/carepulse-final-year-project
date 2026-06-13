"""
CarePulse Backend — schemas.py
--------------------------------
Pydantic v2 schemas for request validation and response serialisation.

Pattern used for each resource:
    <Model>Base    — shared fields (used internally)
    <Model>Create  — fields accepted in POST request body
    <Model>Update  — optional fields accepted in PATCH request body
    <Model>Out     — full response returned to the frontend (includes id, timestamps)

All schemas are model_config = ConfigDict(from_attributes=True) so they can be
constructed directly from SQLAlchemy ORM objects (orm_mode in Pydantic v1).
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator


# ================================================================
# SHARED CONFIG
# ================================================================

class _Base(BaseModel):
    """
    Parent config applied to every schema in this file.
    from_attributes=True lets Pydantic read values from
    SQLAlchemy ORM objects (replaces orm_mode=True in Pydantic v1).
    """
    model_config = ConfigDict(from_attributes=True)


# ================================================================
# PATIENT SCHEMAS
# ================================================================

class PatientBase(_Base):
    """Fields shared between create and update schemas."""
    name:           str = Field(..., min_length=2,  max_length=100,  example="Margaret Chen")
    age:            int = Field(..., ge=0,           le=130,           example=78)
    ward:           str = Field(..., min_length=2,  max_length=100,  example="Geriatric Care")
    room:           str = Field(..., min_length=1,  max_length=20,   example="3A-101")
    condition:      str = Field(..., min_length=2,  max_length=200,  example="Post-stroke rehabilitation")
    caregiver_name: str = Field(..., min_length=2,  max_length=100,  example="Nurse Rachel Kim")
    device_id:      str = Field(..., min_length=3,  max_length=50,   example="CP-DEV-001")
    notes:          Optional[str] = Field(None, max_length=2000, example="UTI history. Requires frequent monitoring.")


class PatientCreate(PatientBase):
    """Schema for POST /patients — all fields required."""
    pass


class PatientUpdate(_Base):
    """
    Schema for PATCH /patients/{id}.
    All fields are Optional so the client can update only what changed.
    """
    name:           Optional[str] = Field(None, min_length=2,  max_length=100)
    age:            Optional[int] = Field(None, ge=0,           le=130)
    ward:           Optional[str] = Field(None, min_length=2,  max_length=100)
    room:           Optional[str] = Field(None, min_length=1,  max_length=20)
    condition:      Optional[str] = Field(None, min_length=2,  max_length=200)
    caregiver_name: Optional[str] = Field(None, min_length=2,  max_length=100)
    device_id:      Optional[str] = Field(None, min_length=3,  max_length=50)
    notes:          Optional[str] = Field(None, max_length=2000)


class PatientOut(PatientBase):
    """
    Schema for GET responses.
    Includes the auto-generated primary key and timestamps.
    """
    id:         int
    created_at: datetime
    updated_at: datetime

    # Nested relationships — optional (only populated when explicitly loaded)
    alerts:           list["AlertOut"]          = []
    urination_events: list["UrinationEventOut"] = []
    ai_insights:      list["AIInsightOut"]      = []


class PatientSummaryOut(_Base):
    """
    Lightweight patient schema for list endpoints (no nested relations).
    Used in the Dashboard and Patients table to keep response size small.
    """
    id:             int
    name:           str
    age:            int
    ward:           str
    room:           str
    condition:      str
    caregiver_name: str
    device_id:      str
    created_at:     datetime
    updated_at:     datetime


# ================================================================
# ALERT SCHEMAS
# ================================================================

class AlertBase(_Base):
    """Fields shared between create and update schemas."""
    patient_id:  int = Field(..., gt=0, example=1)
    alert_type:  str = Field(
        ..., example="high_wetness",
        description="One of: high_wetness | low_battery | device_offline | diaper_changed | check_required"
    )
    severity:    str = Field(
        ..., example="critical",
        description="One of: critical | warning | info"
    )
    message:     str = Field(..., min_length=5, example="Wetness level reached 89% — immediate diaper change required.")

    @field_validator("alert_type")
    @classmethod
    def validate_alert_type(cls, v: str) -> str:
        allowed = {"high_wetness", "low_battery", "device_offline", "diaper_changed", "check_required"}
        if v not in allowed:
            raise ValueError(f"alert_type must be one of {allowed}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        allowed = {"critical", "warning", "info"}
        if v not in allowed:
            raise ValueError(f"severity must be one of {allowed}")
        return v


class AlertCreate(AlertBase):
    """Schema for POST /alerts — creates a new alert."""
    pass


class AlertUpdate(_Base):
    """
    Schema for PATCH /alerts/{id}.
    Primarily used by caregivers to mark an alert as resolved.
    """
    resolved:    Optional[bool]     = None
    resolved_at: Optional[datetime] = None
    message:     Optional[str]      = Field(None, min_length=5)


class AlertOut(AlertBase):
    """Schema for GET /alerts responses."""
    id:          int
    resolved:    bool
    resolved_at: Optional[datetime]
    created_at:  datetime


# ================================================================
# URINATION EVENT SCHEMAS
# ================================================================

class UrinationEventBase(_Base):
    """Fields shared between create and update schemas."""
    patient_id:      int   = Field(..., gt=0, example=1)
    wetness_percent: float = Field(..., ge=0.0, le=100.0, example=82.0)
    wetness_level:   str   = Field(
        ..., example="saturated",
        description="One of: dry | slightly_wet | moderately_wet | saturated"
    )
    battery_percent: float = Field(..., ge=0.0, le=100.0, example=45.0)
    device_status:   str   = Field(
        ..., example="online",
        description="One of: online | offline | maintenance"
    )
    recorded_at: datetime = Field(
        ..., example="2026-06-13T13:10:00",
        description="Timestamp when the sensor captured this reading (device clock)"
    )

    @field_validator("wetness_level")
    @classmethod
    def validate_wetness_level(cls, v: str) -> str:
        allowed = {"dry", "slightly_wet", "moderately_wet", "saturated"}
        if v not in allowed:
            raise ValueError(f"wetness_level must be one of {allowed}")
        return v

    @field_validator("device_status")
    @classmethod
    def validate_device_status(cls, v: str) -> str:
        allowed = {"online", "offline", "maintenance"}
        if v not in allowed:
            raise ValueError(f"device_status must be one of {allowed}")
        return v


class UrinationEventCreate(UrinationEventBase):
    """Schema for POST /urination-events — records a new sensor reading."""
    pass


class UrinationEventOut(UrinationEventBase):
    """Schema for GET /urination-events responses."""
    id:         int
    created_at: datetime


# ================================================================
# AI INSIGHT SCHEMAS
# ================================================================

class AIInsightBase(_Base):
    """Fields shared between create and update schemas."""
    patient_id:      int   = Field(..., gt=0, example=1)
    risk_score:      int   = Field(..., ge=0, le=100, example=72)
    risk_level:      str   = Field(
        ..., example="high",
        description="One of: low | moderate | high | critical"
    )
    trend_direction: str   = Field(
        ..., example="up",
        description="One of: up | down | stable"
    )
    trend_percent:   float = Field(..., ge=0.0, example=18.0)
    insight_text:    str   = Field(..., min_length=10, example="Urination frequency increased by 18%...")
    recommendation:  str   = Field(..., min_length=10, example="Monitor hydration levels...")
    confidence:      float = Field(..., ge=0.0, le=100.0, example=87.0)
    tags:            Optional[str] = Field(
        None, max_length=500,
        example="Post-Stroke,Neurogenic,Frequency Trend",
        description="Comma-separated clinical category tags"
    )
    generated_at:    datetime = Field(..., example="2026-06-13T13:00:00")

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, v: str) -> str:
        allowed = {"low", "moderate", "high", "critical"}
        if v not in allowed:
            raise ValueError(f"risk_level must be one of {allowed}")
        return v

    @field_validator("trend_direction")
    @classmethod
    def validate_trend_direction(cls, v: str) -> str:
        allowed = {"up", "down", "stable"}
        if v not in allowed:
            raise ValueError(f"trend_direction must be one of {allowed}")
        return v


class AIInsightCreate(AIInsightBase):
    """Schema for POST /ai-insights — stores a new AI-generated insight."""
    pass


class AIInsightUpdate(_Base):
    """
    Schema for PATCH /ai-insights/{id}.
    Allows updating the insight content after re-analysis.
    """
    risk_score:      Optional[int]   = Field(None, ge=0, le=100)
    risk_level:      Optional[str]   = None
    trend_direction: Optional[str]   = None
    trend_percent:   Optional[float] = Field(None, ge=0.0)
    insight_text:    Optional[str]   = Field(None, min_length=10)
    recommendation:  Optional[str]   = Field(None, min_length=10)
    confidence:      Optional[float] = Field(None, ge=0.0, le=100.0)
    tags:            Optional[str]   = Field(None, max_length=500)


class AIInsightOut(AIInsightBase):
    """Schema for GET /ai-insights responses."""
    id:         int
    created_at: datetime


# ================================================================
# UTILITY / AGGREGATE SCHEMAS
# (Used by dashboard summary endpoints in later phases)
# ================================================================

class DashboardStats(_Base):
    """
    Aggregate statistics returned by GET /dashboard/stats.
    Maps directly to the KPI cards displayed on the frontend Dashboard page.
    """
    total_patients:     int
    active_alerts:      int
    connected_devices:  int
    today_event_count:  int

    # Wetness distribution counts across all patients' latest readings
    count_dry:           int
    count_slightly_wet:  int
    count_moderately_wet: int
    count_saturated:     int

    # Device health counts
    devices_online:      int
    devices_offline:     int
    devices_maintenance: int


class WetnessTrendPoint(_Base):
    """
    Single data point for the Dashboard / Analytics wetness trend chart.
    Returned as a list from GET /analytics/wetness-trend.
    """
    recorded_at:     datetime
    avg_wetness:     float
    max_wetness:     float
    patient_count:   int


class DailyEventCount(_Base):
    """
    Total urination events per calendar day.
    Returned as a list from GET /analytics/daily-events.
    """
    date:        str    # ISO date string "YYYY-MM-DD"
    event_count: int


# ================================================================
# USER & AUTH SCHEMAS
# ================================================================

class UserBase(_Base):
    full_name: str = Field(..., min_length=2, max_length=100, example="System Administrator")
    email:     str = Field(..., min_length=5, max_length=100, example="admin@carepulse.com")
    role:      str = Field(..., min_length=2, max_length=50, example="admin")


class UserCreate(UserBase):
    password:  str = Field(..., min_length=6, max_length=100, example="admin123")


class UserOut(UserBase):
    id:         int
    created_at: datetime


class UserLogin(_Base):
    email:    str = Field(..., example="admin@carepulse.com")
    password: str = Field(..., example="admin123")


class Token(_Base):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut


class TokenData(_Base):
    email:   Optional[str] = None
    role:    Optional[str] = None
    user_id: Optional[int] = None


# ── Forward reference resolution ──────────────────────────────
# Required because PatientOut references AlertOut, UrinationEventOut,
# and AIInsightOut which are defined after it.
PatientOut.model_rebuild()
