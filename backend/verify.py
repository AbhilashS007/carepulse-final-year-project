import sqlite3; db = sqlite3.connect('carepulse.db'); print(db.execute('SELECT id, wetness_percent, recorded_at FROM urination_events WHERE patient_id=10 ORDER BY id DESC LIMIT 5').fetchall())  
