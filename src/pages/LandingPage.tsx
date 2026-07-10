import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Droplets,
  Bell,
  BarChart3,
  Sparkles,
  Users,
  ChevronRight,
  Zap,
  Shield,
  Activity,
  ArrowRight,
  CheckCircle2,
  Wifi,
  Battery,
  AlertTriangle,
  TrendingUp,
} from 'lucide-react';

const features = [
  {
    icon: Droplets,
    title: 'Real-Time Wetness Monitoring',
    description:
      'Continuous moisture sensing with IoT-enabled smart diapers. Wetness levels are tracked every 30 seconds and visualized on the dashboard.',
    color: 'from-blue-500 to-blue-700',
    bg: 'bg-blue-50',
  },
  {
    icon: Bell,
    title: 'Smart Alert System',
    description:
      'Intelligent threshold-based alerts notify caregivers instantly when wetness levels exceed safe limits or devices go offline.',
    color: 'from-red-500 to-orange-600',
    bg: 'bg-red-50',
  },
  {
    icon: BarChart3,
    title: 'Wetness Analytics',
    description:
      'Detailed analytics on wetness detection frequency, patterns, and intervals. Visualize trends across days and weeks per patient.',
    color: 'from-teal-500 to-cyan-600',
    bg: 'bg-teal-50',
  },
  {
    icon: Sparkles,
    title: 'AI Health Insights',
    description:
      'AI-generated risk scores and personalized health insights help caregivers proactively manage patient urological health.',
    color: 'from-purple-500 to-indigo-600',
    bg: 'bg-purple-50',
  },
  {
    icon: Users,
    title: 'Multi-Patient Monitoring',
    description:
      'Monitor multiple patients simultaneously from a single dashboard. Color-coded status makes triage instant and efficient.',
    color: 'from-green-500 to-emerald-600',
    bg: 'bg-green-50',
  },
];

const workflowSteps = [
  {
    step: '01',
    title: 'Sensor Detects Moisture',
    description: 'Capacitive sensor in the smart diaper detects urine presence and measures wetness percentage.',
    icon: Droplets,
  },
  {
    step: '02',
    title: 'IoT Transmits Data',
    description: 'Microcontroller sends data wirelessly to the cloud server via BLE/Wi-Fi every 30 seconds.',
    icon: Wifi,
  },
  {
    step: '03',
    title: 'Dashboard Updates Live',
    description: 'CarePulse dashboard receives and displays real-time data with visual status indicators.',
    icon: Activity,
  },
  {
    step: '04',
    title: 'AI Analyzes Patterns',
    description: 'Machine learning models detect anomalies, trends, and generate personalized health risk scores.',
    icon: Sparkles,
  },
  {
    step: '05',
    title: 'Caregiver Gets Alerted',
    description: 'Smart notifications are sent to caregivers with severity-based priority and action recommendations.',
    icon: Bell,
  },
];

const benefits = [
  'Reduces diaper rash and skin infections by up to 60%',
  'Improves caregiver response time by 40%',
  'Enables data-driven urological health monitoring',
  'Supports early UTI and kidney issue detection',
  'Reduces unnecessary check-up interruptions for patients',
  'Generates exportable health reports for physicians',
];

const stats = [
  { value: '< 30s', label: 'Alert Response Time' },
  { value: '98.5%', label: 'Device Uptime' },
  { value: '12', label: 'Patients Monitored' },
  { value: '47', label: 'Events Tracked Today' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans overflow-x-hidden">
      {/* ───── Navbar ───── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
              <Heart className="w-4 h-4 text-white" fill="white" />
            </div>
            <span className="font-bold text-gray-900 text-lg">CarePulse</span>
            <span className="hidden sm:block text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full font-medium">
              v1.0.0
            </span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
            <a href="#features" className="hover:text-primary-600 transition-colors">Features</a>
            <a href="#workflow" className="hover:text-primary-600 transition-colors">How It Works</a>
            <a href="#system-impact" className="hover:text-primary-600 transition-colors">Impact</a>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/login')}
              className="cp-btn-secondary text-sm py-2 px-4"
            >
              Login
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="cp-btn-primary text-sm py-2 px-4 flex items-center gap-2"
            >
              View Dashboard <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </nav>

      {/* ───── Hero ───── */}
      <section className="relative pt-16 min-h-screen flex items-center overflow-hidden bg-gradient-hero">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left: Text */}
          <div className="animate-in">
            <div className="inline-flex items-center gap-2 bg-white/10 text-blue-200 px-4 py-2 rounded-full text-sm font-medium mb-8 backdrop-blur-sm border border-white/20">
              <Zap className="w-4 h-4 text-yellow-400" />
              Final Year Engineering Project
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight mb-6">
              AI-Enhanced
              <br />
              <span className="text-gradient-blue">Smart Diaper</span>
              <br />
              Monitoring
            </h1>
            <p className="text-lg text-slate-300 mb-10 leading-relaxed max-w-xl">
              CarePulse combines IoT sensors with intelligent analytics to transform geriatric care.
              Monitor wetness levels, receive smart alerts, and gain AI-powered insights — all in real time.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4 mb-12">
              <button
                onClick={() => navigate('/dashboard')}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white px-8 py-4 rounded-2xl font-bold text-base transition-all duration-200 shadow-glow-blue hover:shadow-xl hover:scale-105"
              >
                <LayoutDashboard className="w-5 h-5" />
                View Dashboard
                <ChevronRight className="w-4 h-4" />
              </button>
              <a
                href="#features"
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-2xl font-semibold text-base transition-all duration-200 backdrop-blur-sm"
              >
                Learn More
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {stats.map(({ value, label }) => (
                <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
                  <div className="text-2xl font-extrabold text-white">{value}</div>
                  <div className="text-xs text-slate-400 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Dashboard Preview Card */}
          <div className="hidden lg:block animate-in" style={{ animationDelay: '0.2s' }}>
            <div className="relative">
              {/* Floating alert cards */}
              <div className="absolute -top-8 -right-8 bg-white rounded-2xl shadow-2xl p-4 w-56 z-10 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold text-gray-900">Critical Alert</span>
                </div>
                <p className="text-xs text-gray-600">Arthur Mbeki – Wetness at 89%</p>
                <p className="text-xs text-red-500 font-semibold mt-1">Immediate change required</p>
              </div>

              <div className="absolute -bottom-6 -left-8 bg-white rounded-2xl shadow-2xl p-4 w-52 z-10 border border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-teal-500" />
                  <span className="text-xs font-bold text-gray-900">AI Insight</span>
                </div>
                <p className="text-xs text-gray-600">Risk score: <span className="text-orange-600 font-bold">72/100</span></p>
                <p className="text-xs text-gray-500 mt-1">↑ 18% frequency increase</p>
              </div>

              {/* Main dashboard preview */}
              <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
                <div className="bg-navy-900 px-4 py-3 flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-slate-400 font-mono">carepulse.dashboard</span>
                </div>
                <div className="p-6 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {[
                      { label: 'Total Patients', value: '12', color: 'bg-blue-500', icon: '👥' },
                      { label: 'Active Alerts', value: '5', color: 'bg-red-500', icon: '🔔' },
                      { label: 'Devices Online', value: '10', color: 'bg-green-500', icon: '📡' },
                      { label: "Today's Events", value: '47', color: 'bg-teal-500', icon: '📊' },
                    ].map(card => (
                      <div key={card.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">{card.label}</span>
                          <span>{card.icon}</span>
                        </div>
                        <div className="text-2xl font-extrabold text-gray-900">{card.value}</div>
                        <div className={`h-1 w-full rounded-full ${card.color} mt-2 opacity-30`} />
                      </div>
                    ))}
                  </div>

                  {/* Mini patient list */}
                  <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="px-3 py-2 border-b border-gray-50">
                      <span className="text-xs font-semibold text-gray-700">Patient Status</span>
                    </div>
                    {[
                      { name: 'Arthur Mbeki', wet: 89, status: 'Critical' },
                      { name: 'Margaret Chen', wet: 82, status: 'High' },
                      { name: 'Eleanor Whitmore', wet: 61, status: 'Moderate' },
                      { name: 'Robert Patel', wet: 28, status: 'Low' },
                    ].map(p => (
                      <div key={p.name} className="px-3 py-2 flex items-center gap-2 border-b border-gray-50 last:border-0">
                        <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                          {p.name[0]}
                        </div>
                        <span className="text-xs text-gray-700 flex-1">{p.name}</span>
                        <div className="flex items-center gap-1">
                          <div
                            className={`h-1.5 rounded-full ${
                              p.wet >= 75 ? 'bg-red-500' : p.wet >= 50 ? 'bg-amber-400' : 'bg-green-500'
                            }`}
                            style={{ width: `${p.wet * 0.4}px` }}
                          />
                          <span className="text-xs font-medium text-gray-600">{p.wet}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Features ───── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-primary-100 text-primary-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Sparkles className="w-4 h-4" />
              Key Features
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Everything Caregivers Need
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              A comprehensive monitoring ecosystem designed for modern geriatric care facilities.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, i) => (
              <div
                key={feature.title}
                className="cp-card p-6 group cursor-default"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}

            {/* CTA card */}
            <div className="cp-card p-6 bg-gradient-to-br from-primary-600 to-teal-600 border-0 text-white flex flex-col justify-between cursor-pointer group"
                 onClick={() => navigate('/dashboard')}>
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-5">
                  <ArrowRight className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3">See It In Action</h3>
                <p className="text-white/80 text-sm leading-relaxed">
                  Explore the full CarePulse dashboard with realistic patient data and live charts.
                </p>
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-white/90 group-hover:text-white transition-colors">
                Open Dashboard <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ───── Workflow ───── */}
      <section id="workflow" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <Activity className="w-4 h-4" />
              System Workflow
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              How CarePulse Works
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              From sensor to screen in under 30 seconds — here's the complete data pipeline.
            </p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden lg:block absolute top-16 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-200 via-teal-200 to-primary-200 mx-16" />

            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6">
              {workflowSteps.map((step, i) => (
                <div key={step.step} className="relative flex flex-col items-center text-center">
                  <div className="relative z-10 w-14 h-14 rounded-2xl bg-white border-2 border-primary-100 shadow-card flex items-center justify-center mb-4 group hover:border-primary-400 hover:shadow-glow-blue transition-all duration-200">
                    <step.icon className="w-6 h-6 text-primary-600" />
                    <div className="absolute -top-2.5 -right-2.5 w-6 h-6 rounded-full bg-primary-600 text-white text-xs font-bold flex items-center justify-center shadow">
                      {i + 1}
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 text-sm mb-2">{step.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── Benefits ───── */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-green-100 text-green-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
                <Shield className="w-4 h-4" />
                Clinical Benefits
              </div>
              <h2 className="text-4xl font-extrabold text-gray-900 mb-6">
                Better Care,<br />Better Outcomes
              </h2>
              <p className="text-gray-500 mb-10 leading-relaxed">
                CarePulse was designed in consultation with geriatric care specialists to address 
                real-world challenges in managing incontinence for elderly patients.
              </p>
              <div className="space-y-4">
                {benefits.map(benefit => (
                  <div key={benefit} className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { icon: Battery, label: '72h', sub: 'Battery Life', color: 'from-green-500 to-emerald-600' },
                { icon: Droplets, label: '±2%', sub: 'Sensor Accuracy', color: 'from-blue-500 to-blue-700' },
                { icon: Bell, label: '< 30s', sub: 'Alert Latency', color: 'from-red-500 to-rose-600' },
                { icon: Users, label: '100+', sub: 'Patient Capacity', color: 'from-purple-500 to-indigo-600' },
                { icon: Shield, label: 'AES-256', sub: 'Data Encryption', color: 'from-teal-500 to-cyan-600' },
                { icon: Activity, label: '24/7', sub: 'Monitoring', color: 'from-orange-500 to-amber-600' },
              ].map(({ icon: Icon, label, sub, color }) => (
                <div key={sub} className="cp-card p-5 flex flex-col items-center text-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-gray-900">{label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{sub}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ───── System Impact ───── */}
      <section id="system-impact" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-6">
              <TrendingUp className="w-4 h-4" />
              System Impact
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 mb-4">
              Measurable Healthcare Outcomes
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              Empowering facilities and families with automated, proactive diaper management.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Enhanced Patient Dignity',
                desc: 'Eliminates the need for manual checks, allowing elderly residents to enjoy undisturbed sleep and maintain personal dignity.',
                value: 'Zero',
                sub: 'Unnecessary Intrusion Checks',
                color: 'from-blue-500 to-indigo-600',
              },
              {
                title: 'Dermatological Safety',
                desc: 'Active alerts prevent prolonged exposure to moisture, significantly reducing incidence rates of diaper dermatitis, pressure ulcers, and skin infections.',
                value: '-60%',
                sub: 'Reduction in Diaper Rashes',
                color: 'from-teal-500 to-cyan-600',
              },
              {
                title: 'Operational Efficiency',
                desc: 'Caregivers receive targeted alerts, shifting the workflow from reactive/scheduled checking to proactive, needs-based care delivery.',
                value: '40%',
                sub: 'Improvement in Response Times',
                color: 'from-purple-500 to-pink-600',
              },
            ].map(item => (
              <div key={item.title} className="cp-card p-8 flex flex-col justify-between hover:shadow-xl transition-all border border-gray-100 bg-white">
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-3">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed mb-6">{item.desc}</p>
                </div>
                <div className="border-t border-gray-50 pt-6">
                  <div className={`text-4xl font-extrabold bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>{item.value}</div>
                  <div className="text-xs font-semibold text-gray-700 mt-1">{item.sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── CTA Banner ───── */}
      <section className="py-16 bg-gradient-hero">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-extrabold text-white mb-4">
            Ready to Explore CarePulse?
          </h2>
          <p className="text-slate-300 mb-8">
            View the full interactive dashboard with realistic patient data, live charts, and AI insights.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-primary-500 hover:bg-primary-400 text-white px-8 py-4 rounded-2xl font-bold text-base transition-all hover:scale-105 shadow-glow-blue"
            >
              View Dashboard <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => navigate('/login')}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-4 rounded-2xl font-semibold text-base transition-all backdrop-blur-sm"
            >
              Login Page
            </button>
          </div>
        </div>
      </section>

      {/* ───── Footer ───── */}
      <footer className="bg-navy-900 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary-600 flex items-center justify-center">
                <Heart className="w-4 h-4 text-white" fill="white" />
              </div>
              <div>
                <p className="text-white font-bold">CarePulse</p>
                <p className="text-slate-400 text-xs">AI-Enhanced Smart Diaper Monitoring System</p>
              </div>
            </div>
            <div className="text-center">
              <p className="text-slate-400 text-sm">Final Year Engineering Project — 2026</p>
              <p className="text-slate-500 text-xs mt-1">Smart Diaper Telemetry & Analysis System</p>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <Shield className="w-4 h-4" />
              <span>Built with React + TypeScript + Tailwind</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Re-export the missing icon reference
function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}
