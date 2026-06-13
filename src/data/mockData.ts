// ============================================================
// CarePulse - Comprehensive Mock Data
// ============================================================

export type WetnessLevel = 'Dry' | 'Slightly Wet' | 'Moderately Wet' | 'Saturated';
export type DeviceStatus = 'Online' | 'Offline' | 'Maintenance';
export type AlertSeverity = 'Critical' | 'Warning' | 'Info';
export type AlertType = 'High Wetness' | 'Low Battery' | 'Device Offline' | 'Diaper Changed' | 'Check Required';
export type RiskLevel = 'Low' | 'Moderate' | 'High' | 'Critical';

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
  riskScore: number;
  riskLevel: RiskLevel;
  trend: string;
  trendDirection: 'up' | 'down' | 'stable';
  trendPercent: number;
  insight: string;
  recommendation: string;
  generatedAt: string;
  confidence: number;
  tags: string[];
}

// ============================================================
// PATIENTS
// ============================================================
export const patients: Patient[] = [
  {
    id: 'P001',
    name: 'Margaret Chen',
    age: 78,
    ward: 'Geriatric Care',
    room: '3A-101',
    wetnessPercent: 82,
    wetnessLevel: 'Saturated',
    batteryPercent: 45,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-001',
    lastUpdate: '2 min ago',
    lastDiaperChange: '4h 12m ago',
    todayEvents: 7,
    avgDailyEvents: 6.2,
    riskScore: 84,
    riskLevel: 'High',
    photo: '',
    condition: 'Post-stroke rehabilitation',
    caregiver: 'Nurse Rachel Kim',
    notes: 'Requires frequent monitoring. UTI history.',
  },
  {
    id: 'P002',
    name: 'Robert Patel',
    age: 85,
    ward: 'Geriatric Care',
    room: '3A-102',
    wetnessPercent: 28,
    wetnessLevel: 'Slightly Wet',
    batteryPercent: 91,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-002',
    lastUpdate: '5 min ago',
    lastDiaperChange: '1h 45m ago',
    todayEvents: 4,
    avgDailyEvents: 5.8,
    riskScore: 32,
    riskLevel: 'Low',
    photo: '',
    condition: 'Dementia Stage II',
    caregiver: 'Nurse James Liu',
    notes: 'Regular schedule maintained.',
  },
  {
    id: 'P003',
    name: 'Eleanor Whitmore',
    age: 72,
    ward: 'Long-Term Care',
    room: '4B-204',
    wetnessPercent: 61,
    wetnessLevel: 'Moderately Wet',
    batteryPercent: 67,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-003',
    lastUpdate: '8 min ago',
    lastDiaperChange: '2h 30m ago',
    todayEvents: 6,
    avgDailyEvents: 5.5,
    riskScore: 58,
    riskLevel: 'Moderate',
    photo: '',
    condition: 'Parkinson\'s disease',
    caregiver: 'Nurse Sarah Okonjo',
    notes: 'Hydration levels being monitored.',
  },
  {
    id: 'P004',
    name: 'Thomas Nakamura',
    age: 90,
    ward: 'Geriatric Care',
    room: '3A-108',
    wetnessPercent: 15,
    wetnessLevel: 'Dry',
    batteryPercent: 23,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-004',
    lastUpdate: '12 min ago',
    lastDiaperChange: '45m ago',
    todayEvents: 3,
    avgDailyEvents: 4.1,
    riskScore: 71,
    riskLevel: 'High',
    photo: '',
    condition: 'Advanced heart failure',
    caregiver: 'Nurse Rachel Kim',
    notes: 'Low battery warning. Replace device battery.',
  },
  {
    id: 'P005',
    name: 'Grace Okafor',
    age: 68,
    ward: 'Rehabilitation',
    room: '2C-312',
    wetnessPercent: 44,
    wetnessLevel: 'Slightly Wet',
    batteryPercent: 78,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-005',
    lastUpdate: '3 min ago',
    lastDiaperChange: '2h 10m ago',
    todayEvents: 5,
    avgDailyEvents: 4.9,
    riskScore: 44,
    riskLevel: 'Moderate',
    photo: '',
    condition: 'Hip replacement recovery',
    caregiver: 'Nurse James Liu',
    notes: 'Improving mobility. Expected discharge next week.',
  },
  {
    id: 'P006',
    name: 'Harold Steiner',
    age: 81,
    ward: 'Long-Term Care',
    room: '4B-210',
    wetnessPercent: 0,
    wetnessLevel: 'Dry',
    batteryPercent: 55,
    deviceStatus: 'Offline',
    deviceId: 'CP-DEV-006',
    lastUpdate: '1h ago',
    lastDiaperChange: '3h 5m ago',
    todayEvents: 4,
    avgDailyEvents: 5.3,
    riskScore: 62,
    riskLevel: 'Moderate',
    photo: '',
    condition: 'Alzheimer\'s Stage III',
    caregiver: 'Nurse Sarah Okonjo',
    notes: 'Device offline. Manual check recommended.',
  },
  {
    id: 'P007',
    name: 'Beatrice Fontaine',
    age: 76,
    ward: 'Geriatric Care',
    room: '3A-115',
    wetnessPercent: 73,
    wetnessLevel: 'Moderately Wet',
    batteryPercent: 88,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-007',
    lastUpdate: '4 min ago',
    lastDiaperChange: '3h 50m ago',
    todayEvents: 8,
    avgDailyEvents: 6.8,
    riskScore: 76,
    riskLevel: 'High',
    photo: '',
    condition: 'Chronic kidney disease',
    caregiver: 'Nurse Rachel Kim',
    notes: 'Elevated urination frequency this week.',
  },
  {
    id: 'P008',
    name: 'Samuel Oduya',
    age: 83,
    ward: 'Rehabilitation',
    room: '2C-308',
    wetnessPercent: 36,
    wetnessLevel: 'Slightly Wet',
    batteryPercent: 94,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-008',
    lastUpdate: '6 min ago',
    lastDiaperChange: '1h 20m ago',
    todayEvents: 5,
    avgDailyEvents: 5.1,
    riskScore: 38,
    riskLevel: 'Low',
    photo: '',
    condition: 'Spinal cord injury rehab',
    caregiver: 'Nurse James Liu',
    notes: 'Stable condition.',
  },
  {
    id: 'P009',
    name: 'Lillian Park',
    age: 69,
    ward: 'Long-Term Care',
    room: '4B-215',
    wetnessPercent: 52,
    wetnessLevel: 'Moderately Wet',
    batteryPercent: 71,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-009',
    lastUpdate: '9 min ago',
    lastDiaperChange: '2h 55m ago',
    todayEvents: 6,
    avgDailyEvents: 5.6,
    riskScore: 50,
    riskLevel: 'Moderate',
    photo: '',
    condition: 'Multiple sclerosis',
    caregiver: 'Nurse Sarah Okonjo',
    notes: 'Monitoring for infection signs.',
  },
  {
    id: 'P010',
    name: 'Arthur Mbeki',
    age: 92,
    ward: 'Geriatric Care',
    room: '3A-120',
    wetnessPercent: 89,
    wetnessLevel: 'Saturated',
    batteryPercent: 60,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-010',
    lastUpdate: '1 min ago',
    lastDiaperChange: '5h 20m ago',
    todayEvents: 9,
    avgDailyEvents: 7.3,
    riskScore: 91,
    riskLevel: 'Critical',
    photo: '',
    condition: 'End-stage renal disease',
    caregiver: 'Nurse Rachel Kim',
    notes: 'CRITICAL: Immediate diaper change required.',
  },
  {
    id: 'P011',
    name: 'Irene Nakagawa',
    age: 74,
    ward: 'Rehabilitation',
    room: '2C-315',
    wetnessPercent: 20,
    wetnessLevel: 'Slightly Wet',
    batteryPercent: 83,
    deviceStatus: 'Online',
    deviceId: 'CP-DEV-011',
    lastUpdate: '7 min ago',
    lastDiaperChange: '1h 05m ago',
    todayEvents: 4,
    avgDailyEvents: 4.3,
    riskScore: 28,
    riskLevel: 'Low',
    photo: '',
    condition: 'Stroke recovery',
    caregiver: 'Nurse James Liu',
    notes: 'Good progress in rehabilitation.',
  },
  {
    id: 'P012',
    name: 'Franklin Deschamps',
    age: 87,
    ward: 'Long-Term Care',
    room: '4B-220',
    wetnessPercent: 66,
    wetnessLevel: 'Moderately Wet',
    batteryPercent: 37,
    deviceStatus: 'Maintenance',
    deviceId: 'CP-DEV-012',
    lastUpdate: '25 min ago',
    lastDiaperChange: '3h 15m ago',
    todayEvents: 5,
    avgDailyEvents: 5.8,
    riskScore: 65,
    riskLevel: 'Moderate',
    photo: '',
    condition: 'COPD & incontinence',
    caregiver: 'Nurse Sarah Okonjo',
    notes: 'Device under maintenance. Manual monitoring active.',
  },
];

// ============================================================
// ALERTS
// ============================================================
export const alerts: Alert[] = [
  {
    id: 'A001',
    patientId: 'P010',
    patientName: 'Arthur Mbeki',
    type: 'High Wetness',
    severity: 'Critical',
    message: 'Wetness level reached 89% — immediate diaper change required.',
    timestamp: '2026-06-13T13:10:00',
    resolved: false,
    deviceId: 'CP-DEV-010',
  },
  {
    id: 'A002',
    patientId: 'P001',
    patientName: 'Margaret Chen',
    type: 'High Wetness',
    severity: 'Critical',
    message: 'Wetness level at 82% — exceeds recommended 75% threshold.',
    timestamp: '2026-06-13T13:20:00',
    resolved: false,
    deviceId: 'CP-DEV-001',
  },
  {
    id: 'A003',
    patientId: 'P004',
    patientName: 'Thomas Nakamura',
    type: 'Low Battery',
    severity: 'Warning',
    message: 'Device battery at 23%. Please replace or recharge soon.',
    timestamp: '2026-06-13T12:55:00',
    resolved: false,
    deviceId: 'CP-DEV-004',
  },
  {
    id: 'A004',
    patientId: 'P006',
    patientName: 'Harold Steiner',
    type: 'Device Offline',
    severity: 'Warning',
    message: 'Device CP-DEV-006 has gone offline. Last signal 1 hour ago.',
    timestamp: '2026-06-13T12:42:00',
    resolved: false,
    deviceId: 'CP-DEV-006',
  },
  {
    id: 'A005',
    patientId: 'P007',
    patientName: 'Beatrice Fontaine',
    type: 'High Wetness',
    severity: 'Warning',
    message: 'Wetness level at 73%. Approaching critical threshold.',
    timestamp: '2026-06-13T13:05:00',
    resolved: false,
    deviceId: 'CP-DEV-007',
  },
  {
    id: 'A006',
    patientId: 'P012',
    patientName: 'Franklin Deschamps',
    type: 'Low Battery',
    severity: 'Warning',
    message: 'Device battery at 37%. Schedule replacement.',
    timestamp: '2026-06-13T11:30:00',
    resolved: true,
    resolvedAt: '2026-06-13T12:00:00',
    deviceId: 'CP-DEV-012',
  },
  {
    id: 'A007',
    patientId: 'P003',
    patientName: 'Eleanor Whitmore',
    type: 'High Wetness',
    severity: 'Warning',
    message: 'Wetness level at 61%. Monitor closely.',
    timestamp: '2026-06-13T11:15:00',
    resolved: true,
    resolvedAt: '2026-06-13T11:45:00',
    deviceId: 'CP-DEV-003',
  },
  {
    id: 'A008',
    patientId: 'P001',
    patientName: 'Margaret Chen',
    type: 'High Wetness',
    severity: 'Critical',
    message: 'Wetness exceeded 80% threshold.',
    timestamp: '2026-06-13T09:30:00',
    resolved: true,
    resolvedAt: '2026-06-13T09:50:00',
    deviceId: 'CP-DEV-001',
  },
  {
    id: 'A009',
    patientId: 'P010',
    patientName: 'Arthur Mbeki',
    type: 'High Wetness',
    severity: 'Critical',
    message: 'Third high-wetness event today. Abnormal urination pattern.',
    timestamp: '2026-06-13T08:45:00',
    resolved: true,
    resolvedAt: '2026-06-13T09:10:00',
    deviceId: 'CP-DEV-010',
  },
  {
    id: 'A010',
    patientId: 'P009',
    patientName: 'Lillian Park',
    type: 'Check Required',
    severity: 'Info',
    message: 'Scheduled wetness check due.',
    timestamp: '2026-06-13T10:00:00',
    resolved: true,
    resolvedAt: '2026-06-13T10:15:00',
    deviceId: 'CP-DEV-009',
  },
  {
    id: 'A011',
    patientId: 'P006',
    patientName: 'Harold Steiner',
    type: 'Device Offline',
    severity: 'Critical',
    message: 'Device went offline during night shift.',
    timestamp: '2026-06-13T02:15:00',
    resolved: true,
    resolvedAt: '2026-06-13T03:00:00',
    deviceId: 'CP-DEV-006',
  },
  {
    id: 'A012',
    patientId: 'P007',
    patientName: 'Beatrice Fontaine',
    type: 'High Wetness',
    severity: 'Critical',
    message: 'Wetness reached 91% — diaper change completed.',
    timestamp: '2026-06-13T06:20:00',
    resolved: true,
    resolvedAt: '2026-06-13T06:35:00',
    deviceId: 'CP-DEV-007',
  },
  {
    id: 'A013',
    patientId: 'P002',
    patientName: 'Robert Patel',
    type: 'Diaper Changed',
    severity: 'Info',
    message: 'Diaper changed by Nurse James Liu.',
    timestamp: '2026-06-13T07:45:00',
    resolved: true,
    resolvedAt: '2026-06-13T07:46:00',
    deviceId: 'CP-DEV-002',
  },
  {
    id: 'A014',
    patientId: 'P004',
    patientName: 'Thomas Nakamura',
    type: 'Low Battery',
    severity: 'Warning',
    message: 'Battery dropped to 23%. Device may disconnect soon.',
    timestamp: '2026-06-13T07:10:00',
    resolved: false,
    deviceId: 'CP-DEV-004',
  },
  {
    id: 'A015',
    patientId: 'P005',
    patientName: 'Grace Okafor',
    type: 'Check Required',
    severity: 'Info',
    message: 'Routine wetness assessment scheduled.',
    timestamp: '2026-06-13T12:00:00',
    resolved: true,
    resolvedAt: '2026-06-13T12:20:00',
    deviceId: 'CP-DEV-005',
  },
];

// ============================================================
// WETNESS TREND DATA (7-day hourly samples)
// ============================================================
export const wetnessTrend: WetnessTrendPoint[] = [
  { time: 'Jun 7 00:00', wetness: 15, threshold: 75 },
  { time: 'Jun 7 04:00', wetness: 62, threshold: 75 },
  { time: 'Jun 7 08:00', wetness: 24, threshold: 75 },
  { time: 'Jun 7 12:00', wetness: 48, threshold: 75 },
  { time: 'Jun 7 16:00', wetness: 71, threshold: 75 },
  { time: 'Jun 7 20:00', wetness: 35, threshold: 75 },
  { time: 'Jun 8 00:00', wetness: 18, threshold: 75 },
  { time: 'Jun 8 04:00', wetness: 58, threshold: 75 },
  { time: 'Jun 8 08:00', wetness: 30, threshold: 75 },
  { time: 'Jun 8 12:00', wetness: 66, threshold: 75 },
  { time: 'Jun 8 16:00', wetness: 80, threshold: 75 },
  { time: 'Jun 8 20:00', wetness: 22, threshold: 75 },
  { time: 'Jun 9 00:00', wetness: 12, threshold: 75 },
  { time: 'Jun 9 04:00', wetness: 55, threshold: 75 },
  { time: 'Jun 9 08:00', wetness: 28, threshold: 75 },
  { time: 'Jun 9 12:00', wetness: 74, threshold: 75 },
  { time: 'Jun 9 16:00', wetness: 45, threshold: 75 },
  { time: 'Jun 9 20:00', wetness: 32, threshold: 75 },
  { time: 'Jun 10 00:00', wetness: 20, threshold: 75 },
  { time: 'Jun 10 04:00', wetness: 67, threshold: 75 },
  { time: 'Jun 10 08:00', wetness: 35, threshold: 75 },
  { time: 'Jun 10 12:00', wetness: 52, threshold: 75 },
  { time: 'Jun 10 16:00', wetness: 78, threshold: 75 },
  { time: 'Jun 10 20:00', wetness: 29, threshold: 75 },
  { time: 'Jun 11 00:00', wetness: 17, threshold: 75 },
  { time: 'Jun 11 04:00', wetness: 70, threshold: 75 },
  { time: 'Jun 11 08:00', wetness: 40, threshold: 75 },
  { time: 'Jun 11 12:00', wetness: 61, threshold: 75 },
  { time: 'Jun 11 16:00', wetness: 82, threshold: 75 },
  { time: 'Jun 11 20:00', wetness: 38, threshold: 75 },
  { time: 'Jun 12 00:00', wetness: 22, threshold: 75 },
  { time: 'Jun 12 04:00', wetness: 63, threshold: 75 },
  { time: 'Jun 12 08:00', wetness: 42, threshold: 75 },
  { time: 'Jun 12 12:00', wetness: 77, threshold: 75 },
  { time: 'Jun 12 16:00', wetness: 55, threshold: 75 },
  { time: 'Jun 12 20:00', wetness: 31, threshold: 75 },
  { time: 'Jun 13 00:00', wetness: 19, threshold: 75 },
  { time: 'Jun 13 04:00', wetness: 72, threshold: 75 },
  { time: 'Jun 13 08:00', wetness: 47, threshold: 75 },
  { time: 'Jun 13 12:00', wetness: 82, threshold: 75 },
];

// ============================================================
// DAILY URINATION FREQUENCY
// ============================================================
export const dailyFrequency: DailyFrequency[] = [
  { day: 'Mon', date: 'Jun 7', events: 48, avgEvents: 45 },
  { day: 'Tue', date: 'Jun 8', events: 52, avgEvents: 45 },
  { day: 'Wed', date: 'Jun 9', events: 44, avgEvents: 45 },
  { day: 'Thu', date: 'Jun 10', events: 57, avgEvents: 45 },
  { day: 'Fri', date: 'Jun 11', events: 61, avgEvents: 45 },
  { day: 'Sat', date: 'Jun 12', events: 53, avgEvents: 45 },
  { day: 'Sun', date: 'Jun 13', events: 47, avgEvents: 45 },
];

// ============================================================
// WEEKLY ANALYTICS (per-patient comparison)
// ============================================================
export const weeklyAnalytics: WeeklyAnalytics[] = [
  { week: 'Week 1', patientA: 42, patientB: 38, patientC: 55, average: 45 },
  { week: 'Week 2', patientA: 45, patientB: 41, patientC: 58, average: 48 },
  { week: 'Week 3', patientA: 40, patientB: 44, patientC: 52, average: 45 },
  { week: 'Week 4', patientA: 48, patientB: 46, patientC: 61, average: 52 },
  { week: 'Week 5', patientA: 52, patientB: 43, patientC: 64, average: 53 },
  { week: 'Week 6', patientA: 49, patientB: 47, patientC: 59, average: 52 },
  { week: 'Week 7', patientA: 54, patientB: 50, patientC: 67, average: 57 },
  { week: 'Week 8', patientA: 51, patientB: 48, patientC: 63, average: 54 },
];

// ============================================================
// AI INSIGHTS
// ============================================================
export const aiInsights: AIInsight[] = [
  {
    id: 'INS001',
    patientId: 'P010',
    patientName: 'Arthur Mbeki',
    age: 92,
    riskScore: 91,
    riskLevel: 'Critical',
    trend: 'Urination frequency increased significantly',
    trendDirection: 'up',
    trendPercent: 26,
    insight:
      'Urination frequency has increased by 26% compared to the previous week (9.2 vs 7.3 events/day). Pattern shows peak events between 02:00–06:00 AM. Combined with end-stage renal disease, this indicates potential fluid retention complications.',
    recommendation:
      'Immediate consultation with nephrologist recommended. Increase monitoring frequency to every 30 minutes. Assess fluid intake and output balance. Consider catheter evaluation.',
    generatedAt: '2026-06-13T13:00:00',
    confidence: 92,
    tags: ['Renal', 'Frequency Spike', 'Nocturnal', 'Urgent'],
  },
  {
    id: 'INS002',
    patientId: 'P001',
    patientName: 'Margaret Chen',
    age: 78,
    riskScore: 72,
    riskLevel: 'High',
    trend: 'Urination frequency increased moderately',
    trendDirection: 'up',
    trendPercent: 18,
    insight:
      'Urination frequency increased by 18% compared to previous week. Post-stroke patients with elevated frequency may indicate neurogenic bladder complications. Three high-wetness events recorded in the last 24 hours.',
    recommendation:
      'Monitor hydration levels and consult caregiver if trend continues. Schedule bladder function assessment. Review current medication list for diuretic interactions.',
    generatedAt: '2026-06-13T13:00:00',
    confidence: 87,
    tags: ['Post-Stroke', 'Neurogenic', 'Frequency Trend'],
  },
  {
    id: 'INS003',
    patientId: 'P007',
    patientName: 'Beatrice Fontaine',
    age: 76,
    riskScore: 68,
    riskLevel: 'High',
    trend: 'Elevated nocturnal urination pattern',
    trendDirection: 'up',
    trendPercent: 22,
    insight:
      'Nocturnal urination events (22:00–06:00) have increased by 22% over the past 2 weeks. With chronic kidney disease, this pattern is associated with reduced renal concentrating ability. Average daily events: 8.0 (vs. ward average: 5.5).',
    recommendation:
      'Reduce fluid intake after 18:00. Consult nephrologist for kidney function panel. Consider nocturia medication review. Ensure night-shift nurse checks every 2 hours.',
    generatedAt: '2026-06-13T13:00:00',
    confidence: 84,
    tags: ['CKD', 'Nocturia', 'Nocturnal Pattern'],
  },
  {
    id: 'INS004',
    patientId: 'P003',
    patientName: 'Eleanor Whitmore',
    age: 72,
    riskScore: 48,
    riskLevel: 'Moderate',
    trend: 'Stable urination pattern with mild increase',
    trendDirection: 'up',
    trendPercent: 8,
    insight:
      'Urination frequency shows a mild 8% increase this week. Parkinson\'s disease is often associated with overactive bladder and urge incontinence. Pattern remains within expected bounds but warrants continued monitoring.',
    recommendation:
      'Continue current monitoring schedule. Discuss bladder training exercises with physiotherapy. Evaluate if current Parkinson\'s medication dosage affects bladder function.',
    generatedAt: '2026-06-13T13:00:00',
    confidence: 79,
    tags: ["Parkinson's", 'Bladder Training', 'Stable'],
  },
  {
    id: 'INS005',
    patientId: 'P002',
    patientName: 'Robert Patel',
    age: 85,
    riskScore: 28,
    riskLevel: 'Low',
    trend: 'Improving continence pattern',
    trendDirection: 'down',
    trendPercent: 12,
    insight:
      'Urination frequency decreased by 12% compared to last week, indicating improved bladder control. Regular diaper change schedule has been maintained consistently. No high-wetness events in past 5 days. Patient demonstrates good response to current care plan.',
    recommendation:
      'Maintain current care plan. Consider extending diaper change intervals by 30 minutes as a trial. Continue hydration monitoring. Positive trajectory — share care plan with family.',
    generatedAt: '2026-06-13T13:00:00',
    confidence: 91,
    tags: ['Improving', 'Dementia', 'Low Risk', 'Positive Trend'],
  },
];

// ============================================================
// DASHBOARD STATS
// ============================================================
export const dashboardStats = {
  totalPatients: 12,
  activeAlerts: 5,
  connectedDevices: 10,
  todayEvents: 47,
  wetnessDistribution: {
    dry: 2,
    slightlyWet: 4,
    moderatelyWet: 4,
    saturated: 2,
  },
  deviceHealth: {
    online: 10,
    offline: 1,
    maintenance: 1,
  },
};

// ============================================================
// TEAM DATA
// ============================================================
export const teamMembers = [
  {
    name: 'Dr. Aisha Patel',
    role: 'Project Lead & System Architect',
    specialization: 'Biomedical Engineering',
    initials: 'AP',
    color: 'from-blue-500 to-blue-700',
  },
  {
    name: 'Marcus Chen',
    role: 'Frontend Developer',
    specialization: 'React & UI/UX Design',
    initials: 'MC',
    color: 'from-teal-500 to-teal-700',
  },
  {
    name: 'Priya Narayanan',
    role: 'IoT & Hardware Engineer',
    specialization: 'Embedded Systems & Sensors',
    initials: 'PN',
    color: 'from-indigo-500 to-indigo-700',
  },
  {
    name: 'Samuel Osei',
    role: 'AI & Data Scientist',
    specialization: 'Machine Learning & Analytics',
    initials: 'SO',
    color: 'from-cyan-500 to-cyan-700',
  },
];

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
