import { useState, useEffect } from 'react';
import { Encounter } from '../../types';
import {
  Stethoscope, CheckCircle, Clock, LogOut, ChevronDown, ChevronUp,
  Plus, X, Loader2, Pencil, Trash2, AlertCircle, Save, Brain,
} from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Doctor { id: string; firstName: string; lastName: string; specialty?: string; }

interface SoapNotes {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  active:     { label: 'Active',     color: 'bg-green-100 text-green-700 border-green-200',  icon: Clock },
  completed:  { label: 'Completed',  color: 'bg-blue-100 text-blue-700 border-blue-200',     icon: CheckCircle },
  discharged: { label: 'Discharged', color: 'bg-gray-100 text-gray-600 border-gray-200',     icon: LogOut },
};

const EMPTY_SOAP: SoapNotes = { subjective: '', objective: '', assessment: '', plan: '' };

function parseSoap(raw?: string | null): SoapNotes {
  if (!raw) return EMPTY_SOAP;
  try { return { ...EMPTY_SOAP, ...JSON.parse(raw) }; } catch { return EMPTY_SOAP; }
}

// ─── StartEncounterModal ──────────────────────────────────────────────────────

function StartEncounterModal({
  patientId,
  onClose,
  onCreated,
}: {
  patientId: string;
  onClose: () => void;
  onCreated: (enc: Encounter) => void;
}) {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [doctorId, setDoctorId] = useState(user?.role === 'DOCTOR' ? user.id : '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get<Doctor[]>(`/patients/${patientId}/doctors`).then(r => {
      setDoctors(r.data);
      if (!doctorId && r.data.length > 0) setDoctorId(r.data[0].id);
    }).catch(() => {});
  }, [patientId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chiefComplaint.trim()) { setError('Chief complaint is required.'); return; }
    if (!doctorId) { setError('Please select an attending doctor.'); return; }
    setError(''); setSaving(true);
    try {
      const res = await api.post<Encounter>(`/patients/${patientId}/encounters`, { chiefComplaint: chiefComplaint.trim(), doctorId });
      onCreated(res.data);
    } catch {
      setError('Failed to start encounter. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <Stethoscope size={16} className="text-primary-600" />
            </div>
            <h2 className="text-base font-bold text-gray-900">Start New Encounter</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              <AlertCircle size={14} className="flex-shrink-0" />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Chief Complaint <span className="text-red-500">*</span></label>
            <input
              autoFocus
              type="text"
              value={chiefComplaint}
              onChange={e => setChiefComplaint(e.target.value)}
              placeholder="e.g. Chest pain, Shortness of breath…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Attending Doctor <span className="text-red-500">*</span></label>
            <select
              value={doctorId}
              onChange={e => setDoctorId(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select doctor…</option>
              {doctors.map(d => (
                <option key={d.id} value={d.id}>
                  Dr. {d.firstName} {d.lastName}{d.specialty ? ` — ${d.specialty}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-all">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Stethoscope size={14} />}
              Start Encounter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SoapEditor ───────────────────────────────────────────────────────────────

function SoapEditor({
  encounter,
  patientId,
  onUpdated,
  onClose,
}: {
  encounter: Encounter;
  patientId: string;
  onUpdated: (enc: Encounter) => void;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [soap, setSoap] = useState<SoapNotes>(parseSoap(encounter.soapNotes));
  const [chiefComplaint, setChiefComplaint] = useState(encounter.chiefComplaint ?? '');
  const [saving, setSaving] = useState(false);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  const setField = (k: keyof SoapNotes, v: string) => setSoap(s => ({ ...s, [k]: v }));

  const save = async (newStatus?: string) => {
    const isSaving = !newStatus;
    isSaving ? setSaving(true) : setClosing(true);
    setError('');
    try {
      const payload: Record<string, unknown> = { chiefComplaint, soapNotes: soap };
      if (newStatus) payload.status = newStatus;
      const res = await api.patch<Encounter>(`/patients/${patientId}/encounters/${encounter.id}`, payload);
      onUpdated(res.data);
      if (newStatus) onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally { setSaving(false); setClosing(false); }
  };

  const SOAP_FIELDS: { key: keyof SoapNotes; label: string; placeholder: string }[] = [
    { key: 'subjective', label: 'Subjective',  placeholder: 'Patient\'s reported symptoms, history, complaints…' },
    { key: 'objective',  label: 'Objective',   placeholder: 'Examination findings, vitals, observations…' },
    { key: 'assessment', label: 'Assessment',  placeholder: 'Clinical assessment and differential diagnosis…' },
    { key: 'plan',       label: 'Plan',        placeholder: 'Treatment plan, medications, referrals, follow-up…' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <Pencil size={15} className="text-primary-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Encounter Notes</h2>
              <p className="text-xs text-gray-400">
                Dr. {encounter.doctor?.firstName} {encounter.doctor?.lastName} · {format(new Date(encounter.startedAt), 'MMM d, yyyy h:mm a')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              <AlertCircle size={14} />{error}
            </div>
          )}

          {/* Chief complaint */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Chief Complaint</label>
            <input
              type="text"
              value={chiefComplaint}
              onChange={e => setChiefComplaint(e.target.value)}
              placeholder="Primary reason for visit…"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* SOAP sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {SOAP_FIELDS.map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5">
                  <span className="text-primary-600">{label[0]}</span>
                  <span className="text-gray-500">{label.slice(1)}</span>
                </label>
                <textarea
                  value={soap[key]}
                  onChange={e => setField(key, e.target.value)}
                  placeholder={placeholder}
                  rows={5}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            ))}
          </div>

          {/* AI Diagnosis shortcut */}
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain size={15} className="text-primary-600" />
              <span className="text-sm text-primary-700 font-medium">Need AI assistance?</span>
              <span className="text-xs text-primary-500">Run Groq AI diagnosis for this patient</span>
            </div>
            <button
              onClick={() => navigate(`/diagnosis?patientId=${patientId}`)}
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 underline"
            >
              Open Diagnosis AI →
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-3 px-6 py-4 border-t border-gray-100 flex-shrink-0 flex-wrap">
          <button
            onClick={() => save()}
            disabled={saving || closing}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-all"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Notes
          </button>
          {encounter.status === 'active' && (
            <>
              <button
                onClick={() => save('completed')}
                disabled={saving || closing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-all"
              >
                {closing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Complete & Close
              </button>
              <button
                onClick={() => save('discharged')}
                disabled={saving || closing}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-60 rounded-lg transition-all"
              >
                <LogOut size={14} />
                Discharge
              </button>
            </>
          )}
          <button onClick={onClose} className="ml-auto px-4 py-2 text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EncounterCard ────────────────────────────────────────────────────────────

function EncounterCard({
  encounter,
  patientId,
  onEdit,
  onDelete,
}: {
  encounter: Encounter;
  patientId: string;
  onEdit: (enc: Encounter) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const cfg = statusConfig[encounter.status] ?? statusConfig.completed;
  const Icon = cfg.icon;
  const soapNotes = parseSoap(encounter.soapNotes);
  const hasSoap = Object.values(soapNotes).some(v => v.trim());
  const confirmedDx = encounter.diagnoses?.filter(d => d.status === 'confirmed') ?? [];

  const handleDelete = async () => {
    if (!confirm('Delete this encounter? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await api.delete(`/patients/${patientId}/encounters/${encounter.id}`);
      onDelete(encounter.id);
    } catch { setDeleting(false); }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${encounter.status === 'active' ? 'border-green-200' : 'border-gray-100'}`}>
      {/* Active indicator stripe */}
      {encounter.status === 'active' && <div className="h-1 bg-green-400" />}

      <div className="flex items-start gap-4 p-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${encounter.status === 'active' ? 'bg-green-50' : 'bg-primary-50'}`}>
          <Stethoscope size={18} className={encounter.status === 'active' ? 'text-green-600' : 'text-primary-600'} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="font-semibold text-gray-900">{encounter.chiefComplaint ?? 'General Visit'}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Dr. {encounter.doctor?.firstName} {encounter.doctor?.lastName}
                {encounter.doctor?.specialty && ` · ${encounter.doctor.specialty}`}
                {' · '}{format(new Date(encounter.startedAt), 'MMM d, yyyy h:mm a')}
              </p>
              {encounter.endedAt && (
                <p className="text-xs text-gray-400 mt-0.5">
                  Ended: {format(new Date(encounter.endedAt), 'MMM d, yyyy h:mm a')}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border flex items-center gap-1 ${cfg.color}`}>
                <Icon size={10} />{cfg.label}
              </span>
              <button
                onClick={() => onEdit(encounter)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-primary-600 transition-colors"
                title="Edit encounter"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                title="Delete encounter"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
              {(hasSoap || confirmedDx.length > 0) && (
                <button onClick={() => setExpanded(v => !v)} className="p-1.5 text-gray-400 hover:text-gray-600">
                  {expanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                </button>
              )}
            </div>
          </div>

          {/* Confirmed diagnoses */}
          {confirmedDx.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {confirmedDx.map(d => (
                <span key={d.id} className="text-xs bg-primary-50 text-primary-700 border border-primary-100 px-2 py-0.5 rounded-full">
                  {d.icdCode && <span className="font-mono mr-1">{d.icdCode}</span>}{d.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* SOAP notes expanded */}
      {expanded && hasSoap && (
        <div className="border-t border-gray-50 px-4 py-4 bg-gray-50/50">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">SOAP Notes</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {(['subjective', 'objective', 'assessment', 'plan'] as const).map(section => (
              soapNotes[section] ? (
                <div key={section} className="bg-white rounded-lg border border-gray-100 p-3">
                  <p className="text-xs font-bold uppercase mb-1">
                    <span className="text-primary-600">{section[0].toUpperCase()}</span>
                    <span className="text-gray-500">{section.slice(1)}</span>
                  </p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{soapNotes[section]}</p>
                </div>
              ) : null
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── EncountersTab ────────────────────────────────────────────────────────────

interface Props {
  encounters: Encounter[];
  patientId: string;
  onRefresh: () => void;
}

export default function EncountersTab({ encounters: initial, patientId, onRefresh }: Props) {
  const [encounters, setEncounters] = useState<Encounter[]>(initial);
  const [showStart, setShowStart] = useState(false);
  const [editTarget, setEditTarget] = useState<Encounter | null>(null);

  // Keep in sync if parent refreshes
  useEffect(() => { setEncounters(initial); }, [initial]);

  const handleCreated = (enc: Encounter) => {
    setEncounters(prev => [enc, ...prev]);
    setShowStart(false);
    onRefresh();
  };

  const handleUpdated = (enc: Encounter) => {
    setEncounters(prev => prev.map(e => e.id === enc.id ? enc : e));
    setEditTarget(null);
    onRefresh();
  };

  const handleDeleted = (id: string) => {
    setEncounters(prev => prev.filter(e => e.id !== id));
    onRefresh();
  };

  const active = encounters.filter(e => e.status === 'active');
  const past   = encounters.filter(e => e.status !== 'active');

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {active.length > 0 && <span className="text-green-600 font-semibold">{active.length} active · </span>}
          {encounters.length} total encounter{encounters.length !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowStart(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Plus size={15} /> New Encounter
        </button>
      </div>

      {/* Active encounters first */}
      {active.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" /> Active
          </p>
          {active.map(e => (
            <EncounterCard key={e.id} encounter={e} patientId={patientId} onEdit={setEditTarget} onDelete={handleDeleted} />
          ))}
        </div>
      )}

      {/* Past encounters */}
      {past.length > 0 && (
        <div className="space-y-3">
          {active.length > 0 && (
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past Encounters</p>
          )}
          {past.map(e => (
            <EncounterCard key={e.id} encounter={e} patientId={patientId} onEdit={setEditTarget} onDelete={handleDeleted} />
          ))}
        </div>
      )}

      {encounters.length === 0 && (
        <div className="text-center py-14 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Stethoscope size={36} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No encounters recorded</p>
          <p className="text-gray-400 text-sm mt-1">Click "New Encounter" to start the first one</p>
        </div>
      )}

      {showStart && (
        <StartEncounterModal patientId={patientId} onClose={() => setShowStart(false)} onCreated={handleCreated} />
      )}
      {editTarget && (
        <SoapEditor encounter={editTarget} patientId={patientId} onUpdated={handleUpdated} onClose={() => setEditTarget(null)} />
      )}
    </div>
  );
}
