import {
  Users,
  Bell,
  Wifi,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Droplets,
  Battery,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getWetnessColor,
  getWetnessBg,
  getBatteryColor,
  getSeverityColor,
} from '../data/mockData';
import {
  getDashboardStats,
  getPatients,
  getAlerts,
  getWetnessTrend,
  getLatestTelemetry,
  getRecentTelemetry,
} from '../services/api';
import type { Telemetry } from '../services/api';
import LiveTelemetryCard from '../components/dashboard/LiveTelemetryCard';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl p-3">
        <p className="text-xs font-semibold text-gray-700 mb-1">{label}</p>
        <p className="text-xs text-primary-600">Wetness: <span className="font-bold">{payload[0]?.value}%</span></p>
      </div>
    );
  }
  return null;
};

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [patientsList, setPatientsList] = useState<any[]>([]);
  const [alertsList, setAlertsList] = useState<any[]>([]);
  const [trendList, setTrendList] = useState<any[]>([]);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    if (showLoading) setError(null);
    try {
      const [statsData, patientsData, alertsData, trendData] = await Promise.all([
        getDashboardStats(),
        getPatients(),
        getAlerts(),
        getWetnessTrend(),
      ]);
      setStats(statsData);
      setPatientsList(patientsData);
      setAlertsList(alertsData);
      setTrendList(trendData);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      if (showLoading) setError(err?.message || 'Unable to connect to the CarePulse API server. Please make sure the backend is running.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => loadData(false), 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  // ── Phase 4C: Independent telemetry polling (5s) ──────────
  const [liveTelemetry, setLiveTelemetry] = useState<Telemetry | null>(null);
  const [recentTelemetryList, setRecentTelemetryList] = useState<Telemetry[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(true);
  const [telemetryError, setTelemetryError] = useState(false);
  const telemetryMounted = useRef(true);

  const fetchTelemetry = useCallback(async () => {
    try {
      const [latest, recent] = await Promise.all([
        getLatestTelemetry(),
        getRecentTelemetry(50),
      ]);
      if (telemetryMounted.current) {
        setLiveTelemetry(latest);
        setRecentTelemetryList(recent);
        setTelemetryError(false);
        setTelemetryLoading(false);
      }
    } catch {
      if (telemetryMounted.current) {
        setTelemetryError(true);
        setTelemetryLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    telemetryMounted.current = true;
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 5000);
    return () => {
      telemetryMounted.current = false;
      clearInterval(interval);
    };
  }, [fetchTelemetry]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading dashboard telemetry...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4 max-w-md mx-auto mt-12 animate-in">
        <div className="p-3 bg-red-100 rounded-full text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Failed to load data</h3>
        <p className="text-sm text-red-700 text-center">{error}</p>
        <button
          onClick={loadData}
          className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const WETNESS_PIE = [
    { name: 'Dry', value: stats.wetnessDistribution.dry, color: '#10b981' },
    { name: 'Slightly Wet', value: stats.wetnessDistribution.slightlyWet, color: '#f59e0b' },
    { name: 'Moderately Wet', value: stats.wetnessDistribution.moderatelyWet, color: '#f97316' },
    { name: 'Saturated', value: stats.wetnessDistribution.saturated, color: '#ef4444' },
  ];

  const kpiCards = [
    {
      label: 'Total Patients',
      value: stats.totalPatients,
      icon: Users,
      iconBg: 'from-blue-500 to-blue-600',
      trend: '+2 this month',
      trendUp: true,
      description: 'Currently monitored',
    },
    {
      label: 'Active Alerts',
      value: stats.activeAlerts,
      icon: Bell,
      iconBg: 'from-red-500 to-rose-600',
      trend: `${alertsList.filter(a => !a.resolved && a.severity === 'Critical').length} critical, ${alertsList.filter(a => !a.resolved && a.severity === 'Warning').length} warnings`,
      trendUp: false,
      description: 'Require attention',
    },
    {
      label: 'Connected Devices',
      value: stats.connectedDevices,
      icon: Wifi,
      iconBg: 'from-green-500 to-emerald-600',
      trend: `${stats.deviceHealth.online}/${stats.totalPatients} online`,
      trendUp: true,
      description: 'IoT sensors active',
    },
    {
      label: "Today's Events",
      value: stats.todayEvents,
      icon: Activity,
      iconBg: 'from-teal-500 to-cyan-600',
      trend: '+4.4% vs yesterday',
      trendUp: true,
      description: 'Urination events logged',
    },
  ];

  const recentAlerts = alertsList.filter(a => !a.resolved).slice(0, 5);
  // Sort patients by risk score descending for the list
  const topPatients = [...patientsList].sort((a, b) => b.riskScore - a.riskScore).slice(0, 6);
  const trendData = trendList.slice(-16);

  // ── Phase 4C: Build live wetness trend from telemetry ────
  const liveTrendData = recentTelemetryList.length > 0
    ? [...recentTelemetryList]
        .reverse()          // oldest first for chart
        .slice(-20)
        .map(t => {
          const d = new Date(t.created_at);
          return {
            time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            wetness: t.wetness_percent,
            threshold: 75,
          };
        })
    : null;

  // Use live telemetry trend if available, otherwise fall back to existing analytics trend
  const chartData = liveTrendData && liveTrendData.length > 0 ? liveTrendData : trendData;
  const chartSubtitle = liveTrendData && liveTrendData.length > 0
    ? `Last ${liveTrendData.length} ESP32 readings`
    : 'Last 40 readings · Patient avg.';

  return (
    <div className="space-y-6 animate-in">
      {/* ───── Live Telemetry Card (Phase 4C) ───── */}
      <LiveTelemetryCard
        telemetry={liveTelemetry}
        recentTelemetry={recentTelemetryList}
        loading={telemetryLoading}
        error={telemetryError}
        onRefresh={fetchTelemetry}
      />

      {/* ───── KPI Cards ───── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {kpiCards.map(({ label, value, icon: Icon, iconBg, trend, trendUp, description }) => (
          <div key={label} className="kpi-card">
            <div className="flex items-start justify-between">
              <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-lg`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {trendUp ? '↑' : '↓'}
              </div>
            </div>
            <div>
              <p className="text-3xl font-extrabold text-gray-900">{value}</p>
              <p className="text-sm font-semibold text-gray-700 mt-0.5">{label}</p>
              <p className="text-xs text-gray-400 mt-1">{description}</p>
            </div>
            <div className="border-t border-gray-50 pt-3">
              <p className="text-xs text-gray-500">{trend}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ───── Row 2: Trend + Wetness Distribution ───── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Wetness Trend Chart */}
        <div className="lg:col-span-2 cp-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Wetness Trend</h3>
              <p className="text-xs text-gray-400 mt-0.5">{chartSubtitle}</p>
            </div>
            <span className="cp-badge-info">{liveTrendData ? 'ESP32 Live' : 'Analytics'}</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="wetnessGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                interval={4}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="threshold"
                stroke="#fbbf24"
                strokeWidth={1.5}
                strokeDasharray="4 4"
                fill="none"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="wetness"
                stroke="#2563eb"
                strokeWidth={2.5}
                fill="url(#wetnessGrad)"
                dot={false}
                activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-primary-600 rounded-full" />
              <span className="text-xs text-gray-500">Avg. Wetness</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-amber-400 rounded-full border-dashed" style={{ borderTop: '1.5px dashed #fbbf24', background: 'none' }} />
              <span className="text-xs text-gray-500">Alert Threshold (75%)</span>
            </div>
          </div>
        </div>

        {/* Wetness Distribution Pie */}
        <div className="cp-card p-6">
          <div className="mb-5">
            <h3 className="font-bold text-gray-900">Wetness Status</h3>
            <p className="text-xs text-gray-400 mt-0.5">All {stats.totalPatients} patients · Now</p>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={WETNESS_PIE}
                innerRadius={45}
                outerRadius={70}
                paddingAngle={3}
                dataKey="value"
              >
                {WETNESS_PIE.map((entry) => (
                  <Cell key={entry.name} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: unknown) => [`${value} patients`]}
                contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: 12 }}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {WETNESS_PIE.map(({ name, value, color }) => (
              <div key={name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-xs text-gray-600">{name}</span>
                </div>
                <span className="text-xs font-bold text-gray-900">{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── Row 3: Alerts + Patient Status + Device Health ───── */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Recent Alerts */}
        <div className="cp-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Recent Alerts</h3>
              <p className="text-xs text-gray-400 mt-0.5">Active unresolved</p>
            </div>
            <span className="cp-badge-danger">{recentAlerts.length} active</span>
          </div>
          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-8">No active alerts</p>
            ) : (
              recentAlerts.map(alert => (
                <div
                  key={alert.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors"
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                    alert.severity === 'Critical' ? 'bg-red-500' :
                    alert.severity === 'Warning' ? 'bg-amber-400' : 'bg-blue-400'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">{alert.patientName}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alert.message}</p>
                    <div className="flex items-center gap-1 mt-1.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getSeverityColor(alert.severity)}`}>
                        {alert.severity}
                      </span>
                      <span className="text-xs text-gray-400">·</span>
                      <span className="text-xs text-gray-400">
                        {new Date(alert.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Patient Status Summary */}
        <div className="cp-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Patient Summary</h3>
              <p className="text-xs text-gray-400 mt-0.5">Top 6 by risk</p>
            </div>
          </div>
          <div className="space-y-3">
            {topPatients.map(p => (
              <div key={p.id} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                  {p.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${getWetnessBg(p.wetnessPercent)}`}
                        style={{ width: `${p.wetnessPercent}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold ${getWetnessColor(p.wetnessPercent)}`}>
                      {p.wetnessPercent}%
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-xs font-bold ${getBatteryColor(p.batteryPercent)}`}>
                    🔋{p.batteryPercent}%
                  </div>
                  <div className={`text-xs mt-0.5 ${p.deviceStatus === 'Online' ? 'text-green-600' : 'text-red-500'}`}>
                    {p.deviceStatus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Device Health */}
        <div className="cp-card p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="font-bold text-gray-900">Device Health</h3>
              <p className="text-xs text-gray-400 mt-0.5">All {stats.totalPatients} IoT sensors</p>
            </div>
          </div>

          {/* Status counts */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Online', value: stats.deviceHealth.online, color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
              { label: 'Offline', value: stats.deviceHealth.offline, color: 'bg-red-100 text-red-700', icon: AlertTriangle },
              { label: 'Maint.', value: stats.deviceHealth.maintenance, color: 'bg-amber-100 text-amber-700', icon: Clock },
            ].map(({ label, value, color, icon: Icon }) => (
              <div key={label} className={`rounded-xl p-3 text-center ${color}`}>
                <Icon className="w-4 h-4 mx-auto mb-1" />
                <div className="text-lg font-extrabold">{value}</div>
                <div className="text-xs font-medium">{label}</div>
              </div>
            ))}
          </div>

          {/* Device list */}
          <div className="space-y-2">
            {patientsList.slice(0, 6).map(p => (
              <div key={p.id} className="flex items-center justify-between py-1.5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    p.deviceStatus === 'Online' ? 'bg-green-500' :
                    p.deviceStatus === 'Offline' ? 'bg-red-500' : 'bg-amber-400'
                  }`} />
                  <span className="text-xs text-gray-600 font-mono">{p.deviceId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Battery className={`w-3.5 h-3.5 ${getBatteryColor(p.batteryPercent)}`} />
                  <span className={`text-xs font-semibold ${getBatteryColor(p.batteryPercent)}`}>
                    {p.batteryPercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ───── Bottom Row: Quick Stats ───── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Droplets, label: 'Avg. Wetness', value: '48%', sub: 'Across all patients', color: 'text-blue-600 bg-blue-50' },
          { icon: Clock, label: 'Avg. Interval', value: '2.4 hrs', sub: 'Between changes', color: 'text-teal-600 bg-teal-50' },
          { icon: AlertTriangle, label: 'Critical Threshold', value: '75%', sub: 'Alert trigger level', color: 'text-red-600 bg-red-50' },
          { icon: Activity, label: 'System Uptime', value: '98.5%', sub: 'Last 30 days', color: 'text-green-600 bg-green-50' },
        ].map(({ icon: Icon, label, value, sub, color }) => (
          <div key={label} className="cp-card p-4 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-lg font-extrabold text-gray-900">{value}</p>
              <p className="text-xs font-semibold text-gray-700">{label}</p>
              <p className="text-xs text-gray-400">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
