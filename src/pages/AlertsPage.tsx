import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Bell,
  WifiOff,
  Battery,
  CheckCircle2,
  Clock,
  Filter,
  Search,
  Droplets,
  X,
} from 'lucide-react';
import { type Alert, getSeverityColor, formatTimestamp } from '../data/mockData';
import { getAlerts } from '../services/api';

function AlertTypeIcon({ type }: { type: Alert['type'] }) {
  const iconMap = {
    'High Wetness': <Droplets className="w-4 h-4 text-blue-600" />,
    'Low Battery': <Battery className="w-4 h-4 text-amber-600" />,
    'Device Offline': <WifiOff className="w-4 h-4 text-gray-500" />,
    'Diaper Changed': <CheckCircle2 className="w-4 h-4 text-green-600" />,
    'Check Required': <Bell className="w-4 h-4 text-purple-600" />,
  };
  return iconMap[type] ?? <Bell className="w-4 h-4 text-gray-400" />;
}

function AlertCard({ alert }: { alert: Alert }) {
  const bgMap = {
    Critical: 'border-red-200 bg-red-50',
    Warning: 'border-amber-200 bg-amber-50',
    Info: 'border-blue-200 bg-blue-50',
  };

  return (
    <div className={`rounded-2xl border p-4 ${bgMap[alert.severity]} transition-all hover:shadow-md`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          {/* Severity dot */}
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            alert.severity === 'Critical' ? 'bg-red-100' :
            alert.severity === 'Warning' ? 'bg-amber-100' : 'bg-blue-100'
          }`}>
            <AlertTypeIcon type={alert.type} />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-bold text-gray-900">{alert.patientName}</p>
              <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${getSeverityColor(alert.severity)}`}>
                {alert.severity}
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/80 text-gray-600 font-medium border border-gray-200">
                {alert.type}
              </span>
            </div>
            <p className="text-sm text-gray-600 mt-1.5">{alert.message}</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Clock className="w-3 h-3" />
                {formatTimestamp(alert.timestamp)}
              </div>
              <span className="text-gray-300">·</span>
              <span className="text-xs font-mono text-gray-400">{alert.deviceId}</span>
            </div>
          </div>
        </div>
        {!alert.resolved ? (
          <span className="shrink-0 w-2.5 h-2.5 rounded-full bg-red-500 mt-1 live-dot" />
        ) : (
          <div className="flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
            <span className="text-xs text-green-600 font-medium">Resolved</span>
          </div>
        )}
      </div>
      {alert.resolved && alert.resolvedAt && (
        <div className="mt-2 ml-13 pl-13 border-t border-white/50 pt-2">
          <p className="text-xs text-green-600">
            ✓ Resolved at {formatTimestamp(alert.resolvedAt)}
          </p>
        </div>
      )}
    </div>
  );
}

export default function AlertsPage() {
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<string>('All');
  const [filterType, setFilterType] = useState<string>('All');
  const [showResolved, setShowResolved] = useState(true);

  const handleTestNotification = () => {
    const mockAlert = {
      id: `TEST-${Date.now()}`,
      patientId: 'P010',
      patientName: 'Arthur Mbeki',
      type: 'High Wetness',
      severity: 'Critical',
      message: 'TEST ALERT: Critical wetness detected (Arthur Mbeki).',
      timestamp: new Date().toISOString(),
      resolved: false,
      deviceId: 'CP-DEV-010',
    };
    window.dispatchEvent(new CustomEvent('cp-test-alert', { detail: mockAlert }));
  };

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAlerts();
      setAlertsList(data);
    } catch (err: any) {
      console.error('Error loading alerts:', err);
      setError(err?.message || 'Failed to connect to the alerts database service.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading active alerts and history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4 max-w-md mx-auto mt-12 animate-in">
        <div className="p-3 bg-red-100 rounded-full text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Failed to load Alert Center</h3>
        <p className="text-sm text-red-700 text-center">{error}</p>
        <button
          onClick={loadAlerts}
          className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const activeAlerts = alertsList.filter(a => !a.resolved);
  const resolvedAlerts = alertsList.filter(a => a.resolved);

  const filteredAlerts = alertsList.filter(a => {
    const matchesSearch = a.patientName.toLowerCase().includes(search.toLowerCase()) ||
      a.message.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = filterSeverity === 'All' || a.severity === filterSeverity;
    const matchesType = filterType === 'All' || a.type === filterType;
    const matchesResolved = showResolved || !a.resolved;
    return matchesSearch && matchesSeverity && matchesType && matchesResolved;
  });

  const criticalCount = activeAlerts.filter(a => a.severity === 'Critical').length;
  const warningCount = activeAlerts.filter(a => a.severity === 'Warning').length;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Alert Center</h2>
          <p className="section-subtitle">
            {activeAlerts.length} active · {resolvedAlerts.length} resolved today
          </p>
        </div>
        <button
          onClick={handleTestNotification}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-semibold shadow transition-all active:scale-95 flex items-center gap-1.5"
        >
          <Bell className="w-3.5 h-3.5" />
          Test Notification
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Alerts', value: activeAlerts.length, color: 'bg-red-50 border-red-200', text: 'text-red-700', icon: Bell, iconBg: 'bg-red-100 text-red-600' },
          { label: 'Critical', value: criticalCount, color: 'bg-rose-50 border-rose-200', text: 'text-rose-700', icon: AlertTriangle, iconBg: 'bg-rose-100 text-rose-600' },
          { label: 'Warnings', value: warningCount, color: 'bg-amber-50 border-amber-200', text: 'text-amber-700', icon: Battery, iconBg: 'bg-amber-100 text-amber-600' },
          { label: 'Resolved Today', value: resolvedAlerts.length, color: 'bg-green-50 border-green-200', text: 'text-green-700', icon: CheckCircle2, iconBg: 'bg-green-100 text-green-600' },
        ].map(({ label, value, color, text, icon: Icon, iconBg }) => (
          <div key={label} className={`rounded-2xl border p-4 flex items-center gap-4 ${color}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className={`text-2xl font-extrabold ${text}`}>{value}</p>
              <p className="text-xs text-gray-600 font-medium">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ───── Active Alerts ───── */}
      <div className="cp-card p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 live-dot" />
          <h3 className="font-bold text-gray-900 text-lg">Active Alerts</h3>
          <span className="cp-badge-danger ml-auto">{activeAlerts.length} unresolved</span>
        </div>
        {activeAlerts.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-green-400" />
            <p className="font-medium">All clear! No active alerts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        )}
      </div>

      {/* ───── Alert History ───── */}
      <div className="cp-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <h3 className="font-bold text-gray-900 text-lg">Alert History</h3>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
              <Search className="w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="bg-transparent text-sm outline-none w-32 placeholder:text-gray-400"
              />
              {search && (
                <button onClick={() => setSearch('')}>
                  <X className="w-3 h-3 text-gray-400 hover:text-gray-600" />
                </button>
              )}
            </div>

            {/* Severity filter */}
            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
              {['All', 'Critical', 'Warning', 'Info'].map(s => (
                <button
                  key={s}
                  onClick={() => setFilterSeverity(s)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                    filterSeverity === s
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            {/* Type filter */}
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-2 outline-none text-gray-600 bg-white"
            >
              {['All', 'High Wetness', 'Low Battery', 'Device Offline', 'Diaper Changed', 'Check Required'].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>

            {/* Toggle resolved */}
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                onClick={() => setShowResolved(!showResolved)}
                className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer ${showResolved ? 'bg-primary-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${showResolved ? 'translate-x-4' : 'translate-x-0.5'}`} />
              </div>
              <span className="text-xs text-gray-600 font-medium">Show Resolved</span>
            </label>
          </div>
        </div>

        <div className="space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <Filter className="w-8 h-8 mx-auto mb-2" />
              <p className="text-sm">No alerts match your filters.</p>
            </div>
          ) : (
            filteredAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} />
            ))
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-400 text-center">
          Showing {filteredAlerts.length} of {alertsList.length} total alerts
        </div>
      </div>
    </div>
  );
}
