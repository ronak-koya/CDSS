import { useEffect, useState } from 'react';
import { CalendarDays, Clock, MapPin } from 'lucide-react';
import api from '../../lib/api';
import { format, isPast } from 'date-fns';

interface PortalAppointment {
  id: string;
  title: string;
  type: string;
  status: string;
  scheduledAt: string;
  duration: number;
  department?: string;
  room?: string;
  notes?: string;
  completionNotes?: string;
  doctor: { firstName: string; lastName: string; specialty?: string };
}

const statusColors: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-gray-100 text-gray-600',
  cancelled: 'bg-red-100 text-red-600',
  no_show: 'bg-orange-100 text-orange-600',
};

export default function PortalAppointments() {
  const [appointments, setAppointments] = useState<PortalAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  useEffect(() => {
    api.get<PortalAppointment[]>('/portal/appointments')
      .then(r => setAppointments(r.data))
      .finally(() => setLoading(false));
  }, []);

  const now = new Date();
  const upcoming = appointments.filter(a =>
    !isPast(new Date(a.scheduledAt)) || a.status === 'in_progress'
  );
  const past = appointments.filter(a =>
    isPast(new Date(a.scheduledAt)) && a.status !== 'in_progress'
  );
  const displayed = tab === 'upcoming' ? upcoming : past;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Appointments</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your scheduled and past visits</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'upcoming' ? 'Upcoming' : 'Past'} ({t === 'upcoming' ? upcoming.length : past.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : displayed.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <CalendarDays className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-gray-500 text-sm">No {tab} appointments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayed.map(appt => (
            <div key={appt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-blue-50 flex flex-col items-center justify-center text-center flex-shrink-0">
                    <p className="text-xs font-bold text-blue-700">{format(new Date(appt.scheduledAt), 'MMM').toUpperCase()}</p>
                    <p className="text-lg font-bold text-blue-900 leading-none">{format(new Date(appt.scheduledAt), 'd')}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">{appt.title}</p>
                    <p className="text-sm text-gray-600">Dr. {appt.doctor.firstName} {appt.doctor.lastName}
                      {appt.doctor.specialty && <span className="text-gray-400"> · {appt.doctor.specialty}</span>}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Clock size={12} /> {format(new Date(appt.scheduledAt), 'h:mm a')} · {appt.duration} min
                      </span>
                      {appt.department && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} /> {appt.department}
                          {appt.room && `, Room ${appt.room}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${statusColors[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                  {appt.status.replace('_', ' ')}
                </span>
              </div>
              {appt.completionNotes && (
                <div className="mt-3 pt-3 border-t border-gray-50 text-sm text-gray-600">
                  <span className="font-medium text-gray-700">Visit notes: </span>
                  {appt.completionNotes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
