import { useState, useEffect, useRef } from 'react';
import { X, Search, User, Stethoscope, Calendar, Clock, FileText, Loader2, CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import api from '../../lib/api';
import { Patient, Appointment, AppointmentDoctor, TimeSlot } from '../../types';

const APPT_TYPES = [
  { value: 'consultation', label: 'Consultation' },
  { value: 'follow_up', label: 'Follow-up' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'procedure', label: 'Procedure' },
  { value: 'checkup', label: 'Routine Checkup' },
];

const DURATIONS = [15, 30, 45, 60];

const DEPARTMENTS = [
  'General Practice', 'Emergency', 'Cardiology', 'Neurology', 'Oncology',
  'Pediatrics', 'Radiology', 'Surgery', 'Orthopedics', 'Internal Medicine',
];

interface Props {
  editAppointment?: Appointment | null;
  prefillPatient?: Patient | null;
  onClose: () => void;
  onSaved: (appt: Appointment) => void;
}

export default function BookAppointmentModal({ editAppointment, prefillPatient, onClose, onSaved }: Props) {
  const isEdit = !!editAppointment;

  // Patient search
  const [patientQuery, setPatientQuery] = useState('');
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(prefillPatient ?? null);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const patientDebounce = useRef<ReturnType<typeof setTimeout>>();
  const patientRef = useRef<HTMLDivElement>(null);

  // Doctors
  const [doctors, setDoctors] = useState<AppointmentDoctor[]>([]);
  const [selectedDoctor, setSelectedDoctor] = useState<string>(editAppointment?.doctorId ?? '');

  // Date / time — always use LOCAL date, never UTC split
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const [date, setDate] = useState<string>(() => {
    if (editAppointment) return format(parseISO(editAppointment.scheduledAt), 'yyyy-MM-dd');
    return todayStr;
  });
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (editAppointment) {
      const d = new Date(editAppointment.scheduledAt);
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
    return '';
  });
  const [loadingSlots, setLoadingSlots] = useState(false);

  // Form fields
  const [title, setTitle] = useState(editAppointment?.title ?? '');
  const [type, setType] = useState(editAppointment?.type ?? 'consultation');
  const [duration, setDuration] = useState(editAppointment?.duration ?? 30);
  const [department, setDepartment] = useState(editAppointment?.department ?? '');
  const [room, setRoom] = useState(editAppointment?.room ?? '');
  const [notes, setNotes] = useState(editAppointment?.notes ?? '');

  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill patient for edit
  useEffect(() => {
    if (editAppointment) {
      setSelectedPatient(editAppointment.patient as unknown as Patient);
    }
  }, [editAppointment]);

  // Load doctors
  useEffect(() => {
    api.get<AppointmentDoctor[]>('/appointments/doctors').then(r => setDoctors(r.data)).catch(() => {});
  }, []);

  // Load slots when doctor/date change
  useEffect(() => {
    if (!selectedDoctor || !date) return;
    setLoadingSlots(true);
    setSelectedTime('');
    const params = new URLSearchParams({ doctorId: selectedDoctor, date });
    if (editAppointment) params.set('excludeId', editAppointment.id);
    api.get<TimeSlot[]>(`/appointments/slots?${params}`)
      .then(r => setSlots(r.data))
      .catch(() => setSlots([]))
      .finally(() => setLoadingSlots(false));
  }, [selectedDoctor, date]);

  // Patient search debounce
  useEffect(() => {
    clearTimeout(patientDebounce.current);
    if (!patientQuery.trim()) { setPatientResults([]); return; }
    patientDebounce.current = setTimeout(() => {
      api.get<{ patients: Patient[] }>(`/patients?q=${encodeURIComponent(patientQuery)}&limit=6`)
        .then(r => setPatientResults(r.data.patients))
        .catch(() => {});
    }, 300);
  }, [patientQuery]);

  // Close patient dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (patientRef.current && !patientRef.current.contains(e.target as Node)) setPatientSearchOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!selectedPatient) e.patient = 'Select a patient';
    if (!selectedDoctor) e.doctor = 'Select a doctor';
    if (!date) e.date = 'Select a date';
    if (!selectedTime) e.time = 'Select a time slot';
    if (!title.trim()) e.title = 'Reason for visit is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');

    // Build scheduledAt as LOCAL datetime — avoid new Date("YYYY-MM-DD") which parses as UTC
    const [h, m] = selectedTime.split(':').map(Number);
    const [yr, mo, dy] = date.split('-').map(Number);
    const scheduledAt = new Date(yr, mo - 1, dy, h, m, 0, 0);

    const payload = {
      patientId: selectedPatient!.id,
      doctorId: selectedDoctor,
      title: title.trim(),
      type,
      scheduledAt: scheduledAt.toISOString(),
      duration,
      department: department || undefined,
      room: room || undefined,
      notes: notes || undefined,
    };

    try {
      let res;
      if (isEdit) {
        res = await api.patch<Appointment>(`/appointments/${editAppointment!.id}`, payload);
      } else {
        res = await api.post<Appointment>('/appointments', payload);
      }
      onSaved(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg || 'Failed to save appointment');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: string) =>
    `w-full bg-white border ${errors[field] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'} rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`;

  const patientAge = selectedPatient
    ? new Date().getFullYear() - new Date(selectedPatient.dateOfBirth).getFullYear()
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <Calendar size={16} className="text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Appointment' : 'Book Appointment'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {apiError && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
            <AlertCircle size={15} className="flex-shrink-0" />{apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── Section 1: Patient ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <User size={14} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Patient</h3>
            </div>

            {selectedPatient ? (
              <div className="flex items-center gap-3 bg-white rounded-lg border border-primary-200 px-3 py-2.5">
                <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
                  {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                  <p className="text-xs text-gray-500">{selectedPatient.mrn} · {selectedPatient.gender}, {patientAge} yrs</p>
                </div>
                {!isEdit && (
                  <button type="button" onClick={() => { setSelectedPatient(null); setPatientQuery(''); }}
                    className="text-gray-400 hover:text-red-500 transition-colors">
                    <X size={14} />
                  </button>
                )}
              </div>
            ) : (
              <div className="relative" ref={patientRef}>
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={patientQuery}
                  onChange={e => { setPatientQuery(e.target.value); setPatientSearchOpen(true); }}
                  onFocus={() => setPatientSearchOpen(true)}
                  placeholder="Search patient by name or MRN..."
                  className={`${inputCls('patient')} pl-9`}
                />
                {patientSearchOpen && patientResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-20 mt-1 overflow-hidden">
                    {patientResults.map(p => {
                      const age = new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear();
                      return (
                        <button key={p.id} type="button"
                          onClick={() => { setSelectedPatient(p); setPatientSearchOpen(false); setPatientQuery(''); if (errors.patient) setErrors(prev => ({ ...prev, patient: '' })); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-primary-50 text-left transition-colors">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-xs flex-shrink-0">
                            {p.firstName[0]}{p.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                            <p className="text-xs text-gray-500">{p.mrn} · {p.gender}, {age} yrs</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
                {errors.patient && <p className="text-red-500 text-xs mt-1">{errors.patient}</p>}
              </div>
            )}
          </div>

          {/* ── Section 2: Doctor + Department ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Stethoscope size={14} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Doctor & Department</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Assign Doctor *</label>
                <div className="relative">
                  <select
                    value={selectedDoctor}
                    onChange={e => { setSelectedDoctor(e.target.value); if (errors.doctor) setErrors(prev => ({ ...prev, doctor: '' })); }}
                    className={inputCls('doctor')}
                  >
                    <option value="">Select doctor...</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>Dr. {d.firstName} {d.lastName}{d.specialty ? ` — ${d.specialty}` : ''}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
                {errors.doctor && <p className="text-red-500 text-xs mt-1">{errors.doctor}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Department</label>
                <div className="relative">
                  <select value={department} onChange={e => setDepartment(e.target.value)} className={inputCls('department')}>
                    <option value="">— None —</option>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* ── Section 3: Date + Time ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock size={14} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date & Time</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Date *</label>
                <input
                  type="date"
                  value={date}
                  min={todayStr}
                  onChange={e => { setDate(e.target.value); if (errors.date) setErrors(p => ({ ...p, date: '' })); }}
                  className={inputCls('date')}
                />
                {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Duration</label>
                <div className="flex gap-2">
                  {DURATIONS.map(d => (
                    <button key={d} type="button"
                      onClick={() => setDuration(d)}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all
                        ${duration === d ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Time slots */}
            {selectedDoctor && date && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-2">
                  Available Slots *
                  {loadingSlots && <Loader2 size={12} className="inline ml-2 animate-spin" />}
                </label>
                {slots.length === 0 && !loadingSlots ? (
                  <p className="text-xs text-gray-400 py-2">Select a doctor and date to see available slots</p>
                ) : (
                  <div className="grid grid-cols-5 gap-1.5 max-h-36 overflow-y-auto">
                    {slots.map(s => (
                      <button
                        key={s.time}
                        type="button"
                        disabled={!s.available}
                        onClick={() => { setSelectedTime(s.time); if (errors.time) setErrors(p => ({ ...p, time: '' })); }}
                        className={`py-1.5 text-xs font-medium rounded-lg border transition-all
                          ${!s.available ? 'bg-gray-100 text-gray-300 border-gray-100 cursor-not-allowed line-through' :
                            selectedTime === s.time ? 'bg-primary-600 text-white border-primary-600' :
                            'bg-white text-gray-700 border-gray-200 hover:border-primary-400 hover:text-primary-600'}`}
                      >
                        {s.time}
                      </button>
                    ))}
                  </div>
                )}
                {errors.time && <p className="text-red-500 text-xs mt-1">{errors.time}</p>}
              </div>
            )}
          </div>

          {/* ── Section 4: Visit Details ── */}
          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={14} className="text-gray-500" />
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Visit Details</h3>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Reason for Visit *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={e => { setTitle(e.target.value); if (errors.title) setErrors(p => ({ ...p, title: '' })); }}
                    placeholder="e.g. Chest pain, Annual checkup"
                    className={inputCls('title')}
                  />
                  {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Visit Type *</label>
                  <div className="relative">
                    <select value={type} onChange={e => setType(e.target.value)} className={inputCls('type')}>
                      {APPT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Room / Location</label>
                  <input type="text" value={room} onChange={e => setRoom(e.target.value)} placeholder="e.g. Room 201" className={inputCls('room')} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Pre-visit Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Any relevant notes for the doctor..."
                  rows={2}
                  className={`${inputCls('notes')} resize-none`}
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-all shadow-sm">
              {submitting
                ? <><Loader2 size={15} className="animate-spin" /> Saving...</>
                : <><CheckCircle size={15} /> {isEdit ? 'Save Changes' : 'Book Appointment'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
