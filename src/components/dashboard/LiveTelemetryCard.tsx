/**
 * CarePulse — LiveTelemetryCard.tsx
 * -----------------------------------
 * Premium glassmorphism card showing real-time ESP32 telemetry.
 *
 * Sections:
 *   1. Live Status Banner — device id, status, last updated timer
 *   2. Metric Gauges      — wetness, battery, RSSI, firmware
 *   3. Telemetry History  — 10 most recent packets
 *   4. Connection Stats   — packets received, uptime, avg interval
 *
 * All state is driven by props from DashboardPage.
 * No API calls are made inside this component.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Wifi,
  WifiOff,
  Battery,
  Droplets,
  Signal,
  Cpu,
  RefreshCw,
  Clock,
  Radio,
  Activity,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { Telemetry } from '../services/api';

// ── Colour helpers ───────────────────────────────────────────

function wetnessColor(p: number) {
  if (p <= 30) return { text: 'text-green-600', bg: 'bg-green-500', ring: 'ring-green-200', label: 'Normal' };
  if (p <= 70) return { text: 'text-amber-500', bg: 'bg-amber-400', ring: 'ring-amber-200', label: 'Moderate' };
  return { text: 'text-red-600', bg: 'bg-red-500', ring: 'ring-red-200', label: 'High' };
}

function batteryColor(p: number) {
  if (p > 50)  return { text: 'text-green-600', bg: 'bg-green-500', label: 'Good' };
  if (p >= 20) return { text: 'text-amber-500', bg: 'bg-amber-400', label: 'Low' };
  return { text: 'text-red-600', bg: 'bg-red-500', label: 'Critical' };
}

function rssiQuality(rssi: number | null) {
  if (rssi === null) return { text: 'text-gray-400', label: 'N/A', icon: WifiOff };
  if (rssi > -60) return { text: 'text-green-600', label: 'Excellent', icon: Wifi };
  if (rssi >= -75) return { text: 'text-amber-500', label: 'Good', icon: Wifi };
  return { text: 'text-red-500', label: 'Weak', icon: Signal };
}

// ── Relative time formatter (updates every second) ───────────

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 5)  return 'just now';
  if (diff < 60) return `${diff} sec ago`;
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m ago`;
}

// ── Types ────────────────────────────────────────────────────

interface Props {
  telemetry:       Telemetry | null;
  recentTelemetry: Telemetry[];
  loading:         boolean;
  error:           boolean;
  onRefresh:       () => void;
}

// ── Component ────────────────────────────────────────────────

export default function LiveTelemetryCard({
  telemetry,
  recentTelemetry,
  loading,
  error,
  onRefresh,
}: Props) {
  // Relative time ticks every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Track the latest id to flash new rows
  const prevIdRef = useRef<number | null>(null);
  const isNewPacket = telemetry && telemetry.id !== prevIdRef.current;
  useEffect(() => {
    if (telemetry) prevIdRef.current = telemetry.id;
  }, [telemetry]);

  // Expandable history panel
  const [historyOpen, setHistoryOpen] = useState(true);

  // Refresh spinner
  const [spinning, setSpinning] = useState(false);
  const handleRefresh = useCallback(() => {
    setSpinning(true);
    onRefresh();
    setTimeout(() => setSpinning(false), 600);
  }, [onRefresh]);

  // ── Connection statistics (computed from recentTelemetry) ──
  const connStats = (() => {
    const count = recentTelemetry.length;
    if (count === 0) return { packets: 0, lastReceived: 'Never', uptime: 'N/A', avgInterval: 'N/A' };

    const lastReceived = relativeTime(recentTelemetry[0].created_at);

    // Compute average interval between consecutive packets
    let totalDiff = 0;
    let pairs = 0;
    for (let i = 0; i < count - 1; i++) {
      const t1 = new Date(recentTelemetry[i].created_at).getTime();
      const t2 = new Date(recentTelemetry[i + 1].created_at).getTime();
      totalDiff += Math.abs(t1 - t2);
      pairs++;
    }
    const avgMs = pairs > 0 ? totalDiff / pairs : 0;
    let avgInterval = 'N/A';
    if (avgMs > 0) {
      const s = Math.round(avgMs / 1000);
      if (s < 60) avgInterval = `${s}s`;
      else if (s < 3600) avgInterval = `${Math.floor(s / 60)}m ${s % 60}s`;
      else avgInterval = `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
    }

    // Uptime = span from oldest to newest
    const oldest = new Date(recentTelemetry[count - 1].created_at).getTime();
    const newest = new Date(recentTelemetry[0].created_at).getTime();
    const span = Math.round((newest - oldest) / 1000);
    let uptime = 'N/A';
    if (span > 0) {
      if (span < 60) uptime = `${span}s`;
      else if (span < 3600) uptime = `${Math.floor(span / 60)}m ${span % 60}s`;
      else uptime = `${Math.floor(span / 3600)}h ${Math.floor((span % 3600) / 60)}m`;
    }

    return { packets: count, lastReceived, uptime, avgInterval };
  })();

  // ── ONLINE / OFFLINE ─────────────────────────────────────
  const isOnline = telemetry
    ? (Date.now() - new Date(telemetry.created_at).getTime()) < 30_000
    : false;

  // ── Skeleton loader ──────────────────────────────────────
  if (loading && !telemetry) {
    return (
      <div className="telemetry-glass rounded-2xl p-6 shadow-card mb-6 animate-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="skeleton-block w-3 h-3 rounded-full" />
          <div className="skeleton-block h-5 w-40" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="skeleton-block h-4 w-16" />
              <div className="skeleton-block h-8 w-24" />
              <div className="skeleton-block h-3 w-12" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (error && !telemetry) {
    return (
      <div className="telemetry-glass rounded-2xl p-6 shadow-card mb-6 animate-in border-red-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <WifiOff className="w-5 h-5 text-red-500" />
            <div>
              <p className="font-bold text-red-700 text-sm">Telemetry Service Offline</p>
              <p className="text-xs text-red-500 mt-0.5">Retrying every 5 seconds...</p>
            </div>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
    );
  }

  // ── Empty state ──────────────────────────────────────────
  if (!telemetry) {
    return (
      <div className="telemetry-glass rounded-2xl p-6 shadow-card mb-6 animate-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <p className="font-semibold text-gray-500 text-sm">No telemetry received yet.</p>
          </div>
          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">Waiting for ESP32 device to send data...</p>
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────
  const w = wetnessColor(telemetry.wetness_percent);
  const b = batteryColor(telemetry.battery_percent);
  const r = rssiQuality(telemetry.wifi_rssi);
  const RssiIcon = r.icon;
  const historySlice = recentTelemetry.slice(0, 10);

  return (
    <div className="telemetry-glass rounded-2xl shadow-card mb-6 overflow-hidden animate-in">
      {/* ── Accent gradient border top ── */}
      <div className="h-1 bg-gradient-to-r from-green-400 via-teal-500 to-blue-600" />

      <div className="p-6">
        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500 live-dot' : 'bg-gray-300'}`} />
              {isOnline && (
                <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-400 animate-ping opacity-40" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm tracking-wide uppercase flex items-center gap-2">
                Live Telemetry
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isOnline ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE'}
                </span>
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">
                {isOnline
                  ? `Updated ${relativeTime(telemetry.created_at)}`
                  : 'Waiting for device...'}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-gray-50 text-gray-500 hover:bg-primary-50 hover:text-primary-600 transition-all duration-200"
            title="Refresh telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${spinning ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* ── Metric gauges ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          {/* Device */}
          <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Cpu className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-500 font-medium">Device</span>
            </div>
            <p className="text-sm font-bold text-gray-900 font-mono telemetry-value">{telemetry.device_id}</p>
          </div>

          {/* Wetness */}
          <div className={`bg-white/70 rounded-xl p-3 border border-gray-100 ring-1 ${w.ring}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets className={`w-3.5 h-3.5 ${w.text}`} />
              <span className="text-xs text-gray-500 font-medium">Wetness</span>
            </div>
            <p className={`text-2xl font-extrabold telemetry-value ${w.text}`}>
              {telemetry.wetness_percent}<span className="text-sm font-bold">%</span>
            </p>
            <p className={`text-xs font-medium ${w.text} mt-0.5`}>{w.label}</p>
          </div>

          {/* Battery */}
          <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Battery className={`w-3.5 h-3.5 ${b.text}`} />
              <span className="text-xs text-gray-500 font-medium">Battery</span>
            </div>
            <p className={`text-2xl font-extrabold telemetry-value ${b.text}`}>
              {telemetry.battery_percent}<span className="text-sm font-bold">%</span>
            </p>
            <p className={`text-xs font-medium ${b.text} mt-0.5`}>{b.label}</p>
          </div>

          {/* RSSI */}
          <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <RssiIcon className={`w-3.5 h-3.5 ${r.text}`} />
              <span className="text-xs text-gray-500 font-medium">RSSI</span>
            </div>
            <p className={`text-2xl font-extrabold telemetry-value ${r.text}`}>
              {telemetry.wifi_rssi !== null ? telemetry.wifi_rssi : '—'}
              {telemetry.wifi_rssi !== null && <span className="text-xs font-bold ml-0.5">dBm</span>}
            </p>
            <p className={`text-xs font-medium ${r.text} mt-0.5`}>{r.label}</p>
          </div>

          {/* Firmware */}
          <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Zap className="w-3.5 h-3.5 text-indigo-400" />
              <span className="text-xs text-gray-500 font-medium">Firmware</span>
            </div>
            <p className="text-sm font-bold text-gray-900 font-mono telemetry-value mt-1">
              {telemetry.firmware_version || '—'}
            </p>
          </div>

          {/* Raw ADC */}
          <div className="bg-white/70 rounded-xl p-3 border border-gray-100">
            <div className="flex items-center gap-1.5 mb-1">
              <Radio className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs text-gray-500 font-medium">Raw ADC</span>
            </div>
            <p className="text-sm font-bold text-gray-900 font-mono telemetry-value mt-1">
              {telemetry.moisture_raw}
            </p>
          </div>
        </div>

        {/* ── Connection Statistics ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { icon: Activity, label: 'Packets Received', value: String(connStats.packets), color: 'text-blue-600 bg-blue-50' },
            { icon: Clock,    label: 'Last Packet',      value: connStats.lastReceived,    color: 'text-teal-600 bg-teal-50' },
            { icon: Wifi,     label: 'Data Span',        value: connStats.uptime,          color: 'text-green-600 bg-green-50' },
            { icon: Zap,      label: 'Avg. Interval',    value: connStats.avgInterval,     color: 'text-indigo-600 bg-indigo-50' },
          ].map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="flex items-center gap-3 bg-white/60 rounded-xl p-3 border border-gray-100">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium truncate">{label}</p>
                <p className="text-sm font-bold text-gray-900 telemetry-value truncate">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Telemetry History ── */}
        <div>
          <button
            onClick={() => setHistoryOpen(!historyOpen)}
            className="flex items-center gap-2 text-xs font-semibold text-gray-500 hover:text-gray-700 transition-colors mb-2"
          >
            {historyOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            Recent Packets ({historySlice.length})
          </button>

          {historyOpen && historySlice.length > 0 && (
            <div className="bg-white/60 rounded-xl border border-gray-100 overflow-hidden">
              {/* Header */}
              <div className="grid grid-cols-4 gap-2 px-3 py-2 bg-gray-50/80 border-b border-gray-100">
                <span className="text-xs font-semibold text-gray-500">Time</span>
                <span className="text-xs font-semibold text-gray-500 text-center">Wetness</span>
                <span className="text-xs font-semibold text-gray-500 text-center">Battery</span>
                <span className="text-xs font-semibold text-gray-500 text-center">RSSI</span>
              </div>

              {/* Rows */}
              {historySlice.map((t, idx) => {
                const isNewest = idx === 0 && isNewPacket;
                const wc = wetnessColor(t.wetness_percent);
                const bc = batteryColor(t.battery_percent);
                return (
                  <div
                    key={t.id}
                    className={`grid grid-cols-4 gap-2 px-3 py-2 border-b border-gray-50 last:border-b-0 transition-colors ${
                      isNewest ? 'highlight-new' : ''
                    }`}
                  >
                    <span className="text-xs text-gray-500 font-mono">
                      {new Date(t.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`text-xs font-bold text-center ${wc.text}`}>
                      {t.wetness_percent}%
                    </span>
                    <span className={`text-xs font-bold text-center ${bc.text}`}>
                      {t.battery_percent}%
                    </span>
                    <span className="text-xs font-mono text-center text-gray-600">
                      {t.wifi_rssi !== null ? `${t.wifi_rssi}` : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {historyOpen && historySlice.length === 0 && (
            <p className="text-xs text-gray-400 py-2">No history available.</p>
          )}
        </div>
      </div>
    </div>
  );
}
