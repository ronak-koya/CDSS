import { useState } from 'react';
import { LabResult } from '../../types';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Plus, X, Loader2 } from 'lucide-react';
import api from '../../lib/api';

interface Props {
  labs: LabResult[];
  patientId: string;
  onRefresh: () => void;
}

const flagConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  critical: { label: 'Critical', color: 'text-red-700', bg: 'bg-red-100 border-red-200', icon: AlertTriangle },
  high: { label: 'High', color: 'text-orange-700', bg: 'bg-orange-100 border-orange-200', icon: TrendingUp },
  low: { label: 'Low', color: 'text-blue-700', bg: 'bg-blue-100 border-blue-200', icon: TrendingDown },
  normal: { label: 'Normal', color: 'text-green-700', bg: 'bg-green-100 border-green-200', icon: Minus },
};

function FlagBadge({ flag }: { flag?: string }) {
  const cfg = flagConfig[flag?.toLowerCase() ?? 'normal'] ?? flagConfig.normal;
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <Icon size={10} />{cfg.label}
    </span>
  );
}

const EMPTY = { testName: '', value: '', unit: '', referenceRange: '', flag: 'normal', resultDate: format(new Date(), 'yyyy-MM-dd') };

export default function LabsTab({ labs, patientId, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const critical = labs.filter((l) => l.flag === 'critical');
  const abnormal = labs.filter((l) => l.flag === 'high' || l.flag === 'low');

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.testName || !form.value) { setError('Test name and value are required.'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/labs`, form);
      setShowModal(false);
      setForm(EMPTY);
      onRefresh();
    } catch {
      setError('Failed to save lab result. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Plus size={16} /> Add Lab Result
        </button>
      </div>

      {/* Critical values banner */}
      {critical.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm font-bold text-red-700">{critical.length} Critical Value{critical.length > 1 ? 's' : ''} — Immediate Attention Required</span>
          </div>
          {critical.map((l) => (
            <p key={l.id} className="text-sm text-red-600">• {l.testName}: {l.value} {l.unit} (Ref: {l.referenceRange})</p>
          ))}
        </div>
      )}

      {/* Abnormal summary */}
      {abnormal.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-orange-700 mb-1">{abnormal.length} Abnormal Result{abnormal.length > 1 ? 's' : ''}</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {abnormal.map((l) => (
              <span key={l.id} className={`text-xs px-2 py-1 rounded-full border font-medium ${l.flag === 'high' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                {l.testName}: {l.value} {l.unit} ({l.flag})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Full lab table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">All Lab Results ({labs.length})</h3>
        </div>
        {labs.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No lab results recorded</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Test</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Result</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Flag</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {labs.map((l) => (
                  <tr key={l.id} className={`hover:bg-gray-50 ${l.flag === 'critical' ? 'bg-red-50/40' : l.flag === 'high' || l.flag === 'low' ? 'bg-orange-50/20' : ''}`}>
                    <td className="px-5 py-3 font-medium text-gray-800">{l.testName}</td>
                    <td className="px-4 py-3 text-right font-bold">
                      <span className={l.flag === 'critical' ? 'text-red-600' : l.flag === 'high' ? 'text-orange-600' : l.flag === 'low' ? 'text-blue-600' : 'text-gray-800'}>
                        {l.value} {l.unit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400 text-xs max-w-xs truncate">{l.referenceRange ?? '—'}</td>
                    <td className="px-4 py-3 text-center"><FlagBadge flag={l.flag} /></td>
                    <td className="px-4 py-3 text-right text-gray-500">{format(new Date(l.resultDate), 'MMM d, yyyy')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Lab Result</h2>
              <button onClick={() => { setShowModal(false); setError(''); setForm(EMPTY); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Test Name <span className="text-red-500">*</span></label>
                <input value={form.testName} onChange={e => set('testName', e.target.value)} placeholder="e.g. Hemoglobin, Glucose, TSH" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Value <span className="text-red-500">*</span></label>
                  <input value={form.value} onChange={e => set('value', e.target.value)} placeholder="e.g. 12.5" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unit</label>
                  <input value={form.unit} onChange={e => set('unit', e.target.value)} placeholder="e.g. g/dL, mg/dL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reference Range</label>
                <input value={form.referenceRange} onChange={e => set('referenceRange', e.target.value)} placeholder="e.g. 12.0–16.0 g/dL" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Flag</label>
                  <select value={form.flag} onChange={e => set('flag', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    <option value="normal">Normal</option>
                    <option value="low">Low</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Result Date</label>
                  <input type="date" value={form.resultDate} onChange={e => set('resultDate', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowModal(false); setError(''); setForm(EMPTY); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Result'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
