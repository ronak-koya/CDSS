import { useState } from 'react';
import { Vital } from '../../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';
import { Plus, X, Loader2 } from 'lucide-react';
import api from '../../lib/api';

interface Props {
  vitals: Vital[];
  patientId: string;
  onRefresh: () => void;
}

const EMPTY = { systolicBP: '', diastolicBP: '', heartRate: '', temperature: '', spO2: '', respiratoryRate: '', weight: '', height: '', chiefComplaint: '' };

export default function VitalsTab({ vitals, patientId, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const sorted = [...vitals].sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());

  const chartData = sorted.map((v) => ({
    date: format(new Date(v.recordedAt), 'MM/dd HH:mm'),
    SystolicBP: v.systolicBP,
    DiastolicBP: v.diastolicBP,
    HeartRate: v.heartRate,
    SpO2: v.spO2,
    Temperature: v.temperature ? Math.round(v.temperature * 10) / 10 : null,
    RespRate: v.respiratoryRate,
  }));

  const getFlag = (key: string, val?: number | null) => {
    if (!val) return '';
    if (key === 'SystolicBP') return val >= 180 ? '🔴' : val >= 140 ? '🟡' : '🟢';
    if (key === 'SpO2') return val < 90 ? '🔴' : val < 95 ? '🟡' : '🟢';
    if (key === 'HeartRate') return val > 120 || val < 50 ? '🔴' : val > 100 || val < 60 ? '🟡' : '🟢';
    return '';
  };

  const latest = vitals[0];

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/vitals`, form);
      setShowModal(false);
      setForm(EMPTY);
      onRefresh();
    } catch {
      setError('Failed to save vitals. Please try again.');
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
          <Plus size={16} /> Record Vitals
        </button>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Blood Pressure (mmHg)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[60, 200]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line type="monotone" dataKey="SystolicBP" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="DiastolicBP" stroke="#f97316" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Heart Rate (bpm)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[40, 160]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="HeartRate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">SpO2 (%)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[85, 100]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="SpO2" stroke="#0d9488" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Temperature (°C)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} />
              <YAxis domain={[35, 41]} tick={{ fontSize: 10 }} />
              <Tooltip />
              <Line type="monotone" dataKey="Temperature" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Vitals table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <h3 className="text-sm font-semibold text-gray-700">Vitals History</h3>
        </div>
        {vitals.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No vitals recorded yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date / Time</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">BP</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">HR</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Temp</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">SpO2</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">RR</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Wt (kg)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {vitals.map((v, i) => (
                  <tr key={v.id} className={`hover:bg-gray-50 ${i === 0 ? 'bg-primary-50/30' : ''}`}>
                    <td className="px-4 py-3 text-gray-600">{format(new Date(v.recordedAt), 'MMM d, yyyy h:mm a')}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={v.systolicBP && v.systolicBP >= 140 ? 'text-red-600' : 'text-gray-800'}>
                        {v.systolicBP ?? '—'}/{v.diastolicBP ?? '—'} {getFlag('SystolicBP', v.systolicBP)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={v.heartRate && (v.heartRate > 100 || v.heartRate < 60) ? 'text-orange-600' : 'text-gray-800'}>
                        {v.heartRate ?? '—'} {getFlag('HeartRate', v.heartRate)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{v.temperature ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-medium">
                      <span className={v.spO2 && v.spO2 < 95 ? 'text-red-600' : 'text-gray-800'}>
                        {v.spO2 ? `${v.spO2}%` : '—'} {getFlag('SpO2', v.spO2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">{v.respiratoryRate ?? '—'}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{v.weight ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {latest?.chiefComplaint && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">Chief Complaint (Latest Visit)</p>
          <p className="text-sm text-amber-700">{latest.chiefComplaint}</p>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Record Vitals</h2>
              <button onClick={() => { setShowModal(false); setError(''); setForm(EMPTY); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Systolic BP (mmHg)</label>
                  <input type="number" value={form.systolicBP} onChange={e => set('systolicBP', e.target.value)} placeholder="120" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Diastolic BP (mmHg)</label>
                  <input type="number" value={form.diastolicBP} onChange={e => set('diastolicBP', e.target.value)} placeholder="80" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Heart Rate (bpm)</label>
                  <input type="number" value={form.heartRate} onChange={e => set('heartRate', e.target.value)} placeholder="72" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Temperature (°C)</label>
                  <input type="number" step="0.1" value={form.temperature} onChange={e => set('temperature', e.target.value)} placeholder="37.0" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">SpO2 (%)</label>
                  <input type="number" value={form.spO2} onChange={e => set('spO2', e.target.value)} placeholder="98" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Resp. Rate (/min)</label>
                  <input type="number" value={form.respiratoryRate} onChange={e => set('respiratoryRate', e.target.value)} placeholder="16" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" value={form.weight} onChange={e => set('weight', e.target.value)} placeholder="70" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Height (cm)</label>
                  <input type="number" value={form.height} onChange={e => set('height', e.target.value)} placeholder="170" className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Chief Complaint</label>
                <textarea value={form.chiefComplaint} onChange={e => set('chiefComplaint', e.target.value)} rows={2} placeholder="Patient's chief complaint..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => { setShowModal(false); setError(''); setForm(EMPTY); }} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all">
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Save Vitals'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
