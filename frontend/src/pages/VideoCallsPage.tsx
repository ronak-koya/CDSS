import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Clock, CheckCircle, XCircle, CalendarDays, Loader2, PhoneCall } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { format, formatDistanceToNow } from 'date-fns';

interface VideoCall {
  id: string;
  status: string;
  scheduledAt: string | null;
  startedAt:   string | null;
  endedAt:     string | null;
  duration:    number | null;
  callNotes:   string | null;
  doctor:  { id: string; firstName: string; lastName: string; specialty?: string };
  patient: { id: string; firstName: string; lastName: string; mrn: string };
}

const STATUS_META: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  scheduled:  { label: 'Scheduled',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',  icon: CalendarDays },
  active:     { label: 'Active',     color: 'text-green-700',  bg: 'bg-green-50 border-green-200', icon: PhoneCall },
  completed:  { label: 'Completed',  color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200',   icon: CheckCircle },
  cancelled:  { label: 'Cancelled',  color: 'text-red-700',    bg: 'bg-red-50 border-red-200',     icon: XCircle },
};

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function VideoCallsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [calls, setCalls] = useState<VideoCall[]>([]);
  const [loading, setLoading] = useState(true);
  const isDoctor = user?.role === 'DOCTOR';

  useEffect(() => {
    api.get<VideoCall[]>('/calls')
      .then(r => setCalls(r.data))
      .finally(() => setLoading(false));
  }, []);

  const activeCalls    = calls.filter(c => c.status === 'active');
  const scheduledCalls = calls.filter(c => c.status === 'scheduled');
  const pastCalls      = calls.filter(c => c.status === 'completed' || c.status === 'cancelled');

  function CallCard({ call }: { call: VideoCall }) {
    const meta = STATUS_META[call.status] ?? STATUS_META.cancelled;
    const Icon = meta.icon;
    const peer = isDoctor
      ? `${call.patient.firstName} ${call.patient.lastName} (${call.patient.mrn})`
      : `Dr. ${call.doctor.firstName} ${call.doctor.lastName}${call.doctor.specialty ? ` · ${call.doctor.specialty}` : ''}`;

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all">
        <div className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 ${meta.bg}`}>
          <Icon size={18} className={meta.color} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{peer}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>
              {meta.label}
            </span>
            {call.scheduledAt && (
              <span className="text-xs text-gray-400">
                {format(new Date(call.scheduledAt), 'MMM d, h:mm a')}
              </span>
            )}
            {call.startedAt && call.status !== 'active' && (
              <span className="text-xs text-gray-400">
                {formatDistanceToNow(new Date(call.startedAt), { addSuffix: true })}
              </span>
            )}
            {call.duration != null && (
              <span className="text-xs text-gray-400 flex items-center gap-1">
                <Clock size={11} /> {fmtDuration(call.duration)}
              </span>
            )}
          </div>
          {call.callNotes && (
            <p className="text-xs text-gray-500 mt-1 truncate">{call.callNotes}</p>
          )}
        </div>
        {(call.status === 'active' || call.status === 'scheduled') && (
          <button
            onClick={() => navigate(`/call/${call.id}`)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0
              ${call.status === 'active'
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-sm shadow-green-500/30'
                : 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm'}`}
          >
            <Video size={14} />
            {call.status === 'active' ? 'Join Now' : 'Join'}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
            <Video size={20} className="text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Video Consultations</h1>
            <p className="text-gray-500 text-sm mt-0.5">
              {isDoctor ? 'Manage your telemedicine sessions' : 'Your upcoming and past video calls'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-primary-400" />
        </div>
      ) : calls.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
          <Video size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No video consultations yet</p>
          <p className="text-gray-400 text-sm mt-1">
            {isDoctor ? 'Start a call from a patient\'s profile page.' : 'Your doctor will initiate a call when needed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {activeCalls.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Active Now</h2>
              <div className="space-y-3">{activeCalls.map(c => <CallCard key={c.id} call={c} />)}</div>
            </section>
          )}
          {scheduledCalls.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Scheduled</h2>
              <div className="space-y-3">{scheduledCalls.map(c => <CallCard key={c.id} call={c} />)}</div>
            </section>
          )}
          {pastCalls.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Past Calls</h2>
              <div className="space-y-3">{pastCalls.map(c => <CallCard key={c.id} call={c} />)}</div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
