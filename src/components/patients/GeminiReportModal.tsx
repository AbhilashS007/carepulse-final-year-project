import { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  FileText,
  Heart,
  ClipboardList,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Download,
  TrendingUp,
  TrendingDown,
  Minus,
  Shield,
  Stethoscope,
  Loader2,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { type GeminiReport, generateGeminiReport } from '../../services/api';

interface GeminiReportModalProps {
  patientId: string;
  patientName: string;
  open: boolean;
  onClose: () => void;
}

// ── Risk gauge (reused design pattern) ─────────────────────────
function ReportRiskGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (clampedScore / 100) * circumference;

  const color =
    score >= 80 ? '#ef4444' :
    score >= 60 ? '#f97316' :
    score >= 40 ? '#f59e0b' :
    '#10b981';

  return (
    <div className="flex items-center justify-center">
      <div className="relative">
        <svg width="100" height="100" viewBox="0 0 100 100">
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="7"
          />
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="7"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold text-gray-900">{score}</span>
          <span className="text-[10px] text-gray-400">/100</span>
        </div>
      </div>
    </div>
  );
}

// ── Narrative section card ─────────────────────────────────────
function NarrativeSection({
  icon,
  title,
  content,
  accentColor = 'indigo',
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
  accentColor?: string;
}) {
  const bgColors: Record<string, string> = {
    indigo: 'bg-indigo-50 border-indigo-100',
    purple: 'bg-purple-50 border-purple-100',
    teal: 'bg-teal-50 border-teal-100',
    blue: 'bg-blue-50 border-blue-100',
    amber: 'bg-amber-50 border-amber-100',
    emerald: 'bg-emerald-50 border-emerald-100',
  };
  const titleColors: Record<string, string> = {
    indigo: 'text-indigo-700',
    purple: 'text-purple-700',
    teal: 'text-teal-700',
    blue: 'text-blue-700',
    amber: 'text-amber-700',
    emerald: 'text-emerald-700',
  };

  return (
    <div className={`rounded-xl border p-4 ${bgColors[accentColor] ?? bgColors.indigo}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <h4 className={`text-sm font-bold ${titleColors[accentColor] ?? titleColors.indigo}`}>
          {title}
        </h4>
      </div>
      <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
        {content}
      </div>
    </div>
  );
}

// ── Build plain-text export ────────────────────────────────────
function buildExportText(report: GeminiReport): string {
  const divider = '═'.repeat(60);
  const subDivider = '─'.repeat(60);

  return `
${divider}
  CAREPULSE CLINICAL REPORT
${divider}

PATIENT INFORMATION
${subDivider}
  Name:              ${report.patientName}
  Age:               ${report.patientAge}
  Ward:              ${report.patientWard}
  Room:              ${report.patientRoom}
  Disease:           ${report.disease ?? 'Not specified'}
  Severity:          ${report.diseaseSeverity ?? 'Not specified'}
  Diagnosis Duration:${report.diagnosisDuration ?? 'Not recorded'}

RULE ENGINE RISK ASSESSMENT
${subDivider}
  Risk Score:        ${report.riskScore}/100
  Risk Level:        ${report.riskLevel}
  Trend:             ${report.trendDirection} (${report.trendPercent}%)
  Confidence:        ${report.confidence}%

TELEMETRY SUMMARY (7-Day)
${subDivider}
  Total Events:      ${report.telemetryEventCount}
  Avg Wetness:       ${report.telemetryAvgWetness}%
  Peak Wetness:      ${report.telemetryMaxWetness}%
  Daily Frequency:   ${report.telemetryAvgDailyFreq} events/day

ALERT SUMMARY
${subDivider}
  Active Alerts:     ${report.alertActiveCount}
  Critical Active:   ${report.alertCriticalActive}
  Total (7 days):    ${report.alertTotal7d}

${'═'.repeat(60)}
  CLINICAL NARRATIVE (AI-Generated)
${'═'.repeat(60)}

CLINICAL SUMMARY
${subDivider}
${report.clinicalSummary}

CAREGIVER RECOMMENDATION
${subDivider}
${report.caregiverRecommendation}

NURSING NOTES
${subDivider}
${report.nursingNotes}

MONITORING PLAN
${subDivider}
${report.monitoringPlan}

PRIORITY ACTIONS (NEXT 24 HOURS)
${subDivider}
${report.priorityActions}

PATIENT-FRIENDLY EXPLANATION
${subDivider}
${report.patientExplanation}

${'═'.repeat(60)}
  REPORT METADATA
${'═'.repeat(60)}
  Generated by:          CarePulse AI Clinical Assistant
  Clinical Assessment:   ${report.generatedByRisk}
  Clinical Narrative:    ${report.generatedByNarrative}
  Generated On:          ${new Date(report.generatedAt).toLocaleString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: true,
  })}
${divider}
`.trim();
}

// ── Main modal component ───────────────────────────────────────
export default function GeminiReportModal({
  patientId,
  patientName,
  open,
  onClose,
}: GeminiReportModalProps) {
  const [report, setReport] = useState<GeminiReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && patientId) {
      loadReport();
    }
    return () => {
      setReport(null);
      setError(null);
    };
  }, [open, patientId]);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    setReport(null);
    try {
      const data = await generateGeminiReport(patientId);
      setReport(data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to generate clinical report.';
      setError(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!report) return;
    const text = buildExportText(report);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleExport = () => {
    if (!report) return;
    const text = buildExportText(report);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().split('T')[0];
    const safeName = report.patientName.replace(/[^a-zA-Z0-9]/g, '_');
    a.download = `CarePulse_Clinical_Report_${safeName}_${timestamp}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!open) return null;

  const riskLevelColors: Record<string, string> = {
    Low: 'text-green-700 bg-green-100',
    Moderate: 'text-amber-700 bg-amber-100',
    High: 'text-orange-700 bg-orange-100',
    Critical: 'text-red-700 bg-red-100',
  };

  const trendIcons: Record<string, React.ReactNode> = {
    up: <TrendingUp className="w-4 h-4 text-red-500" />,
    down: <TrendingDown className="w-4 h-4 text-green-500" />,
    stable: <Minus className="w-4 h-4 text-blue-500" />,
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity"
        onClick={onClose}
      />

      {/* Slide-out panel */}
      <div
        ref={panelRef}
        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl bg-white z-50
                   shadow-2xl overflow-y-auto
                   animate-in"
        style={{
          animation: 'slideInRight 0.3s ease-out',
        }}
      >
        {/* ── Header ── */}
        <div className="sticky top-0 z-10 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Clinical Report</h2>
                <p className="text-xs text-indigo-200">
                  {patientName} · Powered by CarePulse AI
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* ── Loading State ── */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-purple-400 rounded-full animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-900">Generating Clinical Report...</p>
                <p className="text-xs text-gray-500 mt-1">
                  Analyzing rule engine data with Gemini AI
                </p>
              </div>
              <div className="flex items-center gap-4 mt-4">
                {[
                  { label: 'Collecting Data', done: true },
                  { label: 'Running Analysis', done: true },
                  { label: 'Generating Narrative', done: false },
                ].map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    {step.done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                    ) : (
                      <Loader2 className="w-3.5 h-3.5 text-purple-500 animate-spin" />
                    )}
                    <span className={`text-[10px] font-medium ${step.done ? 'text-green-600' : 'text-purple-600'}`}>
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Error State ── */}
          {error && !loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="p-4 bg-red-100 rounded-2xl">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Report Generation Failed</h3>
              <p className="text-sm text-red-600 text-center max-w-sm">{error}</p>
              <button
                onClick={loadReport}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl
                           text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-md"
              >
                <RefreshCw className="w-4 h-4" />
                Retry
              </button>
            </div>
          )}

          {/* ── Report Content ── */}
          {report && !loading && (
            <div className="space-y-5">
              {/* Patient Info + Risk Summary Strip */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                <div className="flex items-start gap-4">
                  <ReportRiskGauge score={report.riskScore} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${riskLevelColors[report.riskLevel] ?? ''}`}>
                        {report.riskLevel} Risk
                      </span>
                      <div className="flex items-center gap-1 text-xs font-semibold text-gray-600">
                        {trendIcons[report.trendDirection]}
                        {report.trendDirection === 'up' ? '+' : report.trendDirection === 'down' ? '-' : ''}
                        {report.trendPercent}% trend
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-xs">
                        <span className="text-gray-400">Confidence</span>
                        <p className="font-bold text-gray-800">{report.confidence}%</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-400">Events (7d)</span>
                        <p className="font-bold text-gray-800">{report.telemetryEventCount}</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-400">Avg Wetness</span>
                        <p className="font-bold text-gray-800">{report.telemetryAvgWetness}%</p>
                      </div>
                      <div className="text-xs">
                        <span className="text-gray-400">Active Alerts</span>
                        <p className="font-bold text-gray-800">
                          {report.alertActiveCount}
                          {report.alertCriticalActive > 0 && (
                            <span className="text-red-600 ml-1">({report.alertCriticalActive} critical)</span>
                          )}
                        </p>
                      </div>
                    </div>
                    {report.disease && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <Stethoscope className="w-3 h-3 text-indigo-500" />
                        <span className="text-xs font-semibold text-indigo-700">
                          {report.disease}
                          {report.diseaseSeverity ? ` (${report.diseaseSeverity})` : ''}
                        </span>
                        {report.diagnosisDuration && (
                          <span className="text-[10px] text-gray-400 ml-1">
                            · {report.diagnosisDuration}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
                  <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                  AI Clinical Narrative
                </div>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
              </div>

              {/* Six Narrative Sections */}
              <NarrativeSection
                icon={<FileText className="w-4 h-4 text-indigo-500" />}
                title="Clinical Summary"
                content={report.clinicalSummary}
                accentColor="indigo"
              />
              <NarrativeSection
                icon={<Heart className="w-4 h-4 text-purple-500" />}
                title="Caregiver Recommendation"
                content={report.caregiverRecommendation}
                accentColor="purple"
              />
              <NarrativeSection
                icon={<ClipboardList className="w-4 h-4 text-teal-500" />}
                title="Nursing Notes"
                content={report.nursingNotes}
                accentColor="teal"
              />
              <NarrativeSection
                icon={<Activity className="w-4 h-4 text-blue-500" />}
                title="Monitoring Plan"
                content={report.monitoringPlan}
                accentColor="blue"
              />
              <NarrativeSection
                icon={<Zap className="w-4 h-4 text-amber-500" />}
                title="Priority Actions (Next 24 Hours)"
                content={report.priorityActions}
                accentColor="amber"
              />
              <NarrativeSection
                icon={<Heart className="w-4 h-4 text-emerald-500" />}
                title="Patient-Friendly Explanation"
                content={report.patientExplanation}
                accentColor="emerald"
              />

              {/* Report Metadata Footer */}
              <div className="mt-6 pt-4 border-t border-gray-200">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <span className="text-xs font-bold text-gray-600 uppercase tracking-wide">
                      Report Metadata
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-gray-400">Generated by</span>
                      <p className="font-semibold text-gray-700">CarePulse AI Clinical Assistant</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Clinical Risk Assessment</span>
                      <p className="font-semibold text-gray-700">{report.generatedByRisk}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Clinical Narrative</span>
                      <p className="font-semibold text-gray-700">{report.generatedByNarrative}</p>
                    </div>
                    <div>
                      <span className="text-gray-400">Generated On</span>
                      <p className="font-semibold text-gray-700">
                        {new Date(report.generatedAt).toLocaleString('en-GB', {
                          day: '2-digit', month: 'long', year: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                          hour12: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="sticky bottom-0 -mx-6 -mb-6 px-6 py-4 bg-white/90 backdrop-blur border-t border-gray-100">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleCopy}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                               border border-gray-200 bg-white text-gray-700
                               text-xs font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Report
                      </>
                    )}
                  </button>
                  <button
                    onClick={handleExport}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                               bg-gradient-to-r from-indigo-600 to-purple-600 text-white
                               text-xs font-semibold hover:from-indigo-700 hover:to-purple-700
                               active:scale-[0.98] transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4" />
                    Export Report
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CSS animation for slide-in */}
      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </>
  );
}
