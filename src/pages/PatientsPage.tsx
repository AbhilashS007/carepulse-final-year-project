import { useState, useEffect, useCallback } from 'react';
import {
  Search,
  ChevronRight,
  X,
  Wifi,
  WifiOff,
  Wrench,
  Battery,
  Clock,
  Activity,
  User,
  AlertTriangle,
} from 'lucide-react';
import {
  type Patient,
  getWetnessColor,
  getWetnessBg,
  getBatteryColor,
  getRiskColor,
} from '../data/mockData';
import { getPatients } from '../services/api';

function WetnessBar({ percent }: { percent: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getWetnessBg(percent)}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <span className={`text-xs font-bold w-8 text-right ${getWetnessColor(percent)}`}>
        {percent}%
      </span>
    </div>
  );
}

function DeviceStatusBadge({ status }: { status: Patient['deviceStatus'] }) {
  const styles = {
    Online: 'text-green-700 bg-green-100',
    Offline: 'text-red-700 bg-red-100',
    Maintenance: 'text-amber-700 bg-amber-100',
  };
  const icons = {
    Online: <Wifi className="w-3 h-3" />,
    Offline: <WifiOff className="w-3 h-3" />,
    Maintenance: <Wrench className="w-3 h-3" />,
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status]}`}>
      {icons[status]}
      {status}
    </span>
  );
}

function PatientDetailPanel({ patient, onClose }: { patient: Patient; onClose: () => void }) {
  return (
    <div className="cp-card p-6 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center text-white text-xl font-extrabold shadow-lg">
            {patient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">{patient.name}</h3>
            <p className="text-sm text-gray-500">{patient.condition}</p>
            <p className="text-xs text-gray-400 mt-0.5">{patient.ward} · Room {patient.room}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Status Grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Current Wetness</p>
          <p className={`text-2xl font-extrabold ${getWetnessColor(patient.wetnessPercent)}`}>
            {patient.wetnessPercent}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{patient.wetnessLevel}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Battery Level</p>
          <p className={`text-2xl font-extrabold ${getBatteryColor(patient.batteryPercent)}`}>
            {patient.batteryPercent}%
          </p>
          <p className="text-xs text-gray-400 mt-0.5">{patient.deviceId}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Last Diaper Change</p>
          <p className="text-sm font-bold text-gray-900">{patient.lastDiaperChange}</p>
          <p className="text-xs text-gray-400 mt-0.5">ago</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-xs text-gray-500 mb-1">Today's Events</p>
          <p className="text-2xl font-extrabold text-gray-900">{patient.todayEvents}</p>
          <p className="text-xs text-gray-400 mt-0.5">Avg: {patient.avgDailyEvents}/day</p>
        </div>
      </div>

      {/* Risk Score */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold text-gray-700">Risk Score</p>
          <span className={`text-sm font-bold px-3 py-1 rounded-full ${getRiskColor(patient.riskLevel)}`}>
            {patient.riskLevel} · {patient.riskScore}/100
          </span>
        </div>
        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              patient.riskScore >= 80 ? 'bg-red-500' :
              patient.riskScore >= 60 ? 'bg-orange-500' :
              patient.riskScore >= 40 ? 'bg-amber-400' : 'bg-green-500'
            }`}
            style={{ width: `${patient.riskScore}%` }}
          />
        </div>
      </div>

      {/* Device + Caregiver */}
      <div className="space-y-3 border-t border-gray-50 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Device Status</span>
          </div>
          <DeviceStatusBadge status={patient.deviceStatus} />
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Assigned Nurse</span>
          </div>
          <span className="text-xs font-semibold text-gray-700">{patient.caregiver}</span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500">Last Update</span>
          </div>
          <span className="text-xs font-semibold text-gray-700">{patient.lastUpdate}</span>
        </div>
      </div>

      {/* Notes */}
      {patient.notes && (
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-semibold text-amber-700">Caregiver Note</span>
          </div>
          <p className="text-xs text-amber-700">{patient.notes}</p>
        </div>
      )}
    </div>
  );
}

export default function PatientsPage() {
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [sortKey, setSortKey] = useState<keyof Patient>('riskScore');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<string>('All');

  const loadPatients = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPatients();
      setPatientsList(data);
      // Sync selected patient with new data if open
      if (selectedPatient) {
        const updated = data.find(p => p.id === selectedPatient.id);
        if (updated) setSelectedPatient(updated);
      }
    } catch (err: any) {
      console.error('Error loading patients:', err);
      setError(err?.message || 'Failed to fetch patients telemetry records.');
    } finally {
      setLoading(false);
    }
  }, [selectedPatient]);

  useEffect(() => {
    loadPatients();
  }, []);

  const handleSort = (key: keyof Patient) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const SortIcon = ({ field }: { field: keyof Patient }) =>
    sortKey === field ? (sortDir === 'asc' ? '↑' : '↓') : '↕';

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        <p className="text-gray-500 font-medium animate-pulse">Loading patient status details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50 border border-red-100 rounded-2xl space-y-4 max-w-md mx-auto mt-12 animate-in">
        <div className="p-3 bg-red-100 rounded-full text-red-600">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">Failed to load patients</h3>
        <p className="text-sm text-red-700 text-center">{error}</p>
        <button
          onClick={loadPatients}
          className="px-5 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 active:scale-95 transition-all shadow-md"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const filtered = patientsList
    .filter(p => {
      const matchesSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.condition.toLowerCase().includes(search.toLowerCase()) ||
        p.ward.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = filterStatus === 'All' || p.deviceStatus === filterStatus;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc'
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });

  return (
    <div className="space-y-5 animate-in">
      {/* Page Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="section-title">Patient Management</h2>
          <p className="section-subtitle">{patientsList.length} patients · All wards</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search patients..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="bg-transparent text-sm text-gray-600 placeholder:text-gray-400 outline-none w-44"
            />
          </div>
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-xl p-1">
            {['All', 'Online', 'Offline', 'Maintenance'].map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  filterStatus === s
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className={`grid gap-5 ${selectedPatient ? 'xl:grid-cols-3' : ''}`}>
        {/* Patient Table */}
        <div className={`cp-card overflow-hidden ${selectedPatient ? 'xl:col-span-2' : ''}`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {[
                    { label: 'Patient', key: 'name' },
                    { label: 'Age', key: 'age' },
                    { label: 'Wetness', key: 'wetnessPercent' },
                    { label: 'Battery', key: 'batteryPercent' },
                    { label: 'Status', key: 'deviceStatus' },
                    { label: 'Risk', key: 'riskScore' },
                    { label: 'Last Update', key: 'lastUpdate' },
                  ].map(({ label, key }) => (
                    <th
                      key={key}
                      onClick={() => handleSort(key as keyof Patient)}
                      className="text-left text-xs font-bold text-gray-500 uppercase tracking-wide px-5 py-3.5 cursor-pointer hover:text-gray-700 select-none whitespace-nowrap"
                    >
                      {label} <span className="text-gray-300"><SortIcon field={key as keyof Patient} /></span>
                    </th>
                  ))}
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(patient => (
                  <tr
                    key={patient.id}
                    onClick={() => setSelectedPatient(patient)}
                    className={`table-row-hover ${selectedPatient?.id === patient.id ? 'bg-blue-50 border-l-2 border-primary-500' : ''}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-400 to-teal-500 flex items-center justify-center text-white text-xs font-extrabold shrink-0">
                          {patient.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{patient.name}</p>
                          <p className="text-xs text-gray-400">{patient.ward}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-sm text-gray-700 font-medium">{patient.age}</span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[120px]">
                      <WetnessBar percent={patient.wetnessPercent} />
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1.5">
                        <Battery className={`w-4 h-4 ${getBatteryColor(patient.batteryPercent)}`} />
                        <span className={`text-sm font-semibold ${getBatteryColor(patient.batteryPercent)}`}>
                          {patient.batteryPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <DeviceStatusBadge status={patient.deviceStatus} />
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${getRiskColor(patient.riskLevel)}`}>
                        {patient.riskScore}/100
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-xs text-gray-500">{patient.lastUpdate}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-gray-50 bg-gray-50">
            <p className="text-xs text-gray-400">
              Showing {filtered.length} of {patientsList.length} patients
            </p>
          </div>
        </div>

        {/* Detail Panel */}
        {selectedPatient && (
          <PatientDetailPanel
            patient={selectedPatient}
            onClose={() => setSelectedPatient(null)}
          />
        )}
      </div>
    </div>
  );
}
