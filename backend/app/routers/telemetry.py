"""
CarePulse Backend — routers/telemetry.py
-----------------------------------------
Production telemetry endpoints for persisting raw ESP32 sensor data.

Replaces the temporary telemetry_test.py router.
No authentication — the ESP32 sends unauthenticated HTTP POST requests.

Endpoints:
    POST   /telemetry          — validate + save a telemetry reading
    GET    /telemetry/latest   — return the most recent reading
    GET    /telemetry/recent   — return recent readings (configurable limit)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status, BackgroundTasks
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import TelemetryCreate, TelemetryOut
from app import crud
from app.services.telemetry_processor import process_telemetry_packet

router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry"],
)


@router.post(
    "",
    response_model=TelemetryOut,
    status_code=status.HTTP_201_CREATED,
    summary="Save an ESP32 telemetry reading",
    description=(
        "Validates and persists a raw sensor reading from the ESP32 device. "
        "Returns the saved record including the server-generated id and timestamp. "
        "IoT metadata fields (wifi_rssi, firmware_version, esp32_timestamp) are "
        "optional for backward compatibility with older firmware."
    ),
)
def create_telemetry(
    data: TelemetryCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    """
    Save a telemetry reading.

    Example payload (minimal — older firmware):
    ```json
    {
      "device_id": "ESP32-001",
      "moisture_raw": 2164,
      "wetness_percent": 70,
      "battery_percent": 95
    }
    ```

    Example payload (extended — newer firmware):
    ```json
    {
      "device_id": "ESP32-001",
      "moisture_raw": 2164,
      "wetness_percent": 70,
      "battery_percent": 95,
      "wifi_rssi": -53,
      "firmware_version": "1.0.0",
      "esp32_timestamp": null
    }
    ```
    """
    record = crud.create_telemetry(db, data)
    background_tasks.add_task(process_telemetry_packet, record.id)
    return record


@router.get(
    "/latest",
    response_model=TelemetryOut,
    summary="Get the most recent telemetry reading",
    description="Returns the single most recent telemetry reading across all devices.",
)
def get_latest_telemetry(
    db: Session = Depends(get_db),
):
    record = crud.get_latest_telemetry(db)
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No telemetry data recorded yet.",
        )
    return record


@router.get(
    "/recent",
    response_model=list[TelemetryOut],
    summary="Get recent telemetry readings",
    description="Returns the most recent telemetry readings, newest first.",
)
def get_recent_telemetry(
    limit: int = Query(default=100, ge=1, le=1000, description="Max rows to return"),
    db: Session = Depends(get_db),
):
    return crud.get_recent_telemetry(db, limit=limit)
