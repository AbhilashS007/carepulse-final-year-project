/**
 * PatientFormModal — CarePulse Phase 1
 * --------------------------------------
 * Slide-over panel for creating or editing a patient.
 * Dual-mode: Add (blank) or Edit (pre-populated from editPatient prop).
 *
 * Section 1 — Patient Details (required fields)
 * Section 2 — Disease Profile (optional, labeled "AI Ready" for Gemini Phase 2)
 *
 * On submit:
 *   - Calls createPatient() or updatePatient() from api.ts
 *   - Calls onSaved(isNew) on success
 *   - Shows inline server error on 409 / validation errors
 */

import { useState, useEffect } from 'react';
import { X, Save, UserPlus, Pencil, Stethoscope } from 'lucide-react';
import { createPatient, updatePatient, type PatientFormData } from '../../services/api';
import type { Patient } from '../../data/mockData';

// ── Types ─────────────────────────────────────────────────────────────
interface Props {
  open:        boolean;
  editPatient: Patient | null;  // null = Add mode, Patient = Edit mode
  onClose:     () => void;
  onSaved:     (isNew: boolean) => void;
}

type FormErrors = Partial<Record<keyof PatientFormData, string>>;

const EMPTY_FORM: PatientFormData = {
  name:             '',
  age:              0,
  ward:             '',
  room:             '',
  condition:        '',
  caregiver_name:   '',
  device_id:        '',
  notes:            '',
  disease:          '',
  disease_severity: '',
  diagnosis_date:   '',
};

// ── Helpers ───────────────────────────────────────────────────────────
function inputCls(hasError: boolean) {
  return [
    'w-full px-3 py-2.5 text-sm rounded-xl border transition-all',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400',
    'placeholder:text-gray-400',
    hasError
      ? 'border-red-300 bg-red-50 focus:ring-red-300/30'
      : 'border-gray-200 bg-gray-50 focus:bg-white',
  ].join(' ');
}

function selectCls(hasError: boolean) {
  return [
    'w-full px-3 py-2.5 text-sm rounded-xl border transition-all text-gray-700',
    'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-400',
    hasError
      ? 'border-red-300 bg-red-50'
      : 'border-gray-200 bg-gray-50 focus:bg-white',
  ].join(' ');
}

// ── Sub-components ────────────────────────────────────────────────────
function FormField({
  label, children, error, required, hint,
}: {
  label:     string;
  children:  React.ReactNode;
  error?:    string;
  required?: boolean;
  hint?:     string;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-gray-600">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px] text-gray-400">{hint}</p>}
      {error         && <p className="text-[11px] text-red-600 font-medium">{error}</p>}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function PatientFormModal({ open, editPatient, onClose, onSaved }: Props) {
  const [form,        setForm]        = useState<PatientFormData>(EMPTY_FORM);
  const [errors,      setErrors]      = useState<FormErrors>({});
  const [submitting,  setSubmitting]  = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Populate form whenever modal opens or mode switches
  useEffect(() => {
    if (!open) return;
    if (editPatient) {
      setForm({
        name:             editPatient.name,
        age:              editPatient.age,
        ward:             editPatient.ward,
        room:             editPatient.room,
        condition:        editPatient.condition,
        caregiver_name:   editPatient.caregiver,
        device_id:        editPatient.deviceId,
        notes:            editPatient.notes || '',
        disease:          editPatient.disease          || '',
        disease_severity: editPatient.diseaseSeverity  || '',
        diagnosis_date:   editPatient.diagnosisDate    || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
    setServerError(null);
  }, [open, editPatient]);

  // Field updater — clears error for that field on change
  const setField = <K extends keyof PatientFormData>(field: K, value: PatientFormData[K]) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  // Client-side validation
  const validate = (): boolean => {
    const e: FormErrors = {};
    if (!form.name.trim())                                        e.name           = 'Patient name is required.';
    if (!form.age || Number(form.age) < 0 || Number(form.age) > 130) e.age        = 'Age must be 0–130.';
    if (!form.ward.trim())                                        e.ward           = 'Ward is required.';
    if (!form.room.trim())                                        e.room           = 'Room is required.';
    if (!form.condition.trim())                                   e.condition      = 'Medical condition is required.';
    if (!form.caregiver_name.trim())                              e.caregiver_name = 'Caregiver name is required.';
    if (!form.device_id.trim() || form.device_id.trim().length < 3)
                                                                  e.device_id      = 'Device ID must be at least 3 characters.';
    if (form.disease_severity &&
        !['mild','moderate','severe','critical'].includes(form.disease_severity))
                                                                  e.disease_severity = 'Select a valid severity.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    setServerError(null);

    const payload: PatientFormData = {
      ...form,
      age:              Number(form.age),
      notes:            form.notes            || undefined,
      disease:          form.disease          || undefined,
      disease_severity: form.disease_severity || undefined,
      diagnosis_date:   form.diagnosis_date   || undefined,
    };

    try {
      if (editPatient) {
        await updatePatient(editPatient.id, payload);
        onSaved(false);
      } else {
        await createPatient(payload);
        onSaved(true);
      }
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setServerError(
        typeof detail === 'string'
          ? detail
          : 'An unexpected error occurred. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const isEdit = Boolean(editPatient);

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide-over panel */}
      <div className="relative ml-auto w-full max-w-lg bg-white h-full flex flex-col shadow-2xl">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-teal-600 flex items-center justify-center shadow-sm">
              {isEdit
                ? <Pencil className="w-5 h-5 text-white" />
                : <UserPlus className="w-5 h-5 text-white" />
              }
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">
                {isEdit ? 'Edit Patient' : 'Add New Patient'}
              </h2>
              <p className="text-xs text-gray-400">
                {isEdit
                  ? `Updating record for ${editPatient!.name}`
                  : 'Register a new patient to the monitoring system'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 scrollbar-thin">

          {/* Server-side error banner */}
          {serverError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
              {serverError}
            </div>
          )}

          {/* ─── Section 1: Patient Details ─── */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              Patient Details
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Full Name" required error={errors.name}>
                <input
                  id="patient-name"
                  type="text"
                  value={form.name}
                  onChange={e => setField('name', e.target.value)}
                  placeholder="Margaret Chen"
                  className={inputCls(!!errors.name)}
                />
              </FormField>
              <FormField label="Age" required error={errors.age}>
                <input
                  id="patient-age"
                  type="number"
                  value={form.age || ''}
                  onChange={e => setField('age', Number(e.target.value))}
                  placeholder="78"
                  min={0}
                  max={130}
                  className={inputCls(!!errors.age)}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ward" required error={errors.ward}>
                <input
                  id="patient-ward"
                  type="text"
                  value={form.ward}
                  onChange={e => setField('ward', e.target.value)}
                  placeholder="Geriatric Care"
                  className={inputCls(!!errors.ward)}
                />
              </FormField>
              <FormField label="Room" required error={errors.room}>
                <input
                  id="patient-room"
                  type="text"
                  value={form.room}
                  onChange={e => setField('room', e.target.value)}
                  placeholder="3A-101"
                  className={inputCls(!!errors.room)}
                />
              </FormField>
            </div>

            <FormField label="Medical Condition" required error={errors.condition}>
              <input
                id="patient-condition"
                type="text"
                value={form.condition}
                onChange={e => setField('condition', e.target.value)}
                placeholder="Post-stroke rehabilitation"
                className={inputCls(!!errors.condition)}
              />
            </FormField>

            <FormField label="Assigned Caregiver" required error={errors.caregiver_name}>
              <input
                id="patient-caregiver"
                type="text"
                value={form.caregiver_name}
                onChange={e => setField('caregiver_name', e.target.value)}
                placeholder="Nurse Rachel Kim"
                className={inputCls(!!errors.caregiver_name)}
              />
            </FormField>

            <FormField
              label="Device ID"
              required
              error={errors.device_id}
              hint="Format: CP-DEV-013"
            >
              <input
                id="patient-device-id"
                type="text"
                value={form.device_id}
                onChange={e => setField('device_id', e.target.value.toUpperCase())}
                placeholder="CP-DEV-013"
                className={inputCls(!!errors.device_id)}
              />
            </FormField>

            <FormField label="Clinical Notes">
              <textarea
                id="patient-notes"
                value={form.notes}
                onChange={e => setField('notes', e.target.value)}
                rows={3}
                placeholder="Any additional observations or care instructions…"
                className={`${inputCls(false)} resize-none`}
              />
            </FormField>
          </div>

          {/* ─── Section 2: Disease Profile (AI Ready) ─── */}
          <div className="space-y-4">
            {/* Section divider with label */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-100" />
              <div className="flex items-center gap-1.5 shrink-0">
                <Stethoscope className="w-3.5 h-3.5 text-indigo-500" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Disease Profile
                </span>
                <span className="ml-1 text-[10px] text-indigo-600 bg-indigo-50 border border-indigo-100
                                 px-2 py-0.5 rounded-full font-bold tracking-wide">
                  AI READY
                </span>
              </div>
              <div className="flex-1 h-px bg-gray-100" />
            </div>
            <p className="text-[11px] text-gray-400 text-center leading-relaxed -mt-2">
              Structured fields consumed by the AI Clinical Insights engine.
              Required for Disease-Aware Gemini analysis.
            </p>

            <FormField label="Primary Disease" hint="Canonical disease name (e.g. Chronic Kidney Disease)">
              <input
                id="patient-disease"
                type="text"
                value={form.disease}
                onChange={e => setField('disease', e.target.value)}
                placeholder="e.g. Chronic Kidney Disease"
                className={inputCls(false)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-4">
              <FormField label="Disease Severity" error={errors.disease_severity}>
                <select
                  id="patient-disease-severity"
                  value={form.disease_severity}
                  onChange={e => setField('disease_severity', e.target.value)}
                  className={selectCls(!!errors.disease_severity)}
                >
                  <option value="">Select severity</option>
                  <option value="mild">Mild</option>
                  <option value="moderate">Moderate</option>
                  <option value="severe">Severe</option>
                  <option value="critical">Critical</option>
                </select>
              </FormField>
              <FormField label="Diagnosis Date">
                <input
                  id="patient-diagnosis-date"
                  type="date"
                  value={form.diagnosis_date}
                  onChange={e => setField('diagnosis_date', e.target.value)}
                  className={inputCls(false)}
                />
              </FormField>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold
                       text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            id="patient-form-submit"
            onClick={handleSubmit}
            disabled={submitting}
            className="px-6 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white
                       text-sm font-semibold transition-all active:scale-95 shadow-sm
                       disabled:opacity-70 flex items-center gap-2"
          >
            {submitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEdit ? 'Save Changes' : 'Add Patient'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
