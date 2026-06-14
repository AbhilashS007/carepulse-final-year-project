import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  Activity,
  Droplets,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { login, isAuthenticated } from '../services/authService';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAuthenticated()) {
      navigate('/dashboard');
    }
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      const errMsg = err.response?.data?.detail || 'Invalid email or password. Please verify your credentials.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* ───── Left Panel (Branding) ───── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col justify-between p-12 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-12 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 -right-12 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl" />
        </div>

        <div className="relative">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center shadow-glow-blue">
              <Heart className="w-6 h-6 text-white" fill="white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-none">CarePulse</h1>
              <p className="text-blue-300 text-xs mt-0.5">Smart Monitoring System</p>
            </div>
          </div>

          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6">
            Intelligent Care,<br />
            <span className="text-gradient-blue">Smarter Outcomes</span>
          </h2>
          <p className="text-slate-300 text-base leading-relaxed mb-12 max-w-md">
            Monitor patient wetness levels, receive real-time alerts, and access AI-powered 
            health insights — all from one unified platform.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {[
              { icon: Activity, text: 'Real-time wetness monitoring across all patients' },
              { icon: Zap, text: 'Instant alerts with < 30s response time' },
              { icon: Shield, text: 'AES-256 encrypted healthcare data' },
              { icon: Droplets, text: 'AI-powered urination pattern analysis' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-blue-300" />
                </div>
                <span className="text-slate-300 text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stats */}
        <div className="relative grid grid-cols-3 gap-4">
          {[
            { value: '12', label: 'Active Patients' },
            { value: '98.5%', label: 'System Uptime' },
            { value: '47', label: "Today's Events" },
          ].map(({ value, label }) => (
            <div key={label} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-center border border-white/10">
              <div className="text-2xl font-extrabold text-white">{value}</div>
              <div className="text-xs text-slate-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ───── Right Panel (Login Form) ───── */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <div className="w-10 h-10 rounded-2xl bg-primary-600 flex items-center justify-center">
            <Heart className="w-6 h-6 text-white" fill="white" />
          </div>
          <span className="font-bold text-xl text-gray-900">CarePulse</span>
        </div>

        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-500">Sign in to access the CarePulse monitoring dashboard.</p>
          </div>

          {/* Error Alert Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-red-700 animate-in text-left">
              <div className="p-1 rounded-full text-red-600 bg-red-100 mt-0.5">
                <Zap className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-950">Login Failed</p>
                <p className="text-xs text-red-700 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Hospital Email
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="you@hospital.com"
                />
              </div>
            </div>

            {/* Password field */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Remember me & forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4 rounded text-primary-600 border-gray-300 focus:ring-primary-500" />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <button type="button" className="text-sm text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                Forgot password?
              </button>
            </div>

            {/* Login button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full cp-btn-primary py-4 text-base flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Signing In...
                </>
              ) : (
                <>
                  Sign In <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-12">
            CarePulse — Final Year Engineering Project<br />
            © 2026 · All rights reserved
          </p>
        </div>
      </div>
    </div>
  );
}
