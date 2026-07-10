// ============================================================
// CarePulse — mockData.ts (Phase 4E: Gutted)
// ============================================================
// All mock data arrays have been REMOVED for clinical data integrity.
// This file now re-exports types and utilities from types.ts
// so existing imports across the codebase continue to work.
//
// No screen should display demo information anymore.
// All displayed values originate from live database records.

export {
  // Types
  type WetnessLevel,
  type DeviceStatus,
  type AlertSeverity,
  type AlertType,
  type RiskLevel,
  type DiseaseSeverity,
  type Patient,
  type Alert,
  type WetnessTrendPoint,
  type UrinationEvent,
  type DailyFrequency,
  type WeeklyAnalytics,
  type AIInsight,
  // Utility Functions
  getWetnessColor,
  getWetnessBg,
  getBatteryColor,
  getRiskColor,
  getSeverityColor,
  formatTimestamp,
} from './types';
