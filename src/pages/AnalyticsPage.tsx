import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  BarChart3,
  Activity,
  Clock,
  Droplets,
  Users,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { wetnessTrend, dailyFrequency, weeklyAnalytics } from '../data/mockData';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-xl p-3 text-xs">
        <p className="font-bold text-gray-700 mb-2">{label}</p>
        {payload.map((item: any) => (
          <div key={item.dataKey} className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-gray-600 capitalize">{item.dataKey.replace(/([A-Z])/g, ' $1')}: </span>
            <span className="font-bold text-gray-800">{item.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const statCards = [
  {
    label: 'Avg. Wetness Level',
    value: '48%',
    sub: 'Across all patients today',
    trend: '+5%',
    trendUp: true,
    icon: Droplets,
    color: 'from-blue-500 to-blue-700',
  },
  {
    label: 'Daily Event Count',
    value: '47',
    sub: 'Total urination events today',
    trend: '+4.4%',
    trendUp: true,
    icon: Activity,
    color: 'from-teal-500 to-cyan-600',
  },
  {
    label: 'Avg. Interval',
    value: '2.4 hrs',
    sub: 'Between urination events',
    trend: '-0.2h',
    trendUp: false,
    icon: Clock,
    color: 'from-purple-500 to-indigo-600',
  },
  {
    label: 'Monitored Patients',
    value: '12',
    sub: 'Data collected this week',
    trend: 'Stable',
    trendUp: true,
    icon: Users,
    color: 'from-green-500 to-emerald-600',
  },
];

export default function AnalyticsPage() {
  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h2 className="section-title">Analytics & Reports</h2>
        <p className="section-subtitle">Week of 7–13 June 2026 · All patients</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, sub, trend, trendUp, icon: Icon, color }) => (
          <div key={label} className="kpi-card">
            <div className="flex items-center justify-between">
              <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${color} flex items-center justify-center shadow`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                trendUp ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {trendUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {trend}
              </div>
            </div>
            <div>
              <p className="text-2xl font-extrabold text-gray-900">{value}</p>
              <p className="text-sm font-semibold text-gray-700">{label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ───── Wetness Trend (Area) ───── */}
      <div className="cp-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-gray-900 text-lg">Wetness Trend — 7 Day View</h3>
            <p className="text-xs text-gray-400 mt-0.5">Average wetness % across all patients · Hourly readings</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <div className="w-3 h-0.5 bg-primary-600 rounded" />
            <span>Wetness %</span>
            <div className="w-3 h-0.5 bg-amber-400 rounded ml-2" style={{ borderTop: '1.5px dashed' }} />
            <span>75% Threshold</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={wetnessTrend}>
            <defs>
              <linearGradient id="wetnessAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2} />
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
              angle={-30}
              textAnchor="end"
              height={40}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              width={35}
              tickFormatter={v => `${v}%`}
            />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={75}
              stroke="#f59e0b"
              strokeDasharray="5 5"
              strokeWidth={1.5}
              label={{ value: 'Alert Level', position: 'insideTopRight', fontSize: 10, fill: '#f59e0b' }}
            />
            <Area
              type="monotone"
              dataKey="wetness"
              stroke="#2563eb"
              strokeWidth={2.5}
              fill="url(#wetnessAreaGrad)"
              dot={false}
              activeDot={{ r: 5, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ───── Row 2: Frequency Bar + Weekly Line ───── */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Daily Urination Frequency */}
        <div className="cp-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Daily Urination Frequency</h3>
              <p className="text-xs text-gray-400 mt-0.5">Total events per day · All patients</p>
            </div>
            <BarChart3 className="w-5 h-5 text-gray-300" />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={dailyFrequency} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar
                dataKey="events"
                name="Events"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="avgEvents"
                name="Avg Events"
                fill="#e0e7ff"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </BarChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-primary-600" /><span className="text-xs text-gray-500">Actual Events</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-indigo-100" /><span className="text-xs text-gray-500">7-Day Average</span></div>
          </div>
        </div>

        {/* Weekly Analytics Line */}
        <div className="cp-card p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-gray-900">Weekly Patient Comparison</h3>
              <p className="text-xs text-gray-400 mt-0.5">Events per week · Top 3 patients</p>
            </div>
            <TrendingUp className="w-5 h-5 text-gray-300" />
          </div>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={weeklyAnalytics}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                width={30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '11px', marginTop: '8px' }}
                iconType="circle"
                iconSize={8}
              />
              <Line type="monotone" dataKey="patientA" name="M. Chen" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4, fill: '#2563eb', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="patientB" name="A. Mbeki" stroke="#0891b2" strokeWidth={2.5} dot={{ r: 4, fill: '#0891b2', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="patientC" name="B. Fontaine" stroke="#7c3aed" strokeWidth={2.5} dot={{ r: 4, fill: '#7c3aed', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="average" name="Ward Avg" stroke="#d1d5db" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ───── Interval Stats ───── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Shortest Interval', value: '45 min', patient: 'Arthur Mbeki', color: 'bg-red-50 border-red-200 text-red-700' },
          { label: 'Longest Interval', value: '4.2 hrs', patient: 'Robert Patel', color: 'bg-green-50 border-green-200 text-green-700' },
          { label: 'Ward Average', value: '2.4 hrs', patient: 'All patients', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: 'Peak Time', value: '03:00 AM', patient: 'Night shift spike', color: 'bg-purple-50 border-purple-200 text-purple-700' },
        ].map(({ label, value, patient, color }) => (
          <div key={label} className={`rounded-2xl border p-4 ${color}`}>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-semibold">{label}</span>
            </div>
            <p className="text-2xl font-extrabold mb-1">{value}</p>
            <p className="text-xs opacity-70">{patient}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
