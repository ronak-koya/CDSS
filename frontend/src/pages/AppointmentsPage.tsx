import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarDays, Plus, ChevronLeft, ChevronRight, Clock, User,
  Stethoscope, CheckCircle, AlertCircle, Loader2, MoreVertical,
  Play, XCircle, Ban, FileText, RefreshCw,
} from 'lucide-react';
import { format, addDays, subDays, isToday, parseISO } from 'date-fns';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Appointment, AppointmentStats } from '../types';
import BookAppointmentModal from '../components/appointments/BookAppointmentModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<string, { label: string; color: string; bg: string; dot: string }> = {
  scheduled:   { label: 'Scheduled',   color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   dot: 'bg-blue-500' },
  confirmed:   { label: 'Confirmed',   color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  dot: 'bg-green-500' },
  in_progress: { label: 'In Progress', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', dot: 'bg-orange-500 animate-pulse' },
  completed:   { label: 'Completed',   color: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200',   dot: 'bg-gray-400' },
  cancelled:   { label: 'Cancelled',   color: 'text-red-600',    bg: 'bg-red-50 border-red-200',     dot: 'bg-red-400' },
  no_show:     { label: 'No Show',     color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', dot: 'bg-yellow-500' },
};

const TYPE_LABELS: Record<string, string> = {
  consultation: 'Consultation', follow_up: 'Follow-up', emergency: 'Emergency',
  procedure: 'Procedure', checkup: 'Checkup',
};

// ─── Appointment Card ─────────────────────────────────────────────────────────

function AppointmentCard({
  appt, role, onStatusChange, onEdit, onCancel, onViewPatient,
}: {
  appt: Appointment;
  role: string;
  onStatusChange: (id: string, status: string, completionNotes?: string) => void;
  onEdit: (a: Appointment) => void;
  onCancel: (a: Appointment) => void;
  onViewPatient: (patientId: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completing, setCompleting] = useState(false);

  const meta = STATUS_META[appt.status] ?? STATUS_META.scheduled;
  const time = format(parseISO(appt.scheduledAt), 'h:mm a');
  const patientAge = new Date().getFullYear() - new Date(appt.patient.dateOfBirth).getFullYear();
  const isDoctor = role === 'DOCTOR';
  const canEdit = !isDoctor && !['completed', 'cancelled'].includes(appt.status);
  const canStart = isDoctor && appt.status === 'scheduled';
  const canComplete = isDoctor && appt.status === 'in_progress';
  const canConfirm = !isDoctor && appt.status === 'scheduled';
  const canCancel = !['completed', 'cancelled'].includes(appt.status);
  const canNoShow = !isDoctor && appt.status === 'scheduled';

  const handleComplete = async () => {
    setCompleting(true);
    await onStatusChange(appt.id, 'completed', completionNotes);
    setCompleting(false);
    setShowNotes(false);
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all hover:shadow-md
      ${appt.status === 'in_progress' ? 'border-orange-300 ring-1 ring-orange-200' :
        appt.status === 'completed' ? 'border-gray-200 opacity-80' :
        appt.status === 'cancelled' ? 'border-red-100 opacity-60' : 'border-gray-100'}`}>

      <div className="p-4">
        {/* Time + status row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock size={13} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">{time}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">{appt.duration}min</span>
          </div>
          <div className="flex items-center gap-2">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label}
            </span>
            {(canEdit || canCancel || canNoShow) && (
              <div className="relative">
                <button onClick={() => setMenuOpen(p => !p)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 transition-colors">
                  <MoreVertical size={14} />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-7 w-40 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-1 overflow-hidden">
                    {canEdit && (
                      <button onClick={() => { onEdit(appt); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50">
                        <FileText size={13} className="text-gray-400" /> Edit
                      </button>
                    )}
                    {canConfirm && (
                      <button onClick={() => { onStatusChange(appt.id, 'confirmed'); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-700 hover:bg-green-50">
                        <CheckCircle size={13} className="text-green-400" /> Confirm
                      </button>
                    )}
                    {canNoShow && (
                      <button onClick={() => { onStatusChange(appt.id, 'no_show'); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-yellow-700 hover:bg-yellow-50">
                        <AlertCircle size={13} className="text-yellow-400" /> Mark No-Show
                      </button>
                    )}
                    {canCancel && (
                      <button onClick={() => { onCancel(appt); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                        <Ban size={13} className="text-red-400" /> Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Patient */}
        <button onClick={() => onViewPatient(appt.patient.id)}
          className="flex items-center gap-2.5 mb-2 w-full text-left group">
          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-sm flex-shrink-0">
            {appt.patient.firstName[0]}{appt.patient.lastName[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
              {appt.patient.firstName} {appt.patient.lastName}
            </p>
            <p className="text-xs text-gray-500">{appt.patient.mrn} · {appt.patient.gender ?? ''}, {patientAge} yrs</p>
          </div>
        </button>

        {/* Visit info */}
        <div className="flex items-start gap-2 mb-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
            {TYPE_LABELS[appt.type] ?? appt.type}
          </span>
          {appt.department && (
            <span className="text-xs text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">{appt.department}</span>
          )}
          {appt.room && (
            <span className="text-xs text-gray-500">📍 {appt.room}</span>
          )}
        </div>

        <p className="text-sm text-gray-700 font-medium">{appt.title}</p>

        {appt.notes && (
          <p className="text-xs text-gray-400 mt-1 line-clamp-1">{appt.notes}</p>
        )}

        {/* Doctor row (shown for non-doctor views) */}
        {!isDoctor && (
          <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-gray-50">
            <Stethoscope size={11} className="text-gray-400" />
            <span className="text-xs text-gray-500">Dr. {appt.doctor.firstName} {appt.doctor.lastName}</span>
            {appt.doctor.specialty && <span className="text-gray-300">·</span>}
            {appt.doctor.specialty && <span className="text-xs text-gray-400">{appt.doctor.specialty}</span>}
          </div>
        )}

        {/* Completion notes (if any) */}
        {appt.completionNotes && (
          <div className="mt-2 pt-2 border-t border-gray-50">
            <p className="text-xs text-gray-500 font-medium mb-0.5">Visit Notes</p>
            <p className="text-xs text-gray-600">{appt.completionNotes}</p>
          </div>
        )}

        {/* Doctor action buttons */}
        {isDoctor && (
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-50">
            {canStart && (
              <button onClick={() => onStatusChange(appt.id, 'in_progress')}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors">
                <Play size={12} /> Start Visit
              </button>
            )}
            {canComplete && (
              <button onClick={() => setShowNotes(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors">
                <CheckCircle size={12} /> Complete Visit
              </button>
            )}
            {canCancel && !canStart && !canComplete && (
              <button onClick={() => onCancel(appt)}
                className="flex items-center gap-1 py-1.5 px-3 text-xs font-medium text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors">
                <XCircle size={12} /> Cancel
              </button>
            )}
          </div>
        )}
      </div>

      {/* Complete visit notes panel */}
      {showNotes && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 rounded-b-xl">
          <label className="block text-xs font-medium text-gray-600 mb-1.5">Visit Summary / Notes</label>
          <textarea
            value={completionNotes}
            onChange={e => setCompletionNotes(e.target.value)}
            placeholder="Describe the visit outcome, prescriptions given, follow-up instructions..."
            rows={3}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
          />
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowNotes(false)}
              className="flex-1 py-1.5 text-xs text-gray-600 border border-gray-200 rounded-lg hover:bg-white">
              Cancel
            </button>
            <button onClick={handleComplete} disabled={completing}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-60 transition-colors">
              {completing ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
              Mark Complete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Cancel Confirm ───────────────────────────────────────────────────────────

function CancelConfirm({ appt, onClose, onConfirm }: { appt: Appointment; onClose: () => void; onConfirm: () => void }) {
  const [cancelling, setCancelling] = useState(false);
  const handle = async () => { setCancelling(true); await onConfirm(); setCancelling(false); };
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
          <Ban size={20} className="text-red-600" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900">Cancel Appointment?</h3>
        <p className="text-sm text-gray-500 mt-1">
          {appt.patient.firstName} {appt.patient.lastName}'s appointment at {format(parseISO(appt.scheduledAt), 'h:mm a')} will be cancelled.
        </p>
        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">Keep</button>
          <button onClick={handle} disabled={cancelling}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg">
            {cancelling ? <Loader2 size={14} className="animate-spin" /> : null} Yes, Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── AppointmentsPage ─────────────────────────────────────────────────────────

export default function AppointmentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const role = user?.role ?? 'STAFF';
  const isDoctor = role === 'DOCTOR';

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [stats, setStats] = useState<AppointmentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showBookModal, setShowBookModal] = useState(false);
  const [editAppt, setEditAppt] = useState<Appointment | null>(null);
  const [cancelAppt, setCancelAppt] = useState<Appointment | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const fetchAppointments = useCallback(() => {
    setLoading(true);
    api.get<Appointment[]>(`/appointments?date=${dateStr}`)
      .then(r => setAppointments(r.data))
      .catch(() => showToast('Failed to load appointments', false))
      .finally(() => setLoading(false));
  }, [dateStr]);

  const fetchStats = useCallback(() => {
    api.get<AppointmentStats>('/appointments/stats')
      .then(r => setStats(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => { fetchAppointments(); fetchStats(); }, [fetchAppointments, fetchStats]);

  const handleStatusChange = async (id: string, status: string, completionNotes?: string) => {
    try {
      const res = await api.patch<Appointment>(`/appointments/${id}`, { status, ...(completionNotes ? { completionNotes } : {}) });
      setAppointments(prev => prev.map(a => a.id === id ? res.data : a));
      fetchStats();
      showToast(`Appointment marked as ${STATUS_META[status]?.label ?? status}`);
    } catch {
      showToast('Failed to update status', false);
    }
  };

  const handleCancel = async () => {
    if (!cancelAppt) return;
    try {
      const res = await api.delete<Appointment>(`/appointments/${cancelAppt.id}`);
      setAppointments(prev => prev.map(a => a.id === cancelAppt.id ? res.data : a));
      fetchStats();
      setCancelAppt(null);
      showToast('Appointment cancelled');
    } catch {
      showToast('Failed to cancel appointment', false);
    }
  };

  const handleSaved = (appt: Appointment) => {
    setAppointments(prev => {
      const idx = prev.findIndex(a => a.id === appt.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = appt; return next.sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)); }
      return [...prev, appt].sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));
    });
    fetchStats();
    setShowBookModal(false);
    setEditAppt(null);
    showToast(editAppt ? 'Appointment updated' : 'Appointment booked successfully');
  };

  // Filter
  const filtered = appointments.filter(a => statusFilter === 'all' || a.status === statusFilter);

  // Group by hour for timeline
  const grouped: Record<string, Appointment[]> = {};
  filtered.forEach(a => {
    const h = format(parseISO(a.scheduledAt), 'h a');
    if (!grouped[h]) grouped[h] = [];
    grouped[h].push(a);
  });

  const STATUS_FILTERS = [
    { value: 'all', label: 'All' },
    { value: 'scheduled', label: 'Scheduled' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
          ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
            <CalendarDays size={20} className="text-primary-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isDoctor ? 'My Schedule' : 'Appointments'}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isDoctor ? 'Your patient appointments' : 'Manage and book patient appointments'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchAppointments} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-500 transition-colors">
            <RefreshCw size={16} />
          </button>
          {!isDoctor && (
            <button
              onClick={() => { setEditAppt(null); setShowBookModal(true); }}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm"
            >
              <Plus size={16} /> Book Appointment
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Today's Total", value: stats.todayTotal, color: 'text-primary-600', bg: 'bg-primary-50', icon: CalendarDays },
            { label: 'Scheduled', value: stats.scheduled, color: 'text-blue-600', bg: 'bg-blue-50', icon: Clock },
            { label: 'In Progress', value: stats.inProgress, color: 'text-orange-600', bg: 'bg-orange-50', icon: Play },
            { label: 'Completed', value: stats.completed, color: 'text-green-600', bg: 'bg-green-50', icon: CheckCircle },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Date navigator */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => setSelectedDate(d => subDays(d, 1))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <div className="flex-1 flex items-center justify-center gap-3">
          <div className="text-center">
            <p className="text-lg font-bold text-gray-900">{format(selectedDate, 'EEEE, MMMM d yyyy')}</p>
            {isToday(selectedDate) && (
              <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-0.5 rounded-full">Today</span>
            )}
          </div>
        </div>
        <button onClick={() => setSelectedDate(new Date())}
          className="px-3 py-2 text-xs font-medium border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
          Today
        </button>
        <button onClick={() => setSelectedDate(d => addDays(d, 1))}
          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5 w-fit">
        {STATUS_FILTERS.map(f => (
          <button key={f.value} onClick={() => setStatusFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
              ${statusFilter === f.value ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {f.label}
            {f.value === 'all'
              ? ` (${appointments.length})`
              : ` (${appointments.filter(a => a.status === f.value).length})`}
          </button>
        ))}
      </div>

      {/* Main content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 size={28} className="animate-spin text-primary-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
          <CalendarDays size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No appointments {statusFilter !== 'all' ? `with status "${statusFilter}"` : ''} on this day</p>
          {!isDoctor && (
            <button onClick={() => setShowBookModal(true)}
              className="mt-4 flex items-center gap-2 mx-auto text-sm text-primary-600 hover:text-primary-700 font-medium">
              <Plus size={15} /> Book an appointment
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([hour, appts]) => (
            <div key={hour}>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-gray-400" />
                  <span className="text-sm font-semibold text-gray-500">{hour}</span>
                </div>
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-xs text-gray-400">{appts.length} appointment{appts.length > 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {appts.map(a => (
                  <AppointmentCard
                    key={a.id}
                    appt={a}
                    role={role}
                    onStatusChange={handleStatusChange}
                    onEdit={appt => { setEditAppt(appt); setShowBookModal(true); }}
                    onCancel={setCancelAppt}
                    onViewPatient={pid => navigate(`/patients/${pid}`)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showBookModal && (
        <BookAppointmentModal
          editAppointment={editAppt}
          onClose={() => { setShowBookModal(false); setEditAppt(null); }}
          onSaved={handleSaved}
        />
      )}
      {cancelAppt && (
        <CancelConfirm
          appt={cancelAppt}
          onClose={() => setCancelAppt(null)}
          onConfirm={handleCancel}
        />
      )}

      {/* Legend */}
      <div className="mt-8 flex flex-wrap items-center gap-4 text-xs text-gray-400 pt-4 border-t border-gray-100">
        <span className="font-medium text-gray-500">Status:</span>
        {Object.entries(STATUS_META).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${v.dot.replace(' animate-pulse', '')}`} />
            {v.label}
          </span>
        ))}
        {isDoctor && (
          <span className="ml-auto flex items-center gap-1 text-gray-400">
            <User size={12} /> Click a patient name to view their profile
          </span>
        )}
      </div>
    </div>
  );
}
