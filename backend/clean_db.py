import sqlite3
import os

db_path = 'carepulse.db'
if not os.path.exists(db_path):
    print('DB not found.')
    exit(1)

db = sqlite3.connect(db_path)
db.execute('DELETE FROM telemetry;')
db.execute('DELETE FROM ai_insights;')
db.execute('DELETE FROM alerts;')
db.execute('DELETE FROM urination_events;')
db.execute('DELETE FROM patients WHERE id != 10;')
db.execute('UPDATE patients SET name = "Live Test Patient" WHERE id = 10;')
db.commit()
print('Database sanitized.')
