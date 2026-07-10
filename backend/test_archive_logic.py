from app.database import SessionLocal
from app.crud import archive_patient, unarchive_patient, get_patient_by_id

db = SessionLocal()
try:
    print("Archiving patient 10...")
    p = archive_patient(db, 10)
    print(f"Archived: {p.name}, Device ID: {p.device_id}, is_archived: {p.is_archived}")
    
    print("Unarchiving patient 10...")
    p = unarchive_patient(db, 10)
    print(f"Unarchived: {p.name}, Device ID: {p.device_id}, is_archived: {p.is_archived}")
finally:
    db.close()
