import { Bell, User, ChevronDown, Search, Wifi, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { type Patient, type Alert } from '../../data/mockData';
import { getCurrentUser, logout } from '../../services/authService';
import { getPatients, getAlerts } from '../../services/api';

export default function TopBar({ title }: { title: string }) {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Search states
  const [patients, setPatients] = useState<Patient[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
    }
  };

  // Notification States
  const [alertsList, setAlertsList] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const processedAlertIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  const currentUser = getCurrentUser();

  const playAlertSound = () => {
    try {
      const audio = new Audio('/alert.mp3');
      audio.play().catch(err => {
        console.warn('Audio playback blocked by browser autocomplete/interaction policy:', err);
      });
    } catch (err) {
      console.error('Failed to play sound:', err);
    }
  };

  const showDesktopNotification = (alert: Alert) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        let title = `CarePulse Alert`;
        let body = `${alert.type}: ${alert.message}`;
        if (alert.type === 'High Wetness') {
          title = `CarePulse — Wetness Detected`;
          body = `Wetness detected for ${alert.patientName}. Caregiver attention may be required.`;
        } else {
          title = `${alert.severity} Alert: ${alert.patientName}`;
        }
        
        const options = {
          body,
          icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%232563eb'><path d='M12 21.593c-5.63-5.539-11-10.297-11-14.402 0-3.791 3.068-5.191 5.281-5.191 1.312 0 4.151.501 5.719 4.457 1.59-3.968 4.464-4.447 5.726-4.447 2.54 0 5.274 1.621 5.274 5.181 0 4.069-5.136 8.625-11 14.402z'/></svg>",
        };
        new Notification(title, options);
      } catch (err) {
        console.error('Failed to trigger browser desktop notification:', err);
      }
    }
  };

  const fetchAlerts = async () => {
    try {
      const allAlerts = await getAlerts();
      const unresolvedAlerts = allAlerts.filter(a => !a.resolved);

      // Sort by timestamp descending
      unresolvedAlerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (isInitialLoad.current) {
        unresolvedAlerts.forEach(a => processedAlertIds.current.add(a.id));
        setAlertsList(unresolvedAlerts);
        setUnreadCount(unresolvedAlerts.length);
        isInitialLoad.current = false;
        return;
      }

      const newAlerts: Alert[] = [];
      let newAlertsFound = false;
      let newCriticalFound = false;

      unresolvedAlerts.forEach((alert) => {
        if (!processedAlertIds.current.has(alert.id)) {
          processedAlertIds.current.add(alert.id);
          newAlerts.push(alert);
          newAlertsFound = true;
          if (alert.severity === 'Critical') {
            newCriticalFound = true;
          }
        }
      });

      if (newAlertsFound) {
        if (newCriticalFound) {
          playAlertSound();
        }
        newAlerts.forEach((alert) => {
          if (alert.type === 'High Wetness' || alert.severity === 'Critical') {
            showDesktopNotification(alert);
          }
        });

        setAlertsList(prev => {
          const merged = [...newAlerts, ...prev];
          const unique = merged.filter((item, index, self) =>
            self.findIndex(t => t.id === item.id) === index
          );
          return unique;
        });
        setUnreadCount(prev => prev + newAlerts.length);
      } else {
        setAlertsList(unresolvedAlerts);
      }
    } catch (err) {
      console.error('Error fetching alerts in TopBar:', err);
    }
  };

  useEffect(() => {
    // Permission is requested manually by the user via the dropdown button
  }, []);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(() => {
      fetchAlerts();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleTestAlert = (e: Event) => {
      const customEvent = e as CustomEvent<Alert>;
      const testAlert = customEvent.detail;
      
      if (!processedAlertIds.current.has(testAlert.id)) {
        processedAlertIds.current.add(testAlert.id);
        
        playAlertSound();
        if (testAlert.severity === 'Critical') {
          showDesktopNotification(testAlert);
        }

        setAlertsList(prev => [testAlert, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
    };
    
    window.addEventListener('cp-test-alert', handleTestAlert);
    return () => {
      window.removeEventListener('cp-test-alert', handleTestAlert);
    };
  }, []);

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
            onClick={() => {
              setShowNotifications(!showNotifications);
              setUnreadCount(0);
            }}
            className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              unreadCount > 0
                ? 'bg-red-50 border border-red-300 text-red-600 shadow-sm'
                : 'bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'animate-pulse text-red-500' : 'text-gray-600'}`} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white text-xs flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
              <div className="p-4 border-b border-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Active Alerts</h3>
                <span className="cp-badge-danger text-xs">{alertsList.length} unresolved</span>
              </div>
              <div className="max-h-64 overflow-y-auto scrollbar-thin divide-y divide-gray-50">
                {alertsList.length === 0 ? (
                  <div className="px-4 py-6 text-xs text-gray-400 text-center">
                    No active alerts
                  </div>
                ) : (
                  alertsList.map(alert => (
                    <div key={alert.id} className="p-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-2.5">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          alert.severity === 'Critical' ? 'bg-red-500' :
                          alert.severity === 'Warning' ? 'bg-amber-400' : 'bg-blue-400'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-bold text-gray-800 truncate">{alert.patientName}</p>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              alert.severity === 'Critical' ? 'bg-red-50 text-red-700' :
                              alert.severity === 'Warning' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                            }`}>
                              {alert.severity}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[10px] text-gray-400 font-semibold bg-gray-100 px-1.5 py-0.5 rounded">
                              {alert.type}
                            </span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(alert.timestamp).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 leading-relaxed">{alert.message}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-gray-50 flex flex-col gap-2">
                {'Notification' in window && (
                  notificationPermission === 'granted' ? (
                    <div className="w-full bg-green-50 text-green-700 text-[10px] font-bold py-1.5 rounded-lg border border-green-100 text-center flex items-center justify-center gap-1">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                      Desktop Notifications Enabled
                    </div>
                  ) : notificationPermission === 'denied' ? (
                    <div className="w-full bg-red-50 text-red-600 text-[10px] font-bold py-1.5 px-2 rounded-lg border border-red-100 text-center leading-tight">
                      Notifications blocked. Please enable them in your browser settings.
                    </div>
                  ) : (
                    <button
                      onClick={requestNotificationPermission}
                      className="w-full bg-blue-50 text-blue-600 text-[10px] font-bold py-1.5 rounded-lg border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      Enable Desktop Notifications
                    </button>
                  )
                )}
                <button
                  onClick={() => {
                    setShowNotifications(false);
                    navigate('/alerts');
                  }}
                  className="w-full text-xs text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                >
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
