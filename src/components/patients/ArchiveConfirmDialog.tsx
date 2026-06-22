/**
 * ArchiveConfirmDialog — CarePulse Phase 1
 * -----------------------------------------
 * Centered confirmation modal shown before archiving a patient.
 * Non-destructive: all historical data is preserved.
 *
 * Props:
 *   patient     - the Patient to archive (null = hidden)
 *   onClose     - called when user cancels or after API resolves
 *   onConfirmed - called after successful archive
 *   onError     - called with error message on API failure
 */

import { useState } from 'react';
import { Archive, AlertTriangle, X } from 'lucide-react';
import type { Patient } from '../../data/mockData';
import { archivePatient } from '../../services/api';

interface Props {
  patient:     Patient | null;
  onClose:     () => void;
  onConfirmed: () => void;
  onError:     (message: string) => void;
}

export default function ArchiveConfirmDialog({ patient, onClose, onConfirmed, onError }: Props) {
  const [loading, setLoading] = useState(false);

  if (!patient) return null;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await archivePatient(patient.id);
      onConfirmed();
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      onError(typeof detail === 'string' ? detail : 'Failed to archive patient. Please try again.');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog card */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-in">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <X className="w-4 h-4 text-gray-400" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center mb-4">
          <Archive className="w-6 h-6 text-amber-600" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-1">Archive Patient</h3>
        <p className="text-sm text-gray-700 font-semibold mb-3">
          {patient.name}
          <span className="text-gray-400 font-normal ml-2">· {patient.id} · {patient.ward}</span>
        </p>

        {/* Warning */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl mb-5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700 leading-relaxed">
            This is a <strong>non-destructive action</strong>. All sensor events, alerts, and
            AI insights are fully preserved. The patient will be hidden from the Active list
            but remains queryable under the Archived filter.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold
                       text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white
                       text-sm font-semibold transition-all active:scale-95 disabled:opacity-70
                       flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Archiving…
              </>
            ) : (
              <>
                <Archive className="w-4 h-4" />
                Archive Patient
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
