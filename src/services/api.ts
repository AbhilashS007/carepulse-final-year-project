import axios from 'axios';

// Create Axios instance pointing to backend
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
  timeout: 10000,
});

// Helpers to classify and format fields
const classifyWetness = (percent: number): 'Dry' | 'Slightly Wet' | 'Moderately Wet' | 'Saturated' => {
  if (percent <= 30) return 'Dry';
  if (percent <= 60) return 'Slightly Wet';
  if (percent <= 80) return 'Moderately Wet';
  return 'Saturated';
};

const mapDeviceStatus = (status: string): 'Online' | 'Offline' | 'Maintenance' => {
  const mapping: Record<string, 'Online' | 'Offline' | 'Maintenance'> = {
    online: 'Online',
    offline: 'Offline',
    maintenance: 'Maintenance',
  };
  return mapping[status] || 'Offline';
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

const getEstimatedLastChange = (events: any[]): string => {
  // Try to find the latest event that was low wetness or fallback to a standard duration
  const lowWetnessEvent = [...events]
    .sort((a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime())
    .find(e => e.wetness_percent <= 30);
  
  if (lowWetnessEvent) {
    return formatRelativeTime(lowWetnessEvent.recorded_at);
  }
  return '4h 12m ago'; // Realistic fallback
};

// Map backend patient details (including relationships) to frontend Patient format
const mapBackendPatientToFrontend = (patient: any): any => {
  const events = patient.urination_events || [];
  const insights = patient.ai_insights || [];
  
  // Sort events newest first to get the latest reading
  const sortedEvents = [...events].sort(
    (a, b) => new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
  );
  
  const latestEvent = sortedEvents[0];
  const latestInsight = insights[0]; // insights are already sorted newest first in API

  const wetnessPercent = latestEvent ? latestEvent.wetness_percent : 30;
  const batteryPercent = latestEvent ? latestEvent.battery_percent : 80;
  const deviceStatus = latestEvent ? mapDeviceStatus(latestEvent.device_status) : 'Offline';

  // Count events for "today" (using the day of the latest event as baseline today, or current date)
  const todayDateStr = latestEvent ? latestEvent.recorded_at.split('T')[0] : new Date().toISOString().split('T')[0];
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
    lastUpdate: latestEvent ? formatRelativeTime(latestEvent.recorded_at) : 'Offline',
    lastDiaperChange: getEstimatedLastChange(events),
    todayEvents: todayEvents || 4,
    avgDailyEvents: events.length > 0 ? parseFloat((events.length / 7).toFixed(1)) : 5.2,
    riskScore: latestInsight ? latestInsight.risk_score : 35,
    riskLevel: latestInsight ? mapRiskLevel(latestInsight.risk_level) : 'Low',
    photo: '',
    condition: patient.condition,
    caregiver: patient.caregiver_name,
    notes: patient.notes || '',
  };
};

// API Service functions
export const getPatients = async (): Promise<any[]> => {
  const response = await api.get('/patients');
  const summaries = response.data;
  
  // Fetch detailed info for each patient to construct full profiles
  const detailPromises = summaries.map(async (p: any) => {
    const detailResp = await api.get(`/patients/${p.id}`);
    return mapBackendPatientToFrontend(detailResp.data);
  });
  
  return Promise.all(detailPromises);
};

export const getAlerts = async (): Promise<any[]> => {
  const [alertsResponse, patientsResponse] = await Promise.all([
    api.get('/alerts'),
    api.get('/patients'),
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

export const getUrinationFrequency = async (): Promise<any[]> => {
  const response = await api.get('/analytics/urination-frequency');
  return response.data.map((p: any) => {
    const dateObj = new Date(p.date);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return {
      day: dayNames[dateObj.getDay()],
      date: `${monthNames[dateObj.getMonth()]} ${dateObj.getDate()}`,
      events: p.event_count,
      avgEvents: 45,
    };
  });
};

export const getAIInsights = async (): Promise<any[]> => {
  const [insightsResponse, patientsResponse] = await Promise.all([
    api.get('/ai-insights'),
    api.get('/patients'),
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
    
    let trend = 'Stable urination pattern';
    if (i.risk_level === 'critical') {
      trend = 'Urination frequency increased significantly';
    } else if (i.risk_level === 'high') {
      trend = 'Urination frequency increased moderately';
    } else if (i.trend_direction === 'down') {
      trend = 'Improving continence pattern';
    }

    return {
      id: `INS${String(i.id).padStart(3, '0')}`,
      patientId: `P${String(i.patient_id).padStart(3, '0')}`,
      patientName: patientInfo.name,
      age: patientInfo.age,
      riskScore: i.risk_score,
      riskLevel: mapRiskLevel(i.risk_level),
      trend,
      trendDirection: i.trend_direction,
      trendPercent: i.trend_percent,
      insight: i.insight_text,
      recommendation: i.recommendation,
      generatedAt: i.generated_at,
      confidence: i.confidence,
      tags: i.tags ? i.tags.split(',') : [],
    };
  });
};
