import requests
import time

BASE_URL = "http://localhost:8000"

def run_test():
    print("--- Authenticating ---")
    login = requests.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@carepulse.com",
        "password": "admin123"
    })
    login.raise_for_status()
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    device_id = f"TEST-DEV-{int(time.time())}"
    
    print("--- 1. Create Patient ---")
    patient_data = {
        "name": "Regression Test Patient",
        "age": 70,
        "ward": "Test Ward",
        "room": "T-100",
        "condition": "Testing",
        "caregiver_name": "Test Nurse",
        "device_id": device_id
    }
    r = requests.post(f"{BASE_URL}/patients", json=patient_data, headers=headers)
    assert r.status_code in (200, 201), f"Failed to create patient: {r.text}"
    patient = r.json()
    patient_id = patient["id"]
    print(f"Created Patient {patient_id} with device {patient['device_id']}")
    assert patient["device_id"] == device_id, "Device ID should be clean"

    print("--- 2. Post Telemetry ---")
    telemetry_data = {
        "device_id": device_id,
        "moisture_raw": 3000,
        "wetness_percent": 90, # triggers alert
        "battery_percent": 50,
        "wifi_rssi": -55,
        "firmware_version": "1.0.1"
    }
    r = requests.post(f"{BASE_URL}/telemetry", json=telemetry_data, headers=headers)
    assert r.status_code in (200, 201), f"Failed to post telemetry: {r.text}"
    print("Telemetry posted successfully.")

    time.sleep(1) # wait for rule engine if it's background, although it's sync in this app

    print("--- 3. Check Alerts ---")
    r = requests.get(f"{BASE_URL}/alerts", headers=headers)
    alerts = r.json()
    my_alerts = [a for a in alerts if a["patient_id"] == patient_id]
    assert len(my_alerts) > 0, "Expected an alert for high wetness"
    print("Alert created successfully.")

    print("--- 4. Check Analytics/Dashboard ---")
    r = requests.get(f"{BASE_URL}/dashboard/stats", headers=headers)
    assert r.status_code == 200
    stats = r.json()
    assert stats["today_event_count"] > 0, "Expected at least 1 event today"
    print("Dashboard stats updated.")

    print("--- 5. Check Devices Page ---")
    r = requests.get(f"{BASE_URL}/devices", headers=headers)
    assert r.status_code == 200
    devices = r.json()
    my_dev = next((d for d in devices if d["device_id"] == device_id), None)
    assert my_dev is not None, f"{device_id} missing from devices"
    assert my_dev["wifi_rssi"] == -55, f"Expected RSSI -55, got {my_dev['wifi_rssi']}"
    print("Devices endpoint returned correct RSSI.")

    print("--- 6. Archive Patient ---")
    r = requests.patch(f"{BASE_URL}/patients/{patient_id}/archive", headers=headers)
    assert r.status_code == 200, f"Failed to archive patient: {r.text}"
    archived_patient = r.json()
    # the schema should strip archived_
    assert archived_patient["device_id"] == device_id, f"Device ID should still appear clean, got {archived_patient['device_id']}"
    assert archived_patient["is_archived"] is True
    print("Patient archived.")

    print("--- 7. Reassign Device ID ---")
    patient_data2 = patient_data.copy()
    patient_data2["name"] = "Second Test Patient"
    r = requests.post(f"{BASE_URL}/patients", json=patient_data2, headers=headers)
    assert r.status_code in (200, 201), f"Should allow reusing {device_id}"
    patient2 = r.json()
    print(f"Successfully reused {device_id} for new patient.")

    print("--- 8. Verify Archived Patient Keeps Alerts ---")
    r = requests.get(f"{BASE_URL}/patients/{patient_id}", headers=headers)
    p1_details = r.json()
    assert len(p1_details["alerts"]) > 0, "Archived patient should keep their alerts"
    print("Archived patient kept their historical alerts.")

    print("--- 9. Unarchive Patient (Conflict Test) ---")
    r = requests.patch(f"{BASE_URL}/patients/{patient_id}/unarchive", headers=headers)
    assert r.status_code == 200, f"Failed to unarchive patient: {r.text}"
    unarchived_patient = r.json()
    print(f"Unarchived patient device id is: {unarchived_patient['device_id']}")
    assert unarchived_patient["device_id"] == "unassigned", "Should be set to unassigned due to conflict"
    
    print("ALL TESTS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    run_test()
