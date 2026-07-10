from app.database import SessionLocal
from app.crud import unarchive_patient

db = SessionLocal()
p = unarchive_patient(db, 10)
print(f"Patient {p.id} ({p.name}) - is_archived: {p.is_archived}")
