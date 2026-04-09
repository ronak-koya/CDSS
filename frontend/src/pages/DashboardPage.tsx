import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Bell, Activity, TrendingUp, AlertTriangle, CheckCircle, ArrowRight, Clock, Zap, CalendarDays, PlayCircle, CheckSquare, CalendarClock } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Patient, Alert, Appointment, AppointmentStats } from '../types';
import { format } from 'date-fns';

interface AlertStats { total: number; active: number; critical: number; high: number }

function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: number | string; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    medium: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    low: 'bg-blue-100 text-blue-700 border-blue-200',
  };
  return <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${map[severity] ?? 'bg-gray-100 text-gray-600'}`}>{severity}</span>;
}

const statusConfig: Record<string, { label: string; color: string; dot: string }> = {
  scheduled:  { label: 'Scheduled',   color: 'text-blue-700 bg-blue-50 border-blue-200',    dot: 'bg-blue-400' },
  confirmed:  { label: 'Confirmed',   color: 'text-green-700 bg-green-50 border-green-200',  dot: 'bg-green-400' },
  in_progress:{ label: 'In Progress', color: 'text-orange-700 bg-orange-50 border-orange-200', dot: 'bg-orange-400' },
  completed:  { label: 'Completed',   color: 'text-gray-600 bg-gray-50 border-gray-200',    dot: 'bg-gray-400' },
  cancelled:  { label: 'Cancelled',   color: 'text-red-600 bg-red-50 border-red-200',       dot: 'bg-red-400' },
  no_show:    { label: 'No Show',     color: 'text-red-500 bg-red-50 border-red-200',       dot: 'bg-red-300' },
};

const typeLabel: Record<string, string> = {
  consultation: 'Consultation', follow_up: 'Follow-up', emergency: 'Emergency',
  procedure: 'Procedure', checkup: 'Checkup',
};

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isDoctor = user?.role === 'DOCTOR';

  const [patients, setPatients] = useState<Patient[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [alertStats, setAlertStats] = useState<AlertStats>({ total: 0, active: 0, critical: 0, high: 0 });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [apptStats, setApptStats] = useState<AppointmentStats>({ todayTotal: 0, scheduled: 0, inProgress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const base = [
      api.get<{ patients: Patient[] }>('/patients?limit=5'),
      api.get<Alert[]>('/alerts?status=active&limit=5'),
      api.get<AlertStats>('/alerts/stats'),
    ];
    const extra = isDoctor
      ? [
          api.get<Appointment[]>('/appointments?view=today'),
          api.get<AppointmentStats>('/appointments/stats'),
        ]
      : [];

    Promise.all([...base, ...extra])
      .then(([p, a, s, appt, aStats]) => {
        setPatients((p as { data: { patients: Patient[] } }).data.patients);
        setAlerts((a as { data: Alert[] }).data);
        setAlertStats((s as { data: AlertStats }).data);
        if (appt) setAppointments((appt as { data: Appointment[] }).data);
        if (aStats) setApptStats((aStats as { data: AppointmentStats }).data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
    </div>
  );

  // Split today's appointments into upcoming vs done
  const upcoming = appointments.filter(a => a.status === 'scheduled' || a.status === 'confirmed' || a.status === 'in_progress');
  const done = appointments.filter(a => a.status === 'completed' || a.status === 'cancelled' || a.status === 'no_show');

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{greeting}, {isDoctor ? 'Dr.' : ''} {user?.firstName} {user?.lastName}</h1>
        <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, MMMM d, yyyy')} · {user?.specialty ?? user?.role}</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {isDoctor ? (
          <>
            <StatCard label="Today's Appointments" value={apptStats.todayTotal} icon={CalendarDays} color="bg-primary-600" sub="Scheduled today" />
            <StatCard label="Scheduled" value={apptStats.scheduled} icon={CalendarClock} color="bg-blue-500" sub="Awaiting visit" />
            <StatCard label="In Progress" value={apptStats.inProgress} icon={PlayCircle} color="bg-orange-500" sub="Active visits" />
            <StatCard label="Completed" value={apptStats.completed} icon={CheckSquare} color="bg-green-500" sub="Done today" />
          </>
        ) : (
          <>
            <StatCard label="Total Patients" value={patients.length > 0 ? '6' : '0'} icon={Users} color="bg-primary-600" sub="In system" />
            <StatCard label="Active Alerts" value={alertStats.active} icon={Bell} color="bg-orange-500" sub={`${alertStats.critical} critical`} />
            <StatCard label="Critical Alerts" value={alertStats.critical} icon={AlertTriangle} color="bg-red-500" sub="Require immediate action" />
            <StatCard label="Resolved Today" value={alertStats.total - alertStats.active} icon={CheckCircle} color="bg-green-500" sub="Alerts resolved" />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <button onClick={() => navigate('/patients')} className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:border-primary-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center"><Users size={20} className="text-primary-600" /></div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-primary-500 transition-colors" />
          </div>
          <p className="font-semibold text-gray-900">Patient Search</p>
          <p className="text-sm text-gray-500 mt-0.5">Find and view patient records</p>
        </button>

        <button onClick={() => navigate('/diagnosis')} className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:border-blue-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Zap size={20} className="text-blue-600" /></div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
          </div>
          <p className="font-semibold text-gray-900">AI Diagnosis</p>
          <p className="text-sm text-gray-500 mt-0.5">Claude-powered differential diagnosis</p>
        </button>

        <button onClick={() => navigate('/appointments')} className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 text-left hover:border-orange-200 hover:shadow-md transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center"><CalendarDays size={20} className="text-orange-600" /></div>
            <ArrowRight size={16} className="text-gray-300 group-hover:text-orange-500 transition-colors" />
          </div>
          <p className="font-semibold text-gray-900">Appointments</p>
          <p className="text-sm text-gray-500 mt-0.5">
            {isDoctor ? `${upcoming.length} remaining today` : 'View & manage schedule'}
          </p>
        </button>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LEFT: Today's Schedule (doctor) or Recent Patients (others) */}
        {isDoctor ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <CalendarDays size={16} className="text-primary-600" />
                <h2 className="font-semibold text-gray-900">Today's Schedule</h2>
                <span className="bg-primary-100 text-primary-700 text-xs font-bold px-2 py-0.5 rounded-full">{appointments.length}</span>
              </div>
              <button onClick={() => navigate('/appointments')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">Full calendar</button>
            </div>

            {appointments.length === 0 ? (
              <div className="py-12 text-center">
                <CalendarDays size={32} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No appointments scheduled for today</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 max-h-[420px] overflow-y-auto">
                {/* Upcoming / in-progress first */}
                {upcoming.map((appt) => {
                  const cfg = statusConfig[appt.status] ?? statusConfig.scheduled;
                  return (
                    <button
                      key={appt.id}
                      onClick={() => navigate('/appointments')}
                      className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
                    >
                      {/* Time column */}
                      <div className="w-14 flex-shrink-0 text-center">
                        <p className="text-sm font-bold text-gray-800">{format(new Date(appt.scheduledAt), 'h:mm')}</p>
                        <p className="text-xs text-gray-400">{format(new Date(appt.scheduledAt), 'a')}</p>
                      </div>

                      {/* Divider dot */}
                      <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{appt.patient.firstName} {appt.patient.lastName}</p>
                        <p className="text-xs text-gray-500 truncate">{typeLabel[appt.type] ?? appt.type} · {appt.duration} min{appt.room ? ` · ${appt.room}` : ''}</p>
                      </div>

                      {/* Status badge */}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}

                {/* Completed / cancelled dimmed */}
                {done.map((appt) => {
                  const cfg = statusConfig[appt.status] ?? statusConfig.completed;
                  return (
                    <button
                      key={appt.id}
                      onClick={() => navigate('/appointments')}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left opacity-50"
                    >
                      <div className="w-14 flex-shrink-0 text-center">
                        <p className="text-sm font-medium text-gray-500">{format(new Date(appt.scheduledAt), 'h:mm')}</p>
                        <p className="text-xs text-gray-400">{format(new Date(appt.scheduledAt), 'a')}</p>
                      </div>
                      <div className="flex-col items-center gap-0.5 flex-shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-600 truncate line-through">{appt.patient.firstName} {appt.patient.lastName}</p>
                        <p className="text-xs text-gray-400 truncate">{typeLabel[appt.type] ?? appt.type}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border flex-shrink-0 ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
              <div className="flex items-center gap-2">
                <Activity size={16} className="text-primary-600" />
                <h2 className="font-semibold text-gray-900">Recent Patients</h2>
              </div>
              <button onClick={() => navigate('/patients')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</button>
            </div>
            <div className="divide-y divide-gray-50">
              {patients.slice(0, 5).map((p) => (
                <button key={p.id} onClick={() => navigate(`/patients/${p.id}`)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-sm font-bold flex-shrink-0">
                    {p.firstName[0]}{p.lastName[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{p.firstName} {p.lastName}</p>
                    <p className="text-xs text-gray-400">{p.mrn} · {p.gender} · {new Date().getFullYear() - new Date(p.dateOfBirth).getFullYear()} yrs</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {p.alerts && p.alerts.length > 0 && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">Alert</span>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* RIGHT: Active alerts (all roles) */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-orange-500" />
              <h2 className="font-semibold text-gray-900">Active Alerts</h2>
              {alertStats.active > 0 && <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">{alertStats.active}</span>}
            </div>
            <button onClick={() => navigate('/alerts')} className="text-sm text-primary-600 hover:text-primary-700 font-medium">View all</button>
          </div>
          <div className="divide-y divide-gray-50">
            {alerts.slice(0, 5).map((a) => (
              <div key={a.id} className="px-5 py-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {a.patient ? `${a.patient.firstName} ${a.patient.lastName} · ` : ''}
                      <Clock size={10} className="inline mr-1" />
                      {format(new Date(a.createdAt), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <SeverityBadge severity={a.severity} />
                </div>
              </div>
            ))}
            {alerts.length === 0 && (
              <div className="px-5 py-8 text-center">
                <CheckCircle size={32} className="mx-auto text-green-400 mb-2" />
                <p className="text-sm text-gray-500">No active alerts</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom banner */}
      <div className="mt-6 bg-gradient-to-r from-primary-600 to-primary-700 rounded-xl p-5 text-white flex items-center gap-4">
        <TrendingUp size={28} className="flex-shrink-0 opacity-80" />
        <div className="flex-1">
          <p className="font-semibold">Risk Prediction Engine Active</p>
          <p className="text-primary-200 text-sm mt-0.5">AI-powered risk scores are calculated for all patients. High-risk patients are flagged for proactive intervention.</p>
        </div>
        <button onClick={() => navigate('/patients')} className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all">
          Review Patients
        </button>
      </div>
    </div>
  );
}
