import sqlite3

try:
    conn = sqlite3.connect('carepulse.db')
    c = conn.cursor()
    c.execute("INSERT INTO patients (name, age, ward, room, condition, caregiver_name, device_id, is_archived) VALUES ('Test', 10, 'W', 'R', 'C', 'CN', 'CP-DEV-010', 0)")
    conn.commit()
    print("Success")
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close()
