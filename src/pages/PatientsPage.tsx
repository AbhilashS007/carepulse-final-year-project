import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Search,
  ChevronRight,
  X,
  Wifi,
  WifiOff,
  Wrench,
  Battery,
  Clock,
  Activity,
  User,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  Bell,
  BarChart2,
  LineChart as LineChartIcon,
  UserPlus,
  Pencil,
  Archive,
  CheckCircle,
  History,
  Stethoscope,
  RefreshCw,
  FileText,
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  type Patient,
  getWetnessColor,
  getWetnessBg,
  getBatteryColor,
  getRiskColor,
} from '../data/mockData';
import { getPatients, getPatientDetail, regenerateInsight } from '../services/api';
import PatientFormModal  from '../components/patients/PatientFormModal';
import ArchiveConfirmDialog from '../components/patients/ArchiveConfirmDialog';
import PatientTimeline  from '../components/patients/PatientTimeline';
import GeminiReportModal from '../components/patients/GeminiReportModal';

// ── Types ──────────────────────────────────────────────────────
type PatientDetailData = Awaited<ReturnType<typeof getPatientDetail>>;

// ── Helpers ────────────────────────────────────────────────────
function WetnessBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getWetnessBg(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${getWetnessColor(percent)}`}>
        {percent}%
      </span>
    </div>
  );
}

function DeviceStatusBadge({ status }: { status: Patient['deviceStatus'] }) {
  const styles = {
    Online: 'text-green-700 bg-green-100',
    Offline: 'text-red-700 bg-red-100',
    Maintenance: 'text-amber-700 bg-amber-100',
  };
  const icons = {
    Online: <Wifi className="w-3 h-3" />,
    Offline: <WifiOff className="w-3 h-3" />,
    Maintenance: <Wrench className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

// ── Skeleton Loader ────────────────────────────────────────────
function Skeleton({ className }: { className?: string }) {
  return <div className={`bg-gray-100 rounded-lg animate-pulse ${className ?? ''}`} />;
}

function ChartSkeleton() {
  return (
    <div className="space-y-2 mt-2">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

// ── Severity badge colour ──────────────────────────────────────
function severityBadgeClass(severity: string) {
  if (severity === 'Critical') return 'bg-red-100 text-red-700';
  if (severity === 'Warning')  return 'bg-amber-100 text-amber-700';
  return 'bg-blue-100 text-blue-700';
}

function formatRelTs(ts: string) {
  const diff = Date.now() - new Date(ts).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(ts).toLocaleDateString();
}

// ── Disease severity badge ─────────────────────────────────────
function DiseaseSeverityBadge({ severity }: { severity: string | undefined }) {
  if (!severity) return null;
  const styles: Record<string, string> = {
    mild:     'bg-green-50 text-green-700 border-green-100',
    moderate: 'bg-amber-50 text-amber-700 border-amber-100',
    severe:   'bg-orange-50 text-orange-700 border-orange-100',
    critical: 'bg-red-50  text-red-700   border-red-100',
  };
  return (
    <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
      styles[severity] ?? 'bg-gray-50 text-gray-600 border-gray-200'
    }`}>
      {severity.charAt(0).toUpperCase() + severity.slice(1)}
    </span>
  );
}

// ── Main detail panel ─────────────────────────────────────────
function PatientDetailPanel({
  patient, onClose, onEdit, onArchive,
}: {
  patient:   Patient;
  onClose:   () => void;
  onEdit:    (p: Patient) => void;
  onArchive: (p: Patient) => void;
}) {
  const [detail, setDetail]   = useState<PatientDetailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [detailErr, setDetailErr] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'analytics' | 'timeline'>('analytics');
  const [regenerating, setRegenerating] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const loadDetail = useCallback((showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setDetailErr(null);
    }
    getPatientDetail(patient.id)
      .then(d => { 
        setDetail(d); 
        if (showLoading) setLoading(false); 
      })
      .catch(e => { 
        setDetailErr(e?.message || 'Failed to load analytics.'); 
        if (showLoading) setLoading(false); 
      });
  }, [patient.id]);

  useEffect(() => {
    loadDetail(true);
    const interval = setInterval(() => loadDetail(false), 5000);
    return () => clearInterval(interval);
  }, [loadDetail]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateInsight(patient.id);
      loadDetail();
    } catch (err) {
      console.error('Failed to regenerate insight:', err);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="cp-card p-6 animate-in overflow-y-auto max-h-[calc(100vh-120px)]">
      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg">
            {patient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
            <p className="text-sm text-gray-500">{patient.condition}</p>
            <p className="text-xs text-gray-400 mt-0.5">{patient.ward} · Room {patient.room}</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* ── Action row (Edit / Archive) ── */}
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={() => onEdit(patient)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                     border border-primary-200 bg-primary-50 text-primary-700
                     text-xs font-semibold hover:bg-primary-100 transition-colors"
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit Patient
        </button>
        <button
          onClick={() => onArchive(patient)}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl
                     border border-amber-200 bg-amber-50 text-amber-700
                     text-xs font-semibold hover:bg-amber-100 transition-colors"
        >
          <Archive className="w-3.5 h-3.5" />
          Archive
        </button>
      </div>

      {/* ── Disease Profile (if set) ── */}
      {patient.disease && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
            <span className="text-xs font-bold text-indigo-700">Disease Profile</span>
            <span className="ml-auto">
              <DiseaseSeverityBadge severity={patient.diseaseSeverity} />
            </span>
          </div>
          <p className="text-xs text-indigo-800 font-semibold">{patient.disease}</p>
          {patient.diagnosisDate && (
            <p className="text-[10px] text-indigo-500 mt-0.5">
              Diagnosed {new Date(patient.diagnosisDate).toLocaleDateString('en-GB', {
                day: '2-digit', month: 'short', year: 'numeric',
              })}
            </p>
          )}
        </div>
      )}

      {/* ── Status Grid ── */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Current Wetness</p>
          <p className={`text-2xl font-extrabold ${getWetnessColor(patient.wetnessPercent)}`}>{patient.wetnessPercent}%</p>
          <p className="text-xs text-gray-400 mt-0.5">{patient.wetnessLevel}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Battery Level</p>
          <p className={`text-2xl font-extrabold ${getBatteryColor(patient.batteryPercent)}`}>{patient.batteryPercent}%</p>
          <p className="text-xs text-gray-400 mt-0.5">{patient.deviceId}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Last Diaper Change</p>
          <p className="text-sm font-bold text-gray-900">{patient.lastDiaperChange}</p>
          <p className="text-xs text-gray-400 mt-0.5">ago</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Today's Events</p>
          <p className="text-2xl font-extrabold text-gray-900">{patient.todayEvents}</p>
          <p className="text-xs text-gray-400 mt-0.5">Avg: {patient.avgDailyEvents}/day</p>
        </div>
      </div>

      {/* ── Risk Score ── */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Risk Score</p>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${getRiskColor(patient.riskLevel)}`}>
            {patient.riskLevel} · {patient.riskScore}/100
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              patient.riskScore >= 80 ? 'bg-red-500' :
              patient.riskScore >= 60 ? 'bg-orange-500' :
              patient.riskScore >= 40 ? 'bg-amber-400' : 'bg-green-500'
            }`}
            style={{ width: `${patient.riskScore}%` }}
          />
        </div>
      </div>

      {/* ── Device + Caregiver ── */}
      <div className="space-y-3 border-t border-gray-50 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Device Status</span>
          </div>
          <DeviceStatusBadge status={patient.deviceStatus} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Assigned Nurse</span>
          </div>
          <span className="text-xs font-semibold text-gray-700">{patient.caregiver}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Last Update</span>
          </div>
          <span className="text-xs font-semibold text-gray-700">{patient.lastUpdate}</span>
        </div>
      </div>

      {/* ── Notes ── */}
      {patient.notes && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Caregiver Note</span>
          </div>
          <p className="text-xs text-amber-700">{patient.notes}</p>
        </div>
      )}

      {/* ════════════════════════════════════════════
          ANALYTICS / TIMELINE TABS
          ════════════════════════════════════════════ */}
      <div className="mt-5 pt-4 border-t border-gray-100">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'analytics'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('timeline')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'timeline'
                ? 'bg-white text-gray-800 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Timeline
          </button>
        </div>

        {/* ─── Analytics Tab ─── */}
        {activeTab === 'analytics' && (
          <div className="space-y-5">

            {/* ── Error state ── */}
            {detailErr && !loading && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600">
                <span className="font-semibold">Analytics unavailable: </span>{detailErr}
              </div>
            )}

            {/* ══ 1. Wetness Trend ══ */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <LineChartIcon className="w-4 h-4 text-primary-500" />
                <p className="text-sm font-semibold text-gray-700">Wetness Trend</p>
              </div>
              {loading ? <ChartSkeleton /> : !detail || detail.wetnessTrend.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No wetness data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={110}>
                  <LineChart data={detail.wetnessTrend} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="time" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false}
                      interval={Math.max(0, Math.floor(detail.wetnessTrend.length / 4) - 1)} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', padding: '4px 8px' }}
                      formatter={(v: any) => [`${v}%`, 'Wetness']}
                    />
                    <ReferenceLine y={75} stroke="#f97316" strokeDasharray="4 4" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="wetness" stroke="#0ea5e9" strokeWidth={2}
                      dot={false} activeDot={{ r: 4, fill: '#0ea5e9' }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              <p className="text-[10px] text-gray-400 mt-1">Orange line = 75% threshold</p>
            </div>

            {/* ══ 2. Urination Frequency ══ */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <BarChart2 className="w-4 h-4 text-teal-500" />
                <p className="text-sm font-semibold text-gray-700">Urination Frequency</p>
              </div>
              {loading ? <ChartSkeleton /> : !detail || detail.urinationFrequency.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No frequency data available.</p>
              ) : (
                <ResponsiveContainer width="100%" height={100}>
                  <BarChart data={detail.urinationFrequency} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 9, fill: '#9ca3af' }} tickLine={false} />
                    <Tooltip
                      contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e5e7eb', padding: '4px 8px' }}
                      formatter={(v: any) => [v, 'Events']}
                    />
                    <Bar dataKey="events" fill="#14b8a6" radius={[3, 3, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              )}
              <p className="text-[10px] text-gray-400 mt-1">Events per day (last 7 days)</p>
            </div>

            {/* ══ 3. Recent Alerts ══ */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Bell className="w-4 h-4 text-amber-500" />
                <p className="text-sm font-semibold text-gray-700">Recent Alerts</p>
              </div>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
              ) : !detail || detail.recentAlerts.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No alerts for this patient.</p>
              ) : (
                <div className="space-y-2">
                  {detail.recentAlerts.map(a => (
                    <div key={a.id} className="flex items-start gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                      <span className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${severityBadgeClass(a.severity)}`}>
                        {a.severity}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{a.type}</p>
                        <p className="text-[10px] text-gray-400">{formatRelTs(a.timestamp)}{a.resolved ? ' · Resolved' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ══ 4. Latest AI Insight ══ */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-indigo-500" />
                <p className="text-sm font-semibold text-gray-700">Latest AI Insight</p>
              </div>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                </div>
              ) : !detail || !detail.latestInsight ? (
                <p className="text-xs text-gray-400 italic">No AI insight available yet.</p>
              ) : (
                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
                  {/* Risk + Confidence row */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${getRiskColor(detail.latestInsight.riskLevel as any)}`}>
                      {detail.latestInsight.riskLevel} · {detail.latestInsight.riskScore}/100
                    </span>
                    <span className="text-xs text-indigo-600 font-semibold">
                      {detail.latestInsight.confidence}% confidence
                    </span>
                  </div>
                  {/* Trend */}
                  <div className="flex items-center gap-1.5">
                    {detail.latestInsight.trendDirection === 'up'   && <TrendingUp   className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    {detail.latestInsight.trendDirection === 'down' && <TrendingDown className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                    {detail.latestInsight.trendDirection === 'stable' && <Minus       className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
                    <p className="text-xs text-gray-700 font-medium">{detail.latestInsight.trend}</p>
                    {detail.latestInsight.trendPercent > 0 && (
                      <span className="text-[10px] text-gray-400 ml-auto shrink-0">
                        {detail.latestInsight.trendPercent}%
                      </span>
                    )}
                  </div>
                  {/* Disease Info */}
                  {detail.latestInsight.disease && (
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="text-xs font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md">
                        {detail.latestInsight.disease} {detail.latestInsight.diseaseSeverity ? `(${detail.latestInsight.diseaseSeverity})` : ''}
                      </span>
                    </div>
                  )}
                  {/* Clinical Summary */}
                  <p className="text-[11px] text-gray-700 leading-relaxed font-medium">
                    {detail.latestInsight.insight}
                  </p>
                  {/* Recommendation */}
                  <div className="mt-2 pt-2 border-t border-indigo-100/50">
                    <p className="text-[10px] font-bold text-indigo-900 mb-0.5 uppercase tracking-wide">Recommendation</p>
                    <p className="text-[11px] text-indigo-800 leading-relaxed">
                      {detail.latestInsight.recommendation}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* ══ 5. Regenerate Insight Button ══ */}
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-2
                         rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700
                         text-xs font-semibold hover:bg-indigo-100
                         disabled:opacity-50 disabled:cursor-not-allowed
                         transition-all active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Generating New Insight...' : 'Regenerate AI Insight'}
            </button>

            {/* ══ 6. Generate Clinical Report Button (Phase 3) ══ */}
            <button
              onClick={() => setReportOpen(true)}
              className="w-full flex items-center justify-center gap-2 py-2.5 mt-2
                         rounded-xl border border-purple-200
                         bg-gradient-to-r from-indigo-50 to-purple-50
                         text-purple-700
                         text-xs font-semibold hover:from-indigo-100 hover:to-purple-100
                         transition-all active:scale-[0.98]"
            >
              <FileText className="w-3.5 h-3.5" />
              Generate Clinical Report
            </button>

            {/* Gemini Clinical Report Modal */}
            <GeminiReportModal
              patientId={patient.id}
              patientName={patient.name}
              open={reportOpen}
              onClose={() => setReportOpen(false)}
            />
          </div>
        )}

        {/* ─── Timeline Tab ─── */}
        {activeTab === 'timeline' && (
          <div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex gap-3">
                    <Skeleton className="w-8 h-8 rounded-lg shrink-0" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-2 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <PatientTimeline events={detail?.timelineEvents ?? []} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
export default function PatientsPage() {
  const [patientsList,  setPatientsList]  = useState<Patient[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const [search,        setSearch]        = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sortKey,       setSortKey]       = useState<keyof Patient>('riskScore');
  const [sortDir,       setSortDir]       = useState<'asc' | 'desc'>('desc');
  const [filterStatus,  setFilterStatus]  = useState<string>('All');
  // Archived filter — controls which patients are fetched from the API
  const [archiveFilter, setArchiveFilter] = useState<'active' | 'archived' | 'all'>('active');

  // Modal state
  const [formOpen,    setFormOpen]    = useState(false);
  const [editPatient, setEditPatient] = useState<Patient | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Patient | null>(null);

  // Toast state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const [searchParams, setSearchParams] = useSearchParams();
  const selectId = searchParams.get('select');

  useEffect(() => {
    if (patientsList.length > 0) {
      if (selectId) {
        const found = patientsList.find(p => p.id === selectId);
        if (found) {
          setSelectedPatient(found);
        }
      } else {
        setSelectedPatient(null);
      }
    }
  }, [patientsList, selectId]);

  const loadPatients = useCallback(async (filter: typeof archiveFilter = archiveFilter, showLoading = true) => {
    if (showLoading) setLoading(true);
    if (showLoading) setError(null);
    try {
      const data = await getPatients(filter);
      setPatientsList(data);
      // Sync selected patient with new data if open
      setSelectedPatient(prev => {
        if (!prev) return prev;
        const updated = data.find(p => p.id === prev.id);
        return updated || prev;
      });
    } catch (err: any) {
      console.error('Error loading patients:', err);
      if (showLoading) setError(err?.message || 'Failed to fetch patients telemetry records.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [archiveFilter]);

  useEffect(() => {
    loadPatients(archiveFilter);
    const interval = setInterval(() => loadPatients(archiveFilter, false), 10000);
    return () => clearInterval(interval);
  }, [archiveFilter, loadPatients]);

  const handleSort = (key: keyof Patient) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: keyof Patient }) =>
    sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading patient status details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4 max-w-md mx-auto mt-12 animate-in">
        <div className="p-3 bg-red-100 rounded-full text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Failed to load patients</h3>
        <p className="text-sm text-red-700 text-center">{error}</p>
        <button
          onClick={() => loadPatients()}
          className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const filtered = patientsList
    .filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.condition.toLowerCase().includes(search.toLowerCase()) ||
        p.ward.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'All' || p.deviceStatus === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  return (
    <div className="space-y-5 animate-in">
      {/* ── Toast notification ── */}
      {toast && (
        <div
          className={`fixed top-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-2xl
                      shadow-lg text-sm font-semibold animate-in
                      ${
                        toast.type === 'success'
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}
        >
          {toast.type === 'success'
            ? <CheckCircle className="w-4 h-4" />
            : <AlertTriangle className="w-4 h-4" />
          }
          {toast.message}
        </div>
      )}

      {/* ── Modals ── */}
      <PatientFormModal
        open={formOpen}
        editPatient={editPatient}
        onClose={() => { setFormOpen(false); setEditPatient(null); }}
        onSaved={(isNew) => {
          setFormOpen(false);
          setEditPatient(null);
          loadPatients(archiveFilter);
          showToast(isNew ? 'Patient added successfully.' : 'Patient updated successfully.');
        }}
      />
      <ArchiveConfirmDialog
        patient={archiveTarget}
        onClose={() => setArchiveTarget(null)}
        onConfirmed={() => {
          setArchiveTarget(null);
          setSelectedPatient(null);
          setSearchParams({});
          loadPatients(archiveFilter);
          showToast('Patient archived successfully.');
        }}
        onError={(msg) => showToast(msg, 'error')}
      />

      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Patient Management</h2>
          <p className="section-subtitle">{patientsList.length} patients · {archiveFilter === 'archived' ? 'Archived' : archiveFilter === 'all' ? 'All' : 'Active'}</p>
        </div>

        {/* Right-side controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Active / Archived filter */}
          <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
            {(['active', 'archived', 'all'] as const).map(f => (
              <button
                key={f}
                onClick={() => {
                  setArchiveFilter(f);
                  setSelectedPatient(null);
                  setSearchParams({});
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  archiveFilter === f
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {f === 'active' ? 'Active' : f === 'archived' ? 'Archived' : 'All'}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-gray-600 placeholder:text-gray-400 outline-none w-44"
            />
          </div>

          {/* Device status sub-filter */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
            {['All', 'Online', 'Offline', 'Maintenance'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === s
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Add Patient button */}
          <button
            id="add-patient-btn"
            onClick={() => { setEditPatient(null); setFormOpen(true); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700
                       text-white rounded-xl text-sm font-semibold shadow-sm
                       transition-all active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            Add Patient
          </button>
        </div>
      </div>

      <div className={`grid gap-5 ${selectedPatient ? 'xl:grid-cols-3' : ''}`}>
        {/* Patient Table */}
        <div className={`cp-card overflow-hidden ${selectedPatient ? 'xl:col-span-2' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    { label: 'Patient',     key: 'name'           },
                    { label: 'Age',         key: 'age'            },
                    { label: 'Wetness',     key: 'wetnessPercent' },
                    { label: 'Battery',     key: 'batteryPercent' },
                    { label: 'Status',      key: 'deviceStatus'   },
                    { label: 'Risk',        key: 'riskScore'      },
                    { label: 'Last Update', key: 'lastUpdate'     },
                  ].map(({ label, key }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key as keyof Patient)}
                      className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                    >
                      {label} <span className="text-gray-300"><SortIcon field={key as keyof Patient} /></span>
                    </th>
                  ))}
                  {/* Actions column */}
                  <th className="px-5 py-3.5 text-xs font-bold text-gray-500 uppercase tracking-wide text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(patient => (
                  <tr
                    key={patient.id}
                    onClick={() => {
                      setSelectedPatient(patient);
                      setSearchParams({ select: patient.id });
                    }}
                    className={`table-row-hover cursor-pointer ${
                      selectedPatient?.id === patient.id
                        ? 'bg-blue-50 border-l-2 border-primary-500'
                        : patient.isArchived
                          ? 'opacity-60'
                          : ''
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                          {patient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-semibold text-gray-900">{patient.name}</p>
                            {patient.isArchived && (
                              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                ARCHIVED
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400">{patient.ward}</p>
                          {/* Disease badge in table */}
                          {patient.disease && (
                            <div className="flex items-center gap-1 mt-0.5">
                              <p className="text-[10px] text-indigo-500 font-medium">{patient.disease}</p>
                              <DiseaseSeverityBadge severity={patient.diseaseSeverity} />
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-700 font-medium">{patient.age}</span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[120px]">
                      <WetnessBar percent={patient.wetnessPercent} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Battery className={`w-4 h-4 ${getBatteryColor(patient.batteryPercent)}`} />
                        <span className={`text-sm font-semibold ${getBatteryColor(patient.batteryPercent)}`}>
                          {patient.batteryPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <DeviceStatusBadge status={patient.deviceStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getRiskColor(patient.riskLevel)}`}>
                        {patient.riskScore}/100
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-500">{patient.lastUpdate}</span>
                    </td>
                    {/* Actions */}
                    <td className="px-5 py-3.5" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          title="Edit patient"
                          onClick={() => { setEditPatient(patient); setFormOpen(true); }}
                          className="p-1.5 rounded-lg hover:bg-primary-50 text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {!patient.isArchived && (
                          <button
                            title="Archive patient"
                            onClick={() => setArchiveTarget(patient)}
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors"
                          >
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {patientsList.length} patients
            </p>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedPatient && (
          <PatientDetailPanel
            patient={selectedPatient}
            onClose={() => {
              setSelectedPatient(null);
              setSearchParams({});
            }}
            onEdit={(p) => { setEditPatient(p); setFormOpen(true); }}
            onArchive={(p) => setArchiveTarget(p)}
          />
        )}
      </div>
    </div>
  );
}
