// ============================================================
// CarePulse — Type Definitions & Utility Functions
// ============================================================
// Extracted from mockData.ts for Phase 4E Clinical Data Integrity.
// All pages import types and utilities from here — NO mock data.

export type WetnessLevel = 'Dry' | 'Slightly Wet' | 'Moderately Wet' | 'Saturated';
export type DeviceStatus = 'Online' | 'Offline' | 'Maintenance' | 'Never Connected';
export type AlertSeverity = 'Critical' | 'Warning' | 'Info';
export type AlertType = 'High Wetness' | 'Low Battery' | 'Device Offline' | 'Diaper Changed' | 'Check Required';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';
export type DiseaseSeverity = 'mild' | 'moderate' | 'severe' | 'critical';

export interface Patient {
  id: string;
  name: string;
  age: number;
  ward: string;
  room: string;
  wetnessPercent: number;
  wetnessLevel: WetnessLevel;
  batteryPercent: number;
  deviceStatus: DeviceStatus;
  deviceId: string;
  lastUpdate: string;
  lastDiaperChange: string;
  todayEvents: number;
  avgDailyEvents: number;
  riskScore: number;
  riskLevel: RiskLevel;
  photo: string;
  condition: string;
  caregiver: string;
  notes: string;
  isArchived?: boolean;
  disease?: string;
  diseaseSeverity?: DiseaseSeverity;
  diagnosisDate?: string;
}

export interface Alert {
  id: string;
  patientId: string;
  patientName: string;
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  deviceId: string;
}

export interface WetnessTrendPoint {
  time: string;
  wetness: number;
  threshold: number;
}

export interface UrinationEvent {
  time: string;
  patientId: string;
  duration: number;
  volume: number;
}

export interface DailyFrequency {
  day: string;
  date: string;
  events: number;
  avgEvents: number;
}

export interface WeeklyAnalytics {
  week: string;
  patientA: number;
  patientB: number;
  patientC: number;
  average: number;
}

export interface AIInsight {
  id: string;
  patientId: string;
  patientName: string;
  age: number;
  disease?: string;
  diseaseSeverity?: DiseaseSeverity;
  riskScore: number;
  riskLevel: RiskLevel;
  trend: string;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercent: number;
  insight: string;
  riskExplanation?: string;
  recommendation: string;
  monitoringAdvice?: string;
  generatedAt: string;
  confidence: number;
  tags: string[];
}

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

export function getWetnessColor(percent: number): string {
  if (percent <= 30) return 'text-green-600';
  if (percent <= 60) return 'text-amber-500';
  if (percent <= 80) return 'text-orange-500';
  return 'text-red-600';
}

export function getWetnessBg(percent: number): string {
  if (percent <= 30) return 'bg-green-500';
  if (percent <= 60) return 'bg-amber-400';
  if (percent <= 80) return 'bg-orange-500';
  return 'bg-red-500';
}

export function getBatteryColor(percent: number): string {
  if (percent > 50) return 'text-green-600';
  if (percent > 25) return 'text-amber-500';
  return 'text-red-600';
}

export function getRiskColor(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case 'Low': return 'text-green-700 bg-green-100';
    case 'Moderate': return 'text-amber-700 bg-amber-100';
    case 'High': return 'text-orange-700 bg-orange-100';
    case 'Critical': return 'text-red-700 bg-red-100';
  }
}

export function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'Critical': return 'text-red-700 bg-red-100';
    case 'Warning': return 'text-amber-700 bg-amber-100';
    case 'Info': return 'text-blue-700 bg-blue-100';
  }
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true,
  });
}
