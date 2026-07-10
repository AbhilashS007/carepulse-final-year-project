"""
CarePulse Backend — services/telemetry_processor.py
---------------------------------------------------
Autonomous background processor that translates raw ESP32 telemetry
into clinical events, evaluates alerts, and triggers AI analysis.
"""

import logging
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from app.models import Telemetry, UrinationEvent, Alert, Patient, AIInsight
from app.crud import _classify_wetness
from app.services.device_mapper import get_patient_by_device_id
from app.database import SessionLocal

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# ── Configuration Thresholds ────────────────────────────────────────

HIGH_WETNESS_THRESHOLD = 75.0
CRITICAL_WETNESS_THRESHOLD = 90.0
DRY_THRESHOLD = 30.0                # Below this = "dry" state
WETNESS_CHANGE_THRESHOLD = 10.0     # Minimum % change for a new event
WETNESS_HIGH_CHANGE_THRESHOLD = 5.0 # Minimum % change while already high
MIN_EVENT_INTERVAL_SEC = 300        # 5 min — periodic capture when changed

LOW_BATTERY_WARNING = 20.0
LOW_BATTERY_CRITICAL = 10.0
BATTERY_RESOLVE_THRESHOLD = 25.0

AI_REGEN_COOLDOWN_SEC = 300

# ────────────────────────────────────────────────────────────────────

def _wetness_state(percent: float) -> str:
    """Classify wetness into a clinical state for transition detection."""
    if percent <= DRY_THRESHOLD:
        return "dry"
    if percent < HIGH_WETNESS_THRESHOLD:
        return "wet"
    return "high"


def log_step(step: str, details: str = ""):
    """Helper for structured processing logs."""
    ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    msg = f"[{ts}] {step}"
    if details:
        msg += f" | {details}"
    logger.info(msg)


def process_telemetry_packet(telemetry_id: int) -> None:
    """
    Main processing pipeline for a single telemetry packet.
    """
    from app.services import disease_ai
    db = SessionLocal()
    try:
        log_step("Telemetry Received", f"ID={telemetry_id}")
        
        telemetry = db.query(Telemetry).filter(Telemetry.id == telemetry_id).first()
        if not telemetry:
            logger.error(f"Telemetry ID {telemetry_id} not found.")
            return

        # 1. Device Mapping
        patient = get_patient_by_device_id(db, telemetry.device_id)
        if not patient:
            log_step("Patient Matched", "FAIL: No active patient for device.")
            telemetry.processed = True
            db.commit()
            return
            
        log_step("Patient Matched", f"Patient={patient.id} ({patient.name})")

        # We use recorded_at = telemetry.created_at or esp32_timestamp
        record_time = telemetry.esp32_timestamp or telemetry.created_at
        
        # 2. Clinical Event — State-Transition Deduplication
        #
        #    Create a new UrinationEvent when one of these conditions is met:
        #      a) No previous event exists (first reading)
        #      b) State transition: Dry→Wet, Wet→High, High→Wet, Wet→Dry
        #      c) Significant wetness change (≥10%) regardless of state
        #      d) Periodic capture: ≥5 minutes elapsed AND wetness changed ≥5%
        #
        #    This prevents noise from continuous high-wetness telemetry while
        #    ensuring all clinically significant transitions are captured.
        latest_event = db.query(UrinationEvent).filter(
            UrinationEvent.patient_id == patient.id
        ).order_by(UrinationEvent.recorded_at.desc()).first()

        create_event = False
        event_reason = ""
        
        if not latest_event:
            create_event = True
            event_reason = "First reading"
        else:
            time_diff = (record_time - latest_event.recorded_at).total_seconds()
            wetness_diff = abs(telemetry.wetness_percent - latest_event.wetness_percent)
            
            prev_state = _wetness_state(latest_event.wetness_percent)
            curr_state = _wetness_state(telemetry.wetness_percent)
            
            # a) State transition (Dry↔Wet↔High)
            if prev_state != curr_state:
                create_event = True
                event_reason = f"State transition: {prev_state}→{curr_state}"
            # b) Large wetness change within same state
            elif wetness_diff >= WETNESS_CHANGE_THRESHOLD:
                create_event = True
                event_reason = f"Wetness change: {wetness_diff:.0f}%"
            # c) Periodic capture with meaningful change
            elif time_diff >= MIN_EVENT_INTERVAL_SEC and wetness_diff >= WETNESS_HIGH_CHANGE_THRESHOLD:
                create_event = True
                event_reason = f"Periodic capture ({int(time_diff)}s, Δ{wetness_diff:.0f}%)"

        event_created = False
        if create_event:
            device_status_mapped = "online"
            new_event = UrinationEvent(
                patient_id=patient.id,
                wetness_percent=telemetry.wetness_percent,
                wetness_level=_classify_wetness(telemetry.wetness_percent),
                battery_percent=telemetry.battery_percent,
                device_status=device_status_mapped,
                recorded_at=record_time
            )
            db.add(new_event)
            event_created = True
            log_step("Clinical Event", f"Created UrinationEvent (wetness={telemetry.wetness_percent}%) — {event_reason}")
        else:
            log_step("Clinical Event", "Skipped (Deduplicated)")

        # 3. Alert Evaluation
        critical_alert_generated = False
        alerts_changed = False
        
        # Check High Wetness Alert
        active_wetness_alert = db.query(Alert).filter(
            Alert.patient_id == patient.id,
            Alert.alert_type == "high_wetness",
            Alert.resolved == False
        ).first()

        if telemetry.wetness_percent >= HIGH_WETNESS_THRESHOLD:
            if not active_wetness_alert:
                severity = "critical" if telemetry.wetness_percent >= CRITICAL_WETNESS_THRESHOLD else "warning"
                alert = Alert(
                    patient_id=patient.id,
                    alert_type="high_wetness",
                    severity=severity,
                    message=f"High wetness detected: {telemetry.wetness_percent}%",
                )
                db.add(alert)
                alerts_changed = True
                if severity == "critical":
                    critical_alert_generated = True
                log_step("Alert Evaluation", f"Created High Wetness Alert ({severity})")
        else:
            if active_wetness_alert:
                active_wetness_alert.resolved = True
                active_wetness_alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
                alerts_changed = True
                log_step("Alert Evaluation", "Resolved High Wetness Alert")

        # Check Low Battery Alert
        active_battery_alert = db.query(Alert).filter(
            Alert.patient_id == patient.id,
            Alert.alert_type == "low_battery",
            Alert.resolved == False
        ).first()
        
        if telemetry.battery_percent <= LOW_BATTERY_WARNING:
            if not active_battery_alert:
                severity = "critical" if telemetry.battery_percent <= LOW_BATTERY_CRITICAL else "warning"
                alert = Alert(
                    patient_id=patient.id,
                    alert_type="low_battery",
                    severity=severity,
                    message=f"Low battery detected: {telemetry.battery_percent}%",
                )
                db.add(alert)
                alerts_changed = True
                if severity == "critical":
                    critical_alert_generated = True
                log_step("Alert Evaluation", f"Created Low Battery Alert ({severity})")
        else:
            if active_battery_alert and telemetry.battery_percent >= BATTERY_RESOLVE_THRESHOLD:
                active_battery_alert.resolved = True
                active_battery_alert.resolved_at = datetime.now(timezone.utc).replace(tzinfo=None)
                alerts_changed = True
                log_step("Alert Evaluation", "Resolved Low Battery Alert")

        if not alerts_changed:
            log_step("Alert Evaluation", "No changes")

        # Commit DB to ensure events/alerts exist for AI to query
        db.commit()

        # 4. AI Update (Cooldown Logic)
        if event_created or alerts_changed:
            trigger_ai = True
            
            if not critical_alert_generated:
                latest_insight = db.query(AIInsight).filter(
                    AIInsight.patient_id == patient.id
                ).order_by(AIInsight.generated_at.desc()).first()
                
                if latest_insight:
                    diff_sec = (datetime.now() - latest_insight.generated_at).total_seconds()
                    if diff_sec < AI_REGEN_COOLDOWN_SEC:
                        trigger_ai = False
                        log_step("AI Update", f"Skipped (Cooldown active: {int(diff_sec)}s < {AI_REGEN_COOLDOWN_SEC}s)")

            if trigger_ai:
                try:
                    disease_ai.generate_insight(db, patient.id)
                    log_step("AI Update", "Generated new AI Insight")
                except Exception as e:
                    log_step("AI Update", f"ERROR: {str(e)}")
                    logger.error("Failed to generate AI insight", exc_info=True)
        else:
            log_step("AI Update", "Skipped (No clinical changes)")

        # 5. Completed
        telemetry.processed = True
        db.commit()
        log_step("Completed", "Pipeline finished successfully")
        
    except Exception as e:
        logger.error(f"Telemetry processing failed: {e}", exc_info=True)
    finally:
        db.close()
