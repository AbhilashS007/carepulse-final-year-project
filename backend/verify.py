import sqlite3; db = sqlite3.connect('carepulse.db'); print(db.execute('SELECT alert_type, severity, resolved FROM alerts WHERE patient_id=1 ORDER BY id DESC LIMIT 2').fetchall())  
