import { useState } from 'react';
import { Medication } from '../../types';
import { Pill, CheckCircle, XCircle, Plus, X, Loader2, StopCircle, Tag } from 'lucide-react';
import { format } from 'date-fns';
import api from '../../lib/api';

interface Props {
  medications: Medication[];
  patientId: string;
  onRefresh: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PURPOSES = [
  'Cardiac Care (Acute Chest Pain)',
  'Hypertension',
  'Cholesterol Management',
  'Emergency / Acute Care',
  'Anticoagulant',
  'Diabetes Management',
  'Pain Management',
  'Infection / Antibiotic',
  'Respiratory / Asthma',
  'Neurological',
  'Thyroid Management',
  'Psychiatric / Mental Health',
  'Gastrointestinal',
  'Renal / Kidney Support',
  'Allergy / Antihistamine',
  'Vitamin / Supplement',
  'Oncology / Chemotherapy',
  'Post-operative Care',
  'Immunosuppression',
  'Other',
];

const ROUTES = ['Oral', 'Intravenous', 'Sublingual', 'Inhaled', 'Topical', 'Subcutaneous', 'Intramuscular', 'Transdermal', 'Rectal', 'Nasal'];

const routeColors: Record<string, string> = {
  Oral:           'bg-blue-100 text-blue-700',
  Intravenous:    'bg-red-100 text-red-700',
  Sublingual:     'bg-violet-100 text-violet-700',
  Inhaled:        'bg-teal-100 text-teal-700',
  Topical:        'bg-green-100 text-green-700',
  Subcutaneous:   'bg-purple-100 text-purple-700',
  Intramuscular:  'bg-orange-100 text-orange-700',
  Transdermal:    'bg-yellow-100 text-yellow-700',
  Rectal:         'bg-pink-100 text-pink-700',
  Nasal:          'bg-cyan-100 text-cyan-700',
};

const EMPTY = {
  name: '',
  dosage: '',
  frequency: '',
  route: '',
  purpose: '',
  startDate: format(new Date(), 'yyyy-MM-dd'),
};

// ─── MedicationsTab ───────────────────────────────────────────────────────────

export default function MedicationsTab({ medications, patientId, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [discontinuingId, setDiscontinuingId] = useState<string | null>(null);

  const active       = medications.filter(m => m.status === 'active');
  const discontinued = medications.filter(m => m.status !== 'active');

  const set = (k: keyof typeof EMPTY, v: string) => setForm(f => ({ ...f, [k]: v }));

  const closeModal = () => { setShowModal(false); setError(''); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.name || !form.dosage || !form.frequency) {
      setError('Name, dosage, and frequency are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/medications`, form);
      closeModal();
      onRefresh();
    } catch {
      setError('Failed to save medication. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDiscontinue = async (medId: string) => {
    setDiscontinuingId(medId);
    try {
      await api.patch(`/patients/${patientId}/medications/${medId}`, {
        status: 'discontinued',
        endDate: new Date().toISOString(),
      });
      onRefresh();
    } catch {
      // silent
    } finally {
      setDiscontinuingId(null);
    }
  };

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500';

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Plus size={16} /> Add Medication
        </button>
      </div>

      {/* Active medications */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle size={16} className="text-green-500" />
          <h3 className="text-sm font-semibold text-gray-700">Active Medications ({active.length})</h3>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8 bg-white rounded-xl border border-gray-100">No active medications</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {active.map(m => (
              <div key={m.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-primary-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Pill size={18} className="text-primary-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">{m.name}</p>
                      <p className="text-sm text-gray-600 mt-0.5">{m.dosage}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{m.frequency}</p>
                      {m.purpose && (
                        <div className="flex items-center gap-1 mt-1.5">
                          <Tag size={11} className="text-primary-400 flex-shrink-0" />
                          <span className="text-xs text-primary-600 font-medium truncate">{m.purpose}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    {m.route && (
                      <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${routeColors[m.route] ?? 'bg-gray-100 text-gray-600'}`}>
                        {m.route}
                      </span>
                    )}
                    <button
                      onClick={() => handleDiscontinue(m.id)}
                      disabled={discontinuingId === m.id}
                      className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                    >
                      {discontinuingId === m.id ? <Loader2 size={12} className="animate-spin" /> : <StopCircle size={12} />}
                      Discontinue
                    </button>
                  </div>
                </div>
                <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3 text-xs text-gray-400 flex-wrap">
                  {m.startDate && <span>Started {format(new Date(m.startDate), 'MMM d, yyyy')}</span>}
                  {m.prescribedBy && <span>· By {m.prescribedBy}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Discontinued */}
      {discontinued.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <XCircle size={16} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-500">Discontinued ({discontinued.length})</h3>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Medication</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Purpose</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Dosage</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Frequency</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">End Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {discontinued.map(m => (
                  <tr key={m.id} className="text-gray-400 hover:bg-gray-50">
                    <td className="px-5 py-3 line-through">{m.name}</td>
                    <td className="px-4 py-3 text-xs">{m.purpose ?? '—'}</td>
                    <td className="px-4 py-3">{m.dosage}</td>
                    <td className="px-4 py-3">{m.frequency}</td>
                    <td className="px-4 py-3">{m.endDate ? format(new Date(m.endDate), 'MMM d, yyyy') : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Medication Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Pill size={15} className="text-primary-600" />
                </div>
                <h2 className="text-base font-bold text-gray-900">Add Medication</h2>
              </div>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {error && (
                <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* Purpose — first so clinical context leads */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Purpose / Clinical Indication
                </label>
                <select
                  value={form.purpose}
                  onChange={e => set('purpose', e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select purpose…</option>
                  {PURPOSES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                {/* Allow free-text if "Other" or blank */}
                {(form.purpose === 'Other' || (!PURPOSES.includes(form.purpose) && form.purpose !== '')) && (
                  <input
                    type="text"
                    value={form.purpose === 'Other' ? '' : form.purpose}
                    onChange={e => set('purpose', e.target.value)}
                    placeholder="Describe the clinical indication…"
                    className={`${inputCls} mt-2`}
                    autoFocus
                  />
                )}
              </div>

              {/* Medication name */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Medication Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => set('name', e.target.value)}
                  placeholder="e.g. Aspirin, Metformin, Atorvastatin"
                  className={inputCls}
                />
              </div>

              {/* Dosage + Frequency */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Dosage <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.dosage}
                    onChange={e => set('dosage', e.target.value)}
                    placeholder="e.g. 325 mg, 5000 units"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Frequency <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.frequency}
                    onChange={e => set('frequency', e.target.value)}
                    placeholder="e.g. Once daily, Every 8 hours"
                    className={inputCls}
                  />
                </div>
              </div>

              {/* Route + Start date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Route</label>
                  <select
                    value={form.route}
                    onChange={e => set('route', e.target.value)}
                    className={inputCls}
                  >
                    <option value="">Select route…</option>
                    {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={e => set('startDate', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Add Medication'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
