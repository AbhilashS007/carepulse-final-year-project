"""
Phase 4H - Demo Data Cleanup Script
-------------------------------------
One-shot script to remove regression/test artifacts and trim data
to a realistic demonstration state.

Run from the backend/ directory:
    python cleanup_for_demo.py

What it does:
1. Deletes regression test patients (ids 11, 12, 13, 14) - CASCADE handles related data
2. Deletes test device telemetry (TEST-DEV-*)
3. Trims CP-DEV-010 telemetry to the latest 100 packets
4. Trims patient 10 urination events to the latest 20
5. Trims patient 10 AI insights to the latest 5
6. Prints final counts for verification
"""

import sqlite3
import os
import sys
import io

# Force UTF-8 stdout on Windows to avoid cp1252 encoding errors
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = "carepulse.db"

def main():
    if not os.path.exists(DB_PATH):
        print("[ERROR] Database not found at", DB_PATH)
        sys.exit(1)

    db = sqlite3.connect(DB_PATH)
    # Enable foreign key enforcement for CASCADE
    db.execute("PRAGMA foreign_keys = ON")
    cursor = db.cursor()

    print("=" * 60)
    print("  Phase 4H — Demo Data Cleanup")
    print("=" * 60)

    # ── Pre-cleanup audit ──────────────────────────────────────
    print("\n── Pre-Cleanup State ──")
    cursor.execute("SELECT id, name, device_id FROM patients")
    patients = cursor.fetchall()
    print(f"  Patients: {len(patients)}")
    for p in patients:
        print(f"    id={p[0]} name={p[1]!r} device={p[2]!r}")

    cursor.execute("SELECT COUNT(*) FROM telemetry")
    print(f"  Telemetry: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM alerts")
    print(f"  Alerts: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM ai_insights")
    print(f"  AI Insights: {cursor.fetchone()[0]}")
    cursor.execute("SELECT COUNT(*) FROM urination_events")
    print(f"  Urination Events: {cursor.fetchone()[0]}")

    # ── Step 1: Delete regression test patients ────────────────
    # CASCADE will auto-delete related alerts, urination_events, ai_insights
    print("\n── Step 1: Deleting regression test patients ──")
    test_patient_ids = [11, 12, 13, 14]
    for pid in test_patient_ids:
        cursor.execute("SELECT name FROM patients WHERE id = ?", (pid,))
        row = cursor.fetchone()
        if row:
            # Manually delete related records first (SQLite FK cascade may not work with pragma off)
            cursor.execute("DELETE FROM ai_insights WHERE patient_id = ?", (pid,))
            cursor.execute("DELETE FROM alerts WHERE patient_id = ?", (pid,))
            cursor.execute("DELETE FROM urination_events WHERE patient_id = ?", (pid,))
            cursor.execute("DELETE FROM patients WHERE id = ?", (pid,))
            print(f"  ✓ Deleted patient {pid} ({row[0]!r}) and all related data")
        else:
            print(f"  - Patient {pid} not found (already clean)")

    # ── Step 2: Delete test device telemetry ───────────────────
    print("\n── Step 2: Deleting test device telemetry ──")
    cursor.execute("SELECT COUNT(*) FROM telemetry WHERE device_id LIKE 'TEST-DEV-%'")
    test_telemetry_count = cursor.fetchone()[0]
    cursor.execute("DELETE FROM telemetry WHERE device_id LIKE 'TEST-DEV-%'")
    print(f"  ✓ Deleted {test_telemetry_count} test device telemetry rows")

    # ── Step 3: Trim CP-DEV-010 telemetry to latest 100 ───────
    print("\n── Step 3: Trimming telemetry to latest 100 packets ──")
    cursor.execute("SELECT COUNT(*) FROM telemetry WHERE device_id = 'CP-DEV-010'")
    total_telemetry = cursor.fetchone()[0]

    if total_telemetry > 100:
        # Find the 100th newest record's created_at as the cutoff
        cursor.execute("""
            DELETE FROM telemetry
            WHERE device_id = 'CP-DEV-010'
              AND id NOT IN (
                SELECT id FROM telemetry
                WHERE device_id = 'CP-DEV-010'
                ORDER BY created_at DESC
                LIMIT 100
              )
        """)
        deleted = total_telemetry - 100
        print(f"  ✓ Trimmed {deleted} older telemetry rows (kept latest 100)")
    else:
        print(f"  - Already ≤100 rows ({total_telemetry}), no trimming needed")

    # ── Step 4: Trim urination events to latest 20 ────────────
    print("\n── Step 4: Trimming urination events to latest 20 ──")
    cursor.execute("SELECT COUNT(*) FROM urination_events WHERE patient_id = 10")
    total_events = cursor.fetchone()[0]

    if total_events > 20:
        cursor.execute("""
            DELETE FROM urination_events
            WHERE patient_id = 10
              AND id NOT IN (
                SELECT id FROM urination_events
                WHERE patient_id = 10
                ORDER BY recorded_at DESC
                LIMIT 20
              )
        """)
        deleted = total_events - 20
        print(f"  ✓ Trimmed {deleted} older urination events (kept latest 20)")
    else:
        print(f"  - Already ≤20 events ({total_events}), no trimming needed")

    # ── Step 5: Trim AI insights to latest 5 ──────────────────
    print("\n── Step 5: Trimming AI insights to latest 5 ──")
    cursor.execute("SELECT COUNT(*) FROM ai_insights WHERE patient_id = 10")
    total_insights = cursor.fetchone()[0]

    if total_insights > 5:
        cursor.execute("""
            DELETE FROM ai_insights
            WHERE patient_id = 10
              AND id NOT IN (
                SELECT id FROM ai_insights
                WHERE patient_id = 10
                ORDER BY generated_at DESC
                LIMIT 5
              )
        """)
        deleted = total_insights - 5
        print(f"  ✓ Trimmed {deleted} duplicate AI insights (kept latest 5)")
    else:
        print(f"  - Already ≤5 insights ({total_insights}), no trimming needed")

    # ── Commit ─────────────────────────────────────────────────
    db.commit()

    # ── Post-cleanup verification ──────────────────────────────
    print("\n" + "=" * 60)
    print("  Post-Cleanup Verification")
    print("=" * 60)

    cursor.execute("SELECT id, name, device_id FROM patients")
    patients = cursor.fetchall()
    print(f"\n  Patients: {len(patients)}")
    for p in patients:
        print(f"    id={p[0]} name={p[1]!r} device={p[2]!r}")

    cursor.execute("SELECT COUNT(*) FROM telemetry")
    print(f"  Telemetry: {cursor.fetchone()[0]}")

    cursor.execute("SELECT DISTINCT device_id FROM telemetry")
    devices = [r[0] for r in cursor.fetchall()]
    print(f"  Telemetry Devices: {devices}")

    cursor.execute("SELECT COUNT(*) FROM alerts WHERE patient_id = 10")
    print(f"  Alerts (patient 10): {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM ai_insights WHERE patient_id = 10")
    print(f"  AI Insights (patient 10): {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM urination_events WHERE patient_id = 10")
    print(f"  Urination Events (patient 10): {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM users")
    print(f"  Users: {cursor.fetchone()[0]}")

    # Verify no orphaned data
    cursor.execute("SELECT COUNT(*) FROM alerts WHERE patient_id NOT IN (SELECT id FROM patients)")
    orphan_alerts = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM ai_insights WHERE patient_id NOT IN (SELECT id FROM patients)")
    orphan_insights = cursor.fetchone()[0]
    cursor.execute("SELECT COUNT(*) FROM urination_events WHERE patient_id NOT IN (SELECT id FROM patients)")
    orphan_events = cursor.fetchone()[0]

    if orphan_alerts + orphan_insights + orphan_events == 0:
        print("\n  ✅ No orphaned records found — database is clean!")
    else:
        print(f"\n  ⚠ Orphaned records: alerts={orphan_alerts}, insights={orphan_insights}, events={orphan_events}")

    print("\n" + "=" * 60)
    print("  ✅ Phase 4H Cleanup Complete")
    print("=" * 60)

    db.close()


if __name__ == "__main__":
    main()
