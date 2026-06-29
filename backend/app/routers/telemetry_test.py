from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(
    prefix="/telemetry",
    tags=["Telemetry Test"]
)

class TelemetryData(BaseModel):
    device_id: str
    wetness: int
    battery: int

@router.post("/test")
def receive_telemetry(data: TelemetryData):

    print("\n==============================")
    print("Telemetry Received")
    print("==============================")
    print(f"Device   : {data.device_id}")
    print(f"Wetness  : {data.wetness}%")
    print(f"Battery  : {data.battery}%")
    print("==============================\n")

    return {
        "status": "success",
        "message": "Telemetry received successfully"
    }