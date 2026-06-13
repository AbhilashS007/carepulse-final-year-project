import { Bell, User, ChevronDown, Search, Wifi } from 'lucide-react';
import { useState } from 'react';
import { alerts } from '../../data/mockData';

const unresolved = alerts.filter(a => !a.resolved);

export default function TopBar({ title }: { title: string }) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30 shadow-sm">
      {/* Left: Page title */}
      <div>
        <h2 className="text-lg font-bold text-gray-900 leading-none">{title}</h2>
        <p className="text-xs text-gray-400 mt-0.5">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Search */}
        <div className="hidden md:flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-52">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search patients..."
            className="bg-transparent text-sm text-gray-600 placeholder:text-gray-400 outline-none flex-1"
          />
        </div>

        {/* System Status */}
        <div className="hidden md:flex items-center gap-1.5 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <Wifi className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-green-700">All Systems Online</span>
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 live-dot ml-1" />
        </div>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-10 h-10 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600" />
            {unresolved.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                {unresolved.length}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Active Alerts</h3>
                <span className="cp-badge-danger text-xs">{unresolved.length} unresolved</span>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-gray-50">
                {unresolved.map(alert => (
                  <div key={alert.id} className="p-3 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-2.5">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        alert.severity === 'Critical' ? 'bg-red-500' :
                        alert.severity === 'Warning' ? 'bg-amber-400' : 'bg-blue-400'
                      }`} />
                      <div>
                        <p className="text-xs font-semibold text-gray-800">{alert.patientName}</p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{alert.message}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(alert.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 border-t border-gray-50">
                <button className="w-full text-xs text-primary-600 font-semibold hover:text-primary-700 transition-colors">
                  View All Alerts →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <button className="flex items-center gap-2.5 pl-3 pr-1 py-1 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-gray-900 leading-none">Dr. Admin</p>
            <p className="text-xs text-gray-400 mt-0.5">Head of Geriatrics</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </button>
      </div>
    </header>
  );
}
