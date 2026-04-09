import { useState, useEffect } from 'react';
import { Brain, ChevronRight, ChevronDown, AlertTriangle, CheckCircle, XCircle, Clock, Loader2, Activity, FlaskConical, FileText } from 'lucide-react';
import api from '../../lib/api';
import { DiagnosisSession, Diagnosis } from '../../types';
import { format } from 'date-fns';

// ─── helpers ─────────────────────────────────────────────────────────────────

const urgencyConfig: Record<string, { label: string; cls: string }> = {
  emergency: { label: 'Emergency', cls: 'bg-red-100 text-red-700 border-red-200' },
  urgent:    { label: 'Urgent',    cls: 'bg-orange-100 text-orange-700 border-orange-200' },
  routine:   { label: 'Routine',   cls: 'bg-green-100 text-green-700 border-green-200' },
};

const severityColor: Record<string, string> = {
  critical: 'text-red-600',
  severe:   'text-orange-600',
  moderate: 'text-yellow-600',
  mild:     'text-green-600',
};

const statusIcon = (status: string) => {
  if (status === 'confirmed') return <CheckCircle size={13} className="text-green-500" />;
  if (status === 'rejected')  return <XCircle size={13} className="text-gray-400" />;
  return <Clock size={13} className="text-yellow-500" />;
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-gray-300';
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-600 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── DiagnosisDetailPanel ─────────────────────────────────────────────────────

function DiagnosisDetailPanel({ session, onClose }: { session: DiagnosisSession; onClose: () => void }) {
  const symptoms: { name: string; severity: string; duration: string }[] = JSON.parse(session.symptoms || '[]');
  const redFlags: string[] = session.redFlags ? JSON.parse(session.redFlags) : [];

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <Brain size={18} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">AI Diagnosis Session</h2>
              <p className="text-xs text-gray-400">{format(new Date(session.createdAt), 'MMMM d, yyyy — h:mm a')}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none">×</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Red flags */}
          {redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={15} className="text-red-500" />
                <span className="text-sm font-bold text-red-700">Clinical Red Flags</span>
              </div>
              {redFlags.map((f, i) => <p key={i} className="text-sm text-red-600">• {f}</p>)}
            </div>
          )}

          {/* Clinical notes */}
          {session.clinicalNotes && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText size={14} className="text-blue-600" />
                <span className="text-xs font-bold text-blue-700 uppercase">Clinical Notes</span>
              </div>
              <p className="text-sm text-blue-700">{session.clinicalNotes}</p>
            </div>
          )}

          {/* Symptoms presented */}
          {symptoms.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                <Activity size={13} /> Symptoms Presented
              </p>
              <div className="flex flex-wrap gap-2">
                {symptoms.map((s, i) => (
                  <span key={i} className="text-xs bg-gray-100 text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg">
                    {s.name} · <span className="capitalize">{s.severity}</span> · {s.duration}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Diagnoses */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Differential Diagnoses ({session.diagnoses.length})</p>
            <div className="space-y-3">
              {session.diagnoses.map((d, i) => {
                const evidence: string[] = d.evidence ? JSON.parse(d.evidence) : [];
                const urgency = (d as unknown as { urgency?: string }).urgency ?? 'routine';
                const urg = urgencyConfig[urgency] ?? urgencyConfig.routine;
                return (
                  <div key={d.id} className={`rounded-xl border p-4 ${d.status === 'confirmed' ? 'border-green-200 bg-green-50/40' : d.status === 'rejected' ? 'border-gray-100 bg-gray-50/50 opacity-60' : 'border-gray-100 bg-white'}`}>
                    <div className="flex items-start gap-3">
                      <span className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {statusIcon(d.status)}
                          <span className="font-semibold text-gray-900 text-sm">{d.name}</span>
                          {d.icdCode && <span className="text-xs text-gray-400 font-mono">{d.icdCode}</span>}
                          {d.severity && <span className={`text-xs font-semibold capitalize ${severityColor[d.severity] ?? 'text-gray-500'}`}>{d.severity}</span>}
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${urg.cls}`}>{urg.label}</span>
                        </div>
                        {d.confidence !== undefined && <ConfidenceBar value={d.confidence} />}
                        {d.reasoning && (
                          <p className="text-xs text-gray-600 mt-2 bg-gray-50 rounded-lg p-2.5">{d.reasoning}</p>
                        )}
                        {evidence.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {evidence.map((e, ei) => (
                              <span key={ei} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-md">{e}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SessionRow ───────────────────────────────────────────────────────────────

function SessionRow({ session, onClick }: { session: DiagnosisSession; onClick: () => void }) {
  const confirmed = session.diagnoses.filter(d => d.status === 'confirmed').length;
  const pending   = session.diagnoses.filter(d => d.status === 'pending').length;
  const symptoms: { name: string }[] = JSON.parse(session.symptoms || '[]');
  const topDx = session.diagnoses[0];

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white border border-gray-100 rounded-xl p-4 hover:border-primary-200 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-100 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-primary-100 transition-colors">
          <Brain size={18} className="text-primary-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-3 mb-1">
            <p className="text-sm font-semibold text-gray-900">
              {topDx ? topDx.name : 'AI Diagnosis Session'}
              {session.diagnoses.length > 1 && (
                <span className="ml-1.5 text-xs font-normal text-gray-400">+{session.diagnoses.length - 1} more</span>
              )}
            </p>
            <span className="text-xs text-gray-400 whitespace-nowrap">{format(new Date(session.createdAt), 'MMM d, yyyy')}</span>
          </div>

          <p className="text-xs text-gray-500 mb-2">{format(new Date(session.createdAt), 'h:mm a')}</p>

          {/* Symptom chips */}
          {symptoms.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {symptoms.slice(0, 4).map((s, i) => (
                <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{s.name}</span>
              ))}
              {symptoms.length > 4 && <span className="text-xs text-gray-400">+{symptoms.length - 4} more</span>}
            </div>
          )}

          <div className="flex items-center gap-3">
            {confirmed > 0 && (
              <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                <CheckCircle size={11} /> {confirmed} confirmed
              </span>
            )}
            {pending > 0 && (
              <span className="flex items-center gap-1 text-xs text-yellow-600 font-medium">
                <Clock size={11} /> {pending} pending
              </span>
            )}
            <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
              View details <ChevronRight size={13} />
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}

// ─── DiagnosisHistoryTab ──────────────────────────────────────────────────────

export default function DiagnosisHistoryTab({ patientId }: { patientId: string }) {
  const [sessions, setSessions] = useState<DiagnosisSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<DiagnosisSession | null>(null);

  useEffect(() => {
    api.get<DiagnosisSession[]>(`/diagnosis/sessions/${patientId}`)
      .then(res => setSessions(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [patientId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={28} className="animate-spin text-primary-400" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-gray-100">
        <FlaskConical size={36} className="mx-auto text-gray-200 mb-3" />
        <p className="text-gray-500 font-medium">No diagnosis history yet</p>
        <p className="text-gray-400 text-sm mt-1">Run an AI diagnosis to start building history</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {sessions.map(session => (
          <SessionRow key={session.id} session={session} onClick={() => setSelected(session)} />
        ))}
      </div>

      {selected && (
        <DiagnosisDetailPanel session={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}
