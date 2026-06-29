import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Tag,
  Brain,
  ArrowUp,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
} from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { type AIInsight, getRiskColor } from '../data/mockData';
import { getAIInsights, regenerateInsight } from '../services/api';
import GeminiReportModal from '../components/patients/GeminiReportModal';

function RiskGauge({ score }: { score: number }) {
  const clampedScore = Math.max(0, Math.min(100, score));
  const radius = 36;
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
        <svg width="88" height="88" viewBox="0 0 88 88">
          <circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke="#f1f5f9"
            strokeWidth="8"
          />
          <circle
            cx="44" cy="44" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform="rotate(-90 44 44)"
            style={{ transition: 'stroke-dashoffset 1s ease-out' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold text-gray-900">{score}</span>
          <span className="text-xs text-gray-400">/100</span>
        </div>
      </div>
    </div>
  );
}

function InsightCard({ insight, onRegenerated }: { insight: AIInsight; onRegenerated: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await regenerateInsight(insight.patientId);
      onRegenerated();
    } catch (err) {
      console.error('Failed to regenerate insight:', err);
    } finally {
      setRegenerating(false);
    }
  };

  const riskColors = {
    Low: 'border-green-200 bg-gradient-to-br from-green-50 to-white',
    Moderate: 'border-amber-200 bg-gradient-to-br from-amber-50 to-white',
    High: 'border-orange-200 bg-gradient-to-br from-orange-50 to-white',
    Critical: 'border-red-200 bg-gradient-to-br from-red-50 to-white',
  };

  const trendIcon = {
    up: <TrendingUp className="w-4 h-4 text-red-500" />,
    down: <TrendingDown className="w-4 h-4 text-green-500" />,
    stable: <Minus className="w-4 h-4 text-blue-500" />,
  };

  const trendColor = {
    up: 'text-red-600 bg-red-100',
    down: 'text-green-600 bg-green-100',
    stable: 'text-blue-600 bg-blue-100',
  };

  return (
    <div className={`rounded-2xl border-2 p-6 transition-all duration-300 hover:shadow-card-hover ${riskColors[insight.riskLevel]}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white text-sm font-extrabold shadow-lg">
            {insight.patientName.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">{insight.patientName}</h3>
            <p className="text-xs text-gray-500">Age {insight.age} · Patient ID: {insight.patientId}</p>
            {insight.disease && (
              <p className="text-xs font-semibold text-primary-600 mt-0.5">
                {insight.disease} {insight.diseaseSeverity ? `(${insight.diseaseSeverity})` : ''}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${getRiskColor(insight.riskLevel)}`}>
            {insight.riskLevel} Risk
          </span>
          <div className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${trendColor[insight.trendDirection]}`}>
            {trendIcon[insight.trendDirection]}
            {insight.trendDirection === 'up' ? '+' : insight.trendDirection === 'down' ? '-' : ''}
            {insight.trendPercent}% this week
          </div>
        </div>
      </div>

      {/* Gauge + Key info */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-white/60 rounded-xl border border-white/80">
        <RiskGauge score={insight.riskScore} />
        <div className="flex-1">
          <p className="text-xs font-semibold text-gray-500 mb-0.5">Risk Score</p>
          <p className="text-sm font-bold text-gray-800">{insight.trend}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <Brain className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs text-gray-500">AI Confidence: <span className="font-bold text-gray-700">{insight.confidence}%</span></span>
          </div>
        </div>
      </div>

      {/* Insight text & Risk Explanation */}
      <div className="mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Sparkles className="w-4 h-4 text-purple-600" />
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Clinical Summary</p>
        </div>
        <div className={`space-y-3 ${!expanded ? 'line-clamp-3' : ''}`}>
          <p className="text-sm text-gray-600 leading-relaxed">
            {insight.insight}
          </p>
          {insight.riskExplanation && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-1">Risk Explanation</p>
              <p className="text-sm text-gray-600 leading-relaxed">{insight.riskExplanation}</p>
            </div>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 text-xs text-primary-600 font-semibold mt-1.5 hover:text-primary-700 transition-colors"
        >
          {expanded ? (
            <><ChevronUp className="w-3.5 h-3.5" />Show Less</>
          ) : (
            <><ChevronDown className="w-3.5 h-3.5" />Read More</>
          )}
        </button>
      </div>

      {/* Recommendation & Monitoring Advice */}
      <div className={`rounded-xl p-3 border mb-4 ${
        insight.riskLevel === 'Critical' ? 'bg-red-50 border-red-200' :
        insight.riskLevel === 'High' ? 'bg-orange-50 border-orange-200' :
        insight.riskLevel === 'Moderate' ? 'bg-amber-50 border-amber-200' :
        'bg-green-50 border-green-200'
      }`}>
        <div className="flex items-center gap-1.5 mb-1.5">
          {insight.riskLevel === 'Low' ? (
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          )}
          <p className="text-xs font-bold text-gray-700">Action Plan</p>
        </div>
        <div className="space-y-2 mt-2">
          <div>
            <p className="text-xs font-bold text-gray-700 mb-0.5">Recommendation</p>
            <p className="text-xs text-gray-600 leading-relaxed">{insight.recommendation}</p>
          </div>
          {insight.monitoringAdvice && (
            <div>
              <p className="text-xs font-bold text-gray-700 mb-0.5">Monitoring Advice</p>
              <p className="text-xs text-gray-600 leading-relaxed">{insight.monitoringAdvice}</p>
            </div>
          )}
        </div>
      </div>

      {/* Tags + Timestamp */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {insight.tags.map(tag => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-medium"
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setReportOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                       bg-gradient-to-r from-indigo-100 to-purple-100 text-indigo-700
                       hover:from-indigo-200 hover:to-purple-200
                       transition-all active:scale-95"
          >
            <FileText className="w-3 h-3" />
            Generate Clinical Report
          </button>
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                       bg-purple-100 text-purple-700 hover:bg-purple-200
                       disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all active:scale-95"
          >
            <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
            {regenerating ? 'Generating...' : 'Regenerate'}
          </button>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            {new Date(insight.generatedAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} today
          </div>
        </div>
      </div>

      {/* Gemini Clinical Report Modal */}
      <GeminiReportModal
        patientId={insight.patientId}
        patientName={insight.patientName}
        open={reportOpen}
        onClose={() => setReportOpen(false)}
      />
    </div>
  );
}

export default function AIInsightsPage() {
  const [insightsList, setInsightsList] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'risk' | 'trend'>('risk');

  const loadInsights = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    if (showLoading) setError(null);
    try {
      const data = await getAIInsights();
      setInsightsList(data);
    } catch (err: any) {
      console.error('Error loading insights:', err);
      if (showLoading) setError(err?.message || 'Failed to connect to the CarePulse AI Insight services.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInsights();
    const interval = setInterval(() => loadInsights(false), 10000);
    return () => clearInterval(interval);
  }, [loadInsights]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Consulting AI diagnostics engine...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4 max-w-md mx-auto mt-12 animate-in">
        <div className="p-3 bg-red-100 rounded-full text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Failed to load AI Insights</h3>
        <p className="text-sm text-red-700 text-center">{error}</p>
        <button
          onClick={loadInsights}
          className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const sorted = [...insightsList].sort((a, b) => {
    if (sortBy === 'risk') return b.riskScore - a.riskScore;
    return b.trendPercent - a.trendPercent;
  });

  const avgRisk = insightsList.length > 0 ? Math.round(insightsList.reduce((s, i) => s + i.riskScore, 0) / insightsList.length) : 0;
  const criticalCount = insightsList.filter(i => i.riskLevel === 'Critical').length;
  const improvingCount = insightsList.filter(i => i.trendDirection === 'down').length;

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <h2 className="section-title">AI Health Insights</h2>
          </div>
          <p className="section-subtitle">
            Generated {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} at 13:00
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
          <button
            onClick={() => setSortBy('risk')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              sortBy === 'risk' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sort by Risk
          </button>
          <button
            onClick={() => setSortBy('trend')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              sortBy === 'trend' ? 'bg-purple-600 text-white' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Sort by Trend
          </button>
        </div>
      </div>

      {/* Summary banner */}
      <div className="cp-card p-5 bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900">AI Analysis Summary</h3>
            <p className="text-xs text-gray-500">Based on 7-day patient data · Updated hourly</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5 bg-purple-100 text-purple-700 px-3 py-1.5 rounded-full text-xs font-semibold">
            <div className="w-1.5 h-1.5 rounded-full bg-purple-500 live-dot" />
            Model Active
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Patients Analyzed', value: insightsList.length, icon: <CheckCircle2 className="w-4 h-4 text-green-500" /> },
            { label: 'Avg. Risk Score', value: `${avgRisk}/100`, icon: <AlertTriangle className="w-4 h-4 text-amber-500" /> },
            { label: 'Critical Cases', value: criticalCount, icon: <ArrowUp className="w-4 h-4 text-red-500" /> },
            { label: 'Improving', value: improvingCount, icon: <ArrowDown className="w-4 h-4 text-green-500" /> },
          ].map(({ label, value, icon }) => (
            <div key={label} className="bg-white/70 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                {icon}
                <span className="text-xs text-gray-500 font-medium">{label}</span>
              </div>
              <p className="text-xl font-extrabold text-gray-900">{value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Insight Cards Grid */}
      <div className="grid xl:grid-cols-2 gap-5">
        {sorted.map(insight => (
          <InsightCard key={insight.id} insight={insight} onRegenerated={loadInsights} />
        ))}
      </div>

      {/* Footer note */}
      <div className="text-center py-4">
        <p className="text-xs text-gray-400">
          🤖 AI insights are generated from monitoring data patterns to support caregiver decision making.
          Always consult qualified medical professionals for clinical decisions.
        </p>
      </div>
    </div>
  );
}
