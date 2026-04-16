import { useEffect, useState } from 'react';
import { CalendarDays, Pill, FlaskConical, ChevronRight, Video, PhoneCall } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../lib/api';
import { format } from 'date-fns';

interface Summary {
  nextAppointment: {
    doctor: string;
    specialty?: string;
    scheduledAt: string;
    department?: string;
    status: string;
  } | null;
  activeMedCount: number;
  recentLabCount: number;
}

interface ActiveCall {
  id: string;
  status: string;
  doctor: { firstName: string; lastName: string; specialty?: string };
}

export default function PortalDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);

  useEffect(() => {
    api.get<Summary>('/portal/summary')
      .then(r => setSummary(r.data))
      .finally(() => setLoading(false));

    // Check for active or scheduled calls
    api.get<ActiveCall[]>('/calls')
      .then(r => {
        const live = r.data.find(c => c.status === 'active' || c.status === 'scheduled');
        setActiveCall(live ?? null);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">
          Welcome, {user?.firstName}
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Here's your health summary</p>
      </div>

      {/* Active / scheduled call banner */}
      {activeCall && (
        <div className={`flex items-center justify-between gap-4 rounded-xl border px-5 py-4 ${
          activeCall.status === 'active'
            ? 'bg-green-50 border-green-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
              activeCall.status === 'active' ? 'bg-green-100' : 'bg-blue-100'
            }`}>
              {activeCall.status === 'active'
                ? <PhoneCall size={18} className="text-green-600 animate-pulse" />
                : <Video size={18} className="text-blue-600" />}
            </div>
            <div>
              <p className={`text-sm font-semibold ${activeCall.status === 'active' ? 'text-green-800' : 'text-blue-800'}`}>
                {activeCall.status === 'active' ? 'Your doctor is ready' : 'Upcoming video consultation'}
              </p>
              <p className={`text-xs mt-0.5 ${activeCall.status === 'active' ? 'text-green-700' : 'text-blue-700'}`}>
                Dr. {activeCall.doctor.firstName} {activeCall.doctor.lastName}
                {activeCall.doctor.specialty && ` · ${activeCall.doctor.specialty}`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate(`/call/${activeCall.id}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all flex-shrink-0 ${
              activeCall.status === 'active'
                ? 'bg-green-600 hover:bg-green-700 shadow-sm shadow-green-500/30'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Video size={14} />
            {activeCall.status === 'active' ? 'Join Now' : 'Join Call'}
          </button>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Next appointment */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 md:col-span-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <CalendarDays size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Next Appointment</p>
                {loading ? (
                  <div className="h-5 w-48 bg-gray-100 rounded animate-pulse mt-1" />
                ) : summary?.nextAppointment ? (
                  <div className="mt-0.5">
                    <p className="font-semibold text-gray-900">{summary.nextAppointment.doctor}</p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(summary.nextAppointment.scheduledAt), 'MMM d, yyyy h:mm a')}
                      {summary.nextAppointment.department && ` · ${summary.nextAppointment.department}`}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 mt-0.5">No upcoming appointments</p>
                )}
              </div>
            </div>
            <Link to="/portal/appointments" className="text-xs text-primary-600 hover:underline flex items-center gap-0.5">
              View all <ChevronRight size={14} />
            </Link>
          </div>
        </div>

        {/* Active meds */}
        <Link to="/portal/medications" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Pill size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Medications</p>
              {loading ? (
                <div className="h-7 w-10 bg-gray-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{summary?.activeMedCount ?? 0}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-0.5">
            View prescriptions <ChevronRight size={12} />
          </p>
        </Link>

        {/* Recent labs */}
        <Link to="/portal/results" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-violet-50 flex items-center justify-center">
              <FlaskConical size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Recent Lab Results</p>
              {loading ? (
                <div className="h-7 w-10 bg-gray-100 rounded animate-pulse mt-1" />
              ) : (
                <p className="text-2xl font-bold text-gray-900">{summary?.recentLabCount ?? 0}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-0.5">
            View results <ChevronRight size={12} />
          </p>
        </Link>

        {/* Quick links */}
        <Link to="/portal/profile" className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center">
              <span className="text-lg">👤</span>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">My Profile</p>
              <p className="text-sm font-medium text-gray-700 mt-0.5">View & manage</p>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-3 flex items-center gap-0.5">
            View profile <ChevronRight size={12} />
          </p>
        </Link>
      </div>

      {/* Info notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>Read-only portal.</strong> This portal is for viewing your health information. To make changes to your records, please contact your care team.
      </div>
    </div>
  );
}
