import { useState, useEffect } from 'react';
import { getDevices, type DeviceOverview } from '../services/api';
import { Wifi, WifiOff, AlertTriangle, Cpu, Clock, User, Signal } from 'lucide-react';

function relativeTime(dateStr: string): string {
  const d = new Date(dateStr).getTime();
  if (isNaN(d)) return 'Unknown';
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return `${diff} sec ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const days = Math.floor(h / 24);
  return `${days} days ago`;
}

export default function DevicesPage() {
  const [devices, setDevices] = useState<DeviceOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const fetchDevices = async () => {
      try {
        const data = await getDevices();
        if (mounted) {
          setDevices(data);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message || 'Failed to fetch devices');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDevices();
    const interval = setInterval(fetchDevices, 10000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4 animate-in">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Scanning device registry...</p>
      </div>
    );
  }

  if (error && devices.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50 border border-red-100 rounded-2xl max-w-md mx-auto mt-12 animate-in">
        <AlertTriangle className="w-10 h-10 text-red-500 mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-2">Device Sync Failed</h3>
        <p className="text-sm text-red-700 text-center mb-4">{error}</p>
        <button onClick={() => window.location.reload()} className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 transition-colors">
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="section-title flex items-center gap-2">
            <Cpu className="w-6 h-6 text-primary-600" />
            Device Registry
          </h2>
          <p className="section-subtitle">Manage ESP32 sensor units and monitor active telemetry streams</p>
        </div>
        <div className="flex gap-2">
           <div className="flex flex-col items-end mr-4">
              <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Total</span>
              <span className="text-2xl font-black text-gray-900">{devices.length}</span>
           </div>
           <div className="flex flex-col items-end mr-4">
              <span className="text-xs text-green-600 font-bold uppercase tracking-wider">Online</span>
              <span className="text-2xl font-black text-green-700">{devices.filter(d => d.status === 'online').length}</span>
           </div>
           <div className="flex flex-col items-end">
              <span className="text-xs text-primary-600 font-bold uppercase tracking-wider">Assigned</span>
              <span className="text-2xl font-black text-primary-700">{devices.filter(d => d.assigned_patient_id !== null).length}</span>
           </div>
        </div>
      </div>

      <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-card rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Device ID</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Assignment</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Last RSSI</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Last Packet</th>
                <th className="px-5 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Firmware</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50/80">
              {devices.map((device) => {
                const isOnline = device.status === 'online';
                return (
                  <tr key={device.device_id} className="hover:bg-primary-50/30 transition-colors group">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-xl border ${isOnline ? 'bg-green-50 border-green-100 text-green-600' : 'bg-gray-50 border-gray-200 text-gray-400'}`}>
                          {isOnline ? <Wifi className="w-4 h-4" /> : <WifiOff className="w-4 h-4" />}
                        </div>
                        <span className="font-mono font-bold text-sm text-gray-900">{device.device_id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                        isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></span>
                        {isOnline ? 'Online' : 'Offline'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {device.assigned_patient_id ? (
                        <div className="flex items-center gap-2 bg-primary-50 border border-primary-100 px-3 py-1.5 rounded-lg w-max">
                          <User className="w-3.5 h-3.5 text-primary-500" />
                          <span className="text-sm font-semibold text-primary-700">{device.assigned_patient_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm font-medium text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {device.wifi_rssi !== undefined && device.wifi_rssi !== null ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Signal className={`w-3.5 h-3.5 ${device.wifi_rssi >= -60 ? 'text-green-500' : device.wifi_rssi >= -80 ? 'text-yellow-500' : 'text-red-500'}`} />
                          <span className={device.wifi_rssi >= -60 ? 'text-green-700' : device.wifi_rssi >= -80 ? 'text-yellow-700' : 'text-red-700'}>
                            {device.wifi_rssi} dBm
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {device.last_packet_at ? (
                        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-gray-400" />
                          {relativeTime(device.last_packet_at)}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-mono font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md">
                        {device.firmware_version || 'Unknown'}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {devices.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No devices found in the registry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
