import { Bell, User, ChevronDown, Search, Wifi, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { alerts, type Patient } from '../../data/mockData';
import { getCurrentUser, logout } from '../../services/authService';
import { getPatients } from '../../services/api';

const unresolved = alerts.filter(a => !a.resolved);

export default function TopBar({ title }: { title: string }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Search states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const currentUser = getCurrentUser();

  useEffect(() => {
    let active = true;
    getPatients()
      .then((data) => {
        if (active) setPatients(data);
      })
      .catch((err) => console.error('Failed to load patients in TopBar search:', err));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelectPatient = (patientId: string) => {
    navigate(`/patients?select=${patientId}`);
    setSearchQuery('');
    setIsFocused(false);
  };

  const filteredPatients = searchQuery.trim()
    ? patients.filter((patient) => {
        const query = searchQuery.toLowerCase();
        return (
          patient.name?.toLowerCase().includes(query) ||
          patient.room?.toLowerCase().includes(query) ||
          patient.caregiver?.toLowerCase().includes(query)
        );
      })
    : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
        <div className="relative hidden md:block" ref={searchRef}>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-52">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsFocused(true)}
              className="bg-transparent text-sm text-gray-600 placeholder:text-gray-400 outline-none flex-1"
            />
          </div>

          {isFocused && searchQuery && (
            <div className="absolute left-0 mt-1.5 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1 max-h-60 overflow-y-auto scrollbar-thin">
              {filteredPatients.length === 0 ? (
                <div className="px-4 py-3 text-xs text-gray-400 text-center">
                  No patients found
                </div>
              ) : (
                filteredPatients.map((patient) => (
                  <button
                    key={patient.id}
                    onClick={() => handleSelectPatient(patient.id)}
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 flex items-center gap-3 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                      {patient.name
                        .split(' ')
                        .map((n: string) => n[0])
                        .join('')
                        .slice(0, 2)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-gray-900 truncate">
                        {patient.name}
                      </p>
                      <p className="text-[10px] text-gray-400 truncate mt-0.5">
                        Room {patient.room} · {patient.caregiver}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
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
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-2.5 pl-3 pr-1.5 py-1 rounded-xl hover:bg-gray-50 border border-gray-200 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-gray-900 leading-none">
                {currentUser ? currentUser.full_name : 'Guest User'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">
                {currentUser ? currentUser.role : 'Guest'}
              </p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 top-12 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden py-1.5 animate-in">
              <div className="px-4 py-2 border-b border-gray-50 md:hidden">
                <p className="text-xs font-bold text-gray-900 truncate">
                  {currentUser ? currentUser.full_name : 'Guest User'}
                </p>
                <p className="text-xs text-gray-400 capitalize">
                  {currentUser ? currentUser.role : 'Guest'}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
