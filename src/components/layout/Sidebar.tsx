import { cn } from '../../lib/utils';
import {
  LayoutDashboard,
  Users,
  Bell,
  BarChart3,
  Sparkles,
  Activity,
  ChevronRight,
  Heart,
} from 'lucide-react';
import { NavLink, useLocation } from 'react-router-dom';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Patients', icon: Users, path: '/patients' },
  { label: 'Alerts', icon: Bell, path: '/alerts' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'AI Insights', icon: Sparkles, path: '/ai-insights' },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 min-h-screen bg-gradient-sidebar flex flex-col shadow-sidebar shrink-0">
      {/* Logo */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary-500 flex items-center justify-center shadow-glow-blue">
            <Heart className="w-5 h-5 text-white" fill="white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none tracking-tight">CarePulse</h1>
            <p className="text-slate-400 text-xs mt-0.5">Smart Monitoring</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        <p className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
          Main Menu
        </p>
        {navItems.map(({ label, icon: Icon, path }) => {
          const isActive = location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              className={cn(
                'sidebar-item group',
                isActive && 'active'
              )}
            >
              <Icon className={cn(
                'w-5 h-5 shrink-0 transition-colors',
                isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'
              )} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-4 h-4 text-white/60" />}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="flex items-center gap-2 px-2">
          <div className="w-2 h-2 rounded-full bg-green-400 live-dot" />
          <span className="text-xs text-slate-400">System Online</span>
          <Activity className="w-3 h-3 text-slate-500 ml-auto" />
        </div>
        <div className="mt-3 px-2">
          <p className="text-xs text-slate-500">Final Year Project</p>
          <p className="text-xs text-slate-400 font-medium">Engineering Demo Build</p>
        </div>
      </div>
    </aside>
  );
}
