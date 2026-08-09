import axios from 'axios';

// Create Axios instance pointing to backend
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 10000,
});

// Add request interceptor to automatically attach the JWT access token
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('carepulse_token');
      if (token && token !== 'undefined' && token !== 'null') {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.error('Error reading token inside api.ts request interceptor:', e);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle session expiration or unauthorized requests
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      try {
        localStorage.removeItem('carepulse_token');
        localStorage.removeItem('carepulse_user');
      } catch (e) {
        console.error('Error removing token inside api.ts response interceptor:', e);
      }
      // Redirect to login page if currently on a protected route
      if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Helpers to classify and format fields
const classifyWetness = (percent: number): 'Dry' | 'Slightly Wet' | 'Moderately Wet' | 'Saturated' => {
  if (percent <= 30) return 'Dry';
  if (percent <= 60) return 'Slightly Wet';
  if (percent <= 80) return 'Moderately Wet';
  return 'Saturated';
};


const mapRiskLevel = (level: string): 'Low' | 'Moderate' | 'High' | 'Critical' => {
  const mapping: Record<string, 'Low' | 'Moderate' | 'High' | 'Critical'> = {
    low: 'Low',
    moderate: 'Moderate',
    high: 'High',
    critical: 'Critical',
  };
  return mapping[level] || 'Low';
};

const mapAlertType = (type: string): string => {
  const mapping: Record<string, string> = {
    high_wetness: 'High Wetness',
    low_battery: 'Low Battery',
    device_offline: 'Device Offline',
    diaper_changed: 'Diaper Changed',
    check_required: 'Check Required',
  };
  return mapping[type] || type;
};

const mapSeverity = (severity: string): 'Critical' | 'Warning' | 'Info' => {
  const mapping: Record<string, 'Critical' | 'Warning' | 'Info'> = {
    critical: 'Critical',
    warning: 'Warning',
    info: 'Info',
  };
  return mapping[severity] || 'Info';
};

const formatRelativeTime = (dateStr: string): string => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m ago`;
  
  return date.toLocaleDateString();
};

const getEstimatedLastChange = (events: any[], patientAlerts: any[] = []): string => {
  // First try to find a real diaper change alert
  const diaperAlerts = patientAlerts.filter(a => a.alert_type === 'diaper_changed')
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  
  if (diaperAlerts.length > 0) {
    return formatRelativeTime(diaperAlerts[0].created_at);
  }

  // Fallback to the latest event that was low wetness
  const lowWetnessEvent = [...events]
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .find(e => e.wetness_percent <= 30);
  
  if (lowWetnessEvent) {
    return formatRelativeTime(lowWetnessEvent.recorded_at);
  }
  return 'Never';
};

// ── Patient form payload (matches backend PatientCreate schema) ─────────
export interface PatientFormData {
  name:             string;
  age:              number;
  ward:             string;
  room:             string;
  condition:        string;
  caregiver_name:   string;
  device_id:        string;
  notes?:           string;
  // Disease profile (optional — Gemini Phase 2 readiness)
  disease?:         string;
  disease_severity?: string;  // mild | moderate | severe | critical
  diagnosis_date?:  string;   // ISO date "YYYY-MM-DD"
}

// ── Timeline event returned by getPatientDetail ────────────────────
export interface TimelineEvent {
  id:            string;
  type:          'created' | 'diagnosed' | 'alert' | 'insight' | 'urination';
  timestamp:     string;          // ISO datetime, used for sort order
  title:         string;
  description?:  string;
  severityColor: 'green' | 'indigo' | 'red' | 'amber' | 'blue' | 'gray';
}

// Map backend patient details (including relationships) to frontend Patient format
const mapBackendPatientToFrontend = (patient: any, liveDeviceStatus?: string): any => {
  const events = patient.urination_events || [];
  const insights = patient.ai_insights || [];
  const alerts = patient.alerts || [];
  
  // Sort events newest first to get the latest reading
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  
  const latestEvent = sortedEvents[0];
  const latestInsight = insights[0]; // insights are already sorted newest first in API

  const wetnessPercent = latestEvent ? latestEvent.wetness_percent : 0;
  const batteryPercent = latestEvent ? latestEvent.battery_percent : 0;
  
  // Compute device status: use live status from device registry if provided, otherwise fallback
  let deviceStatus = liveDeviceStatus || 'Never Connected';
  if (!liveDeviceStatus && latestEvent) {
    const ageSeconds = (new Date().getTime() - new Date(latestEvent.recorded_at + "Z").getTime()) / 1000;
    deviceStatus = ageSeconds <= 30 ? 'Online' : 'Offline';
  }

  // Count events for "today" (using current UTC date)
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayEvents = events.filter((e: any) => e.recorded_at.startsWith(todayDateStr)).length;

  return {
    id: `P${String(patient.id).padStart(3, '0')}`,
    name: patient.name,
    age: patient.age,
    ward: patient.ward,
    room: patient.room,
    wetnessPercent,
    wetnessLevel: classifyWetness(wetnessPercent),
    batteryPercent,
    deviceStatus,
    deviceId: patient.device_id,
    lastUpdate: latestEvent ? formatRelativeTime(latestEvent.recorded_at) : 'Never',
    lastDiaperChange: getEstimatedLastChange(events, alerts),
    todayEvents: todayEvents || 0,
    avgDailyEvents: events.length > 0 ? parseFloat((events.length / 7).toFixed(1)) : 0,
    riskScore: latestInsight ? latestInsight.risk_score : 0,
    riskLevel: latestInsight ? mapRiskLevel(latestInsight.risk_level) : 'Low',
    photo: '',
    condition: patient.condition,
    caregiver: patient.caregiver_name,
    notes: patient.notes || '',
    // ── Phase 1 new fields ─────────────────────────────────────
    isArchived:      patient.is_archived ?? false,
    // Disease profile (Gemini Phase 2 readiness)
    disease:         patient.disease         ?? undefined,
    diseaseSeverity: patient.disease_severity ?? undefined,
    diagnosisDate:   patient.diagnosis_date   ?? undefined,
  };
};

// API Service functions

// Per-patient detail (wetness trend + frequency + alerts + AI insight + timeline)
export const getPatientDetail = async (patientId: string): Promise<{
  wetnessTrend:       { time: string; wetness: number; threshold: number }[];
  urinationFrequency: { day: string; date: string; events: number }[];
  recentAlerts: {
    id: string; type: string; severity: string; message: string; timestamp: string; resolved: boolean;
  }[];
  latestInsight: {
    riskLevel: string; riskScore: number; confidence: number;
    recommendation: string; trend: string; trendDirection: string; trendPercent: number;
    insight: string;
    generatedAt: string;
    disease?: string;
    diseaseSeverity?: string;
  } | null;
  timelineEvents: TimelineEvent[];
}> => {
  // Extract numeric id from "P001" -> 1
  const numericId = parseInt(String(patientId).replace(/\D/g, ''), 10);
  const resp = await api.get(`/patients/${numericId}`);
  const data = resp.data;

  const events: any[] = (data.urination_events || []).sort(
    (a: any, b: any) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  // Build wetness trend: last 20 events as time-series data points
  const wetnessTrend = events.slice(-20).map((e: any) => {
    const d = new Date(e.recorded_at);
    const label = `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return { time: label, wetness: Math.round(e.wetness_percent), threshold: 75 };
  });

  // Build urination frequency: count events per day (last 7 distinct days)
  const dayMap = new Map<string, number>();
  events.forEach((e: any) => {
    const day = e.recorded_at.split('T')[0];
    dayMap.set(day, (dayMap.get(day) || 0) + 1);
  });
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const urinationFrequency = Array.from(dayMap.entries())
    .slice(-7)
    .map(([dateStr, count]) => {
      const d = new Date(dateStr);
      return { day: dayNames[d.getDay()], date: `${monthNames[d.getMonth()]} ${d.getDate()}`, events: count };
    });

  // Build recent alerts (latest 5, for this patient)
  const recentAlerts = (data.alerts || [])
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5)
    .map((a: any) => ({
      id: `A${String(a.id).padStart(3, '0')}`,
      type: mapAlertType(a.alert_type),
      severity: mapSeverity(a.severity),
      message: a.message,
      timestamp: a.created_at,
      resolved: a.resolved,
    }));

  // Latest AI insight
  const rawInsights: any[] = (data.ai_insights || []).sort(
    (a: any, b: any) => {
      const timeDiff = new Date(b.generated_at).getTime() - new Date(a.generated_at).getTime();
      if (timeDiff !== 0) return timeDiff;
      return (b.id || 0) - (a.id || 0);
    }
  );
  let latestInsight = null;
  if (rawInsights.length > 0) {
    const i = rawInsights[0];
    let trend = 'Stable wetness detection pattern';
    if (i.risk_level === 'critical') trend = 'Wetness detection frequency increased significantly';
    else if (i.risk_level === 'high') trend = 'Wetness detection frequency increased moderately';
    else if (i.trend_direction === 'down') trend = 'Improving continence pattern';
    latestInsight = {
      riskLevel: mapRiskLevel(i.risk_level),
      riskScore: i.risk_score,
      confidence: i.confidence,
      recommendation: i.recommendation,
      trend,
      trendDirection: i.trend_direction,
      trendPercent: i.trend_percent,
      insight: i.insight_text,
      generatedAt: i.generated_at,
      disease: data.disease,
      diseaseSeverity: data.disease_severity,
    };
  }

  // ── Build patient timeline (newest first) ────────────────────────────
  const allEvents: TimelineEvent[] = [];

  // 1. Patient created
  allEvents.push({
    id: 'created',
    type: 'created',
    timestamp: data.created_at,
    title: 'Patient Registered',
    description: `${data.name} admitted to ${data.ward}, Room ${data.room}`,
    severityColor: 'green',
  });

  // 2. Disease diagnosed (only if both diagnosis_date and disease are set)
  if (data.diagnosis_date && data.disease) {
    const sev = data.disease_severity
      ? ` — ${data.disease_severity.charAt(0).toUpperCase() + data.disease_severity.slice(1)} severity`
      : '';
    allEvents.push({
      id: 'diagnosed',
      type: 'diagnosed',
      timestamp: `${data.diagnosis_date}T00:00:00`,
      title: 'Disease Diagnosed',
      description: `${data.disease}${sev}`,
      severityColor: 'indigo',
    });
  }

  // 3. Alerts
  (data.alerts || []).forEach((a: any) => {
    const sevColor: TimelineEvent['severityColor'] =
      a.severity === 'critical' ? 'red' : a.severity === 'warning' ? 'amber' : 'blue';
    allEvents.push({
      id: `alert-${a.id}`,
      type: 'alert',
      timestamp: a.created_at,
      title: mapAlertType(a.alert_type),
      description: a.message,
      severityColor: sevColor,
    });
  });

  // 4. AI Insights
  (data.ai_insights || []).forEach((i: any) => {
    allEvents.push({
      id: `insight-${i.id}`,
      type: 'insight',
      timestamp: i.generated_at,
      title: `AI Insight — ${mapRiskLevel(i.risk_level)} Risk · ${i.risk_score}/100`,
      description: i.insight_text.length > 120
        ? i.insight_text.slice(0, 120) + '…'
        : i.insight_text,
      severityColor: 'indigo',
    });
  });

  // 5. Urination events (latest 10 to avoid flooding the timeline)
  const sortedByDesc = [...(data.urination_events || [])].sort(
    (a: any, b: any) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  sortedByDesc.slice(0, 10).forEach((e: any) => {
    const wCol: TimelineEvent['severityColor'] =
      e.wetness_percent > 80 ? 'red' : e.wetness_percent > 60 ? 'amber' : 'blue';
    allEvents.push({
      id: `event-${e.id}`,
      type: 'urination',
      timestamp: e.recorded_at,
      title: `Sensor Reading — ${Math.round(e.wetness_percent)}% Wetness`,
      description: `Battery ${Math.round(e.battery_percent)}% · ${e.device_status.charAt(0).toUpperCase() + e.device_status.slice(1)}`,
      severityColor: wCol,
    });
  });

  // Sort all events newest first
  allEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return { wetnessTrend, urinationFrequency, recentAlerts, latestInsight, timelineEvents: allEvents };
};

export const getPatients = async (filter: 'active' | 'archived' | 'all' = 'active'): Promise<any[]> => {
  const [response, devicesResponse] = await Promise.all([
    api.get('/patients', { params: { archived: filter } }),
    api.get('/devices')
  ]);
  const summaries = response.data;
  const devices = devicesResponse.data;
  
  const deviceStatusMap = new Map<string, string>();
  devices.forEach((d: any) => {
    deviceStatusMap.set(d.device_id, d.status === 'online' ? 'Online' : 'Offline');
  });
  
  // Fetch detailed info for each patient to construct full profiles
  const detailPromises = summaries.map(async (p: any) => {
    const detailResp = await api.get(`/patients/${p.id}`);
    const status = deviceStatusMap.get(p.device_id) || 'Never Connected';
    return mapBackendPatientToFrontend(detailResp.data, status);
  });
  
  return Promise.all(detailPromises);
};

// ── Write operations (Phase 1) ──────────────────────────────────

export const createPatient = async (data: PatientFormData): Promise<any> => {
  // Strip empty optional strings so the backend receives null (not "")
  const payload = {
    ...data,
    notes:            data.notes            || undefined,
    disease:          data.disease          || undefined,
    disease_severity: data.disease_severity || undefined,
    diagnosis_date:   data.diagnosis_date   || undefined,
  };
  const response = await api.post('/patients', payload);
  return response.data;
};

export const updatePatient = async (id: string, data: PatientFormData): Promise<any> => {
  const numericId = parseInt(id.replace(/\D/g, ''), 10);
  const payload = {
    ...data,
    notes:            data.notes            || undefined,
    disease:          data.disease          || undefined,
    disease_severity: data.disease_severity || undefined,
    diagnosis_date:   data.diagnosis_date   || undefined,
  };
  const response = await api.put(`/patients/${numericId}`, payload);
  return response.data;
};

export const archivePatient = async (id: string): Promise<void> => {
  const numericId = parseInt(id.replace(/\D/g, ''), 10);
  await api.patch(`/patients/${numericId}/archive`);
};

export const unarchivePatient = async (id: string): Promise<void> => {
  const numericId = parseInt(id.replace(/\D/g, ''), 10);
  await api.patch(`/patients/${numericId}/unarchive`);
};

export const performDiaperChange = async (patientId: string, notes?: string): Promise<any> => {
  const numericId = parseInt(String(patientId).replace(/\D/g, ''), 10);
  const response = await api.post(`/patients/${numericId}/diaper-change`, {
    changed_by: "Caregiver",
    notes: notes || undefined
  });
  return response.data;
};

// ── Devices ────────────────────────────────────────────────────────
export interface DeviceOverview {
  device_id: string;
  status: 'online' | 'offline';
  last_packet_at: string | null;
  firmware_version: string | null;
  wifi_rssi?: number | null;
  assigned_patient_id: number | null;
  assigned_patient_name: string | null;
}

export const getDevices = async (): Promise<DeviceOverview[]> => {
  const { data } = await api.get<DeviceOverview[]>('/devices');
  return data;
};

export const getAlerts = async (): Promise<any[]> => {
  const [alertsResponse, patientsResponse] = await Promise.all([
    api.get('/alerts'),
    api.get('/patients', { params: { archived: 'all' } }),
  ]);
  
  const rawAlerts = alertsResponse.data;
  const patientSummaries = patientsResponse.data;
  
  // Create patient name & device lookup maps
  const patientLookup = new Map<number, { name: string; deviceId: string }>();
  patientSummaries.forEach((p: any) => {
    patientLookup.set(p.id, { name: p.name, deviceId: p.device_id });
  });

  return rawAlerts.map((a: any) => {
    const patientInfo = patientLookup.get(a.patient_id) || { name: 'Unknown Patient', deviceId: 'CP-DEV-000' };
    return {
      id: `A${String(a.id).padStart(3, '0')}`,
      patientId: `P${String(a.patient_id).padStart(3, '0')}`,
      patientName: patientInfo.name,
      type: mapAlertType(a.alert_type),
      severity: mapSeverity(a.severity),
      message: a.message,
      timestamp: a.created_at,
      resolved: a.resolved,
      resolvedAt: a.resolved_at || undefined,
      deviceId: patientInfo.deviceId,
    };
  });
};

export const getDashboardStats = async (): Promise<any> => {
  const response = await api.get('/dashboard/stats');
  const d = response.data;
  return {
    totalPatients: d.total_patients,
    activeAlerts: d.active_alerts,
    connectedDevices: d.connected_devices,
    todayEvents: d.today_event_count,
    wetnessDistribution: {
      dry: d.count_dry,
      slightlyWet: d.count_slightly_wet,
      moderatelyWet: d.count_moderately_wet,
      saturated: d.count_saturated,
    },
    deviceHealth: {
      online: d.devices_online,
      offline: d.devices_offline,
      maintenance: d.devices_maintenance,
    }
  };
};

export const getWetnessTrend = async (): Promise<any[]> => {
  const response = await api.get('/analytics/wetness-trend');
  return response.data.map((p: any) => {
    const date = new Date(p.recorded_at);
    const month = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return {
      time: `${month} ${day} ${hours}:${mins}`,
      wetness: Math.round(p.avg_wetness),
      threshold: 75,
    };
  });
};

export const getAnalyticsStats = async (days: number = 7): Promise<any> => {
  const response = await api.get('/analytics/stats', { params: { days } });
  return response.data;
};

export const getUrinationFrequency = async (): Promise<any[]> => {
  const response = await api.get('/analytics/urination-frequency');
  const rawData = response.data;
  
  let totalEvents = 0;
  rawData.forEach((p: any) => { totalEvents += p.event_count; });
  const avg = rawData.length > 0 ? Math.round(totalEvents / rawData.length) : 0;

  return rawData.map((p: any) => {
    const dateObj = new Date(p.date);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: dayNames[dateObj.getDay()],
      date: `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`,
      events: p.event_count,
      avgEvents: avg,
    };
  });
};

export const getAIInsights = async (): Promise<any[]> => {
  const [insightsResponse, patientsResponse] = await Promise.all([
    api.get('/ai-insights'),
    api.get('/patients', { params: { archived: 'all' } }),
  ]);
  
  const rawInsights = insightsResponse.data;
  const patientSummaries = patientsResponse.data;

  // Create patient name & age lookup maps
  const patientLookup = new Map<number, { name: string; age: number }>();
  patientSummaries.forEach((p: any) => {
    patientLookup.set(p.id, { name: p.name, age: p.age });
  });

  return rawInsights.map((i: any) => {
    const patientInfo = patientLookup.get(i.patient_id) || { name: 'Unknown Patient', age: 70 };
    
    let trend = 'Stable wetness detection pattern';
    if (i.risk_level === 'critical') {
      trend = 'Wetness detection frequency increased significantly';
    } else if (i.risk_level === 'high') {
      trend = 'Wetness detection frequency increased moderately';
    } else if (i.trend_direction === 'down') {
      trend = 'Improving continence pattern';
    }

    return {
      id: `INS${String(i.id).padStart(3, '0')}`,
      patientId: `P${String(i.patient_id).padStart(3, '0')}`,
      patientName: patientInfo.name,
      age: patientInfo.age,
      disease: i.disease,
      diseaseSeverity: i.disease_severity,
      riskScore: i.risk_score,
      riskLevel: mapRiskLevel(i.risk_level),
      trend,
      trendDirection: i.trend_direction,
      trendPercent: i.trend_percent,
      insight: i.insight_text,
      riskExplanation: i.risk_explanation,
      recommendation: i.recommendation,
      monitoringAdvice: i.monitoring_advice,
      generatedAt: i.generated_at,
      confidence: i.confidence,
      generatedBy: i.generated_by || 'rule_engine',
      tags: i.tags ? i.tags.split(',') : [],
    };
  });
};

export const regenerateInsight = async (patientId: string): Promise<any> => {
  const numericId = parseInt(String(patientId).replace(/\D/g, ''), 10);
  const resp = await api.post(`/ai-insights/generate/${numericId}`);
  return resp.data;
};


// ================================================================
// GEMINI CLINICAL INTELLIGENCE (Phase 3)
// ================================================================

export interface GeminiReport {
  // Patient metadata
  patientId: number;
  patientName: string;
  patientAge: number;
  patientWard: string;
  patientRoom: string;
  disease: string | null;
  diseaseSeverity: string | null;
  diagnosisDuration: string | null;

  // Rule Engine fields (source of truth)
  riskScore: number;
  riskLevel: string;
  trendDirection: string;
  trendPercent: number;
  confidence: number;
  ruleEngineInsight: string;
  ruleEngineRiskExplanation: string | null;
  ruleEngineRecommendation: string;
  ruleEngineMonitoring: string | null;

  // Telemetry summary
  telemetryEventCount: number;
  telemetryAvgWetness: number;
  telemetryMaxWetness: number;
  telemetryAvgDailyFreq: number;

  // Alert summary
  alertActiveCount: number;
  alertCriticalActive: number;
  alertTotal7d: number;

  // Gemini narratives
  clinicalSummary: string;
  caregiverRecommendation: string;
  nursingNotes: string;
  monitoringPlan: string;
  priorityActions: string;
  patientExplanation: string;

  // Report metadata
  generatedAt: string;
  generatedByRisk: string;
  generatedByNarrative: string;
}

export const generateGeminiReport = async (patientId: string): Promise<GeminiReport> => {
  const numericId = parseInt(String(patientId).replace(/\D/g, ''), 10);
  const resp = await api.post(`/gemini/report/${numericId}`, null, {
    timeout: 30000, // 30s timeout for Gemini API calls
  });
  const d = resp.data;
  return {
    patientId: d.patient_id,
    patientName: d.patient_name,
    patientAge: d.patient_age,
    patientWard: d.patient_ward,
    patientRoom: d.patient_room,
    disease: d.disease,
    diseaseSeverity: d.disease_severity,
    diagnosisDuration: d.diagnosis_duration,
    riskScore: d.risk_score,
    riskLevel: mapRiskLevel(d.risk_level),
    trendDirection: d.trend_direction,
    trendPercent: d.trend_percent,
    confidence: d.confidence,
    ruleEngineInsight: d.rule_engine_insight,
    ruleEngineRiskExplanation: d.rule_engine_risk_explanation,
    ruleEngineRecommendation: d.rule_engine_recommendation,
    ruleEngineMonitoring: d.rule_engine_monitoring,
    telemetryEventCount: d.telemetry_event_count,
    telemetryAvgWetness: d.telemetry_avg_wetness,
    telemetryMaxWetness: d.telemetry_max_wetness,
    telemetryAvgDailyFreq: d.telemetry_avg_daily_freq,
    alertActiveCount: d.alert_active_count,
    alertCriticalActive: d.alert_critical_active,
    alertTotal7d: d.alert_total_7d,
    clinicalSummary: d.clinical_summary,
    caregiverRecommendation: d.caregiver_recommendation,
    nursingNotes: d.nursing_notes,
    monitoringPlan: d.monitoring_plan,
    priorityActions: d.priority_actions,
    patientExplanation: d.patient_explanation,
    generatedAt: d.generated_at,
    generatedByRisk: d.generated_by_risk,
    generatedByNarrative: d.generated_by_narrative,
  };
};


// ================================================================
// TELEMETRY (Phase 4C — Live Dashboard Integration)
// ================================================================

export interface Telemetry {
  id:               number;
  device_id:        string;
  moisture_raw:     number;
  wetness_percent:  number;
  battery_percent:  number;
  wifi_rssi:        number | null;
  firmware_version: string | null;
  esp32_timestamp:  string | null;
  created_at:       string;
}

/**
 * Fetch the single most recent telemetry reading.
 * Returns null if no telemetry exists yet (404 from backend).
 */
export const getLatestTelemetry = async (): Promise<Telemetry | null> => {
  try {
    const response = await api.get('/telemetry/latest');
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
};

/**
 * Fetch recent telemetry readings, newest first.
 * @param limit Maximum number of readings to return (default 50).
 */
export const getRecentTelemetry = async (limit: number = 50): Promise<Telemetry[]> => {
  try {
    const response = await api.get('/telemetry/recent', { params: { limit } });
    return response.data;
  } catch (err: any) {
    if (err?.response?.status === 404) return [];
    throw err;
  }
};

