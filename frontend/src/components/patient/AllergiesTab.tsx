import { useState, useEffect, useRef } from 'react';
import { Allergy, AllergenMaster } from '../../types';
import { AlertTriangle, Pill, Leaf, Apple, Plus, X, Loader2, Trash2, ChevronDown, Search } from 'lucide-react';
import api from '../../lib/api';

interface Props {
  allergies: Allergy[];
  patientId: string;
  onRefresh: () => void;
}

const severityConfig: Record<string, string> = {
  mild:     'bg-yellow-100 text-yellow-700 border-yellow-200',
  moderate: 'bg-orange-100 text-orange-700 border-orange-200',
  severe:   'bg-red-100 text-red-700 border-red-200',
};

const typeIcon = { drug: Pill, environmental: Leaf, food: Apple };

const EMPTY = { allergen: '', type: 'drug', severity: 'mild', reaction: '' };

// ─── AllergenSelect ───────────────────────────────────────────────────────────

function AllergenSelect({
  value,
  type,
  onChange,
}: {
  value: string;
  type: string;
  onChange: (v: string) => void;
}) {
  const [options, setOptions] = useState<AllergenMaster[]>([]);
  const [filtered, setFiltered] = useState<AllergenMaster[]>([]);
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch active allergens once
  useEffect(() => {
    api.get<AllergenMaster[]>('/admin/allergens/active')
      .then(r => setOptions(r.data))
      .catch(() => {});
  }, []);

  // Filter by selected type and search query
  useEffect(() => {
    const byType = options.filter(o => o.category === type);
    const q = query.trim().toLowerCase();
    setFiltered(q ? byType.filter(o => o.name.toLowerCase().includes(q)) : byType);
  }, [options, type, query]);

  // When type changes clear selection
  useEffect(() => {
    setQuery('');
    onChange('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (name: string) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <div
        className={`flex items-center border rounded-lg px-3 py-2 bg-white cursor-text transition-all ${open ? 'border-primary-500 ring-2 ring-primary-500/20' : 'border-gray-200 hover:border-gray-300'}`}
        onClick={() => setOpen(true)}
      >
        <Search size={13} className="text-gray-400 flex-shrink-0 mr-2" />
        <input
          className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          placeholder="Search allergen…"
          value={query}
          onChange={e => { setQuery(e.target.value); onChange(''); setOpen(true); }}
          onFocus={() => setOpen(true)}
        />
        <ChevronDown size={14} className={`text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </div>

      {open && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {filtered.length === 0 ? (
            <p className="text-xs text-gray-400 px-3 py-4 text-center">
              {options.filter(o => o.category === type).length === 0
                ? `No ${type} allergens configured — add them in Admin → Allergens`
                : 'No matches. Type a custom name or adjust the search.'}
            </p>
          ) : (
            filtered.map(o => (
              <button
                key={o.id}
                type="button"
                onClick={() => select(o.name)}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-primary-50 hover:text-primary-700 transition-colors"
              >
                {o.name}
              </button>
            ))
          )}
          {/* Allow free-text entry */}
          {query.trim() && !filtered.find(o => o.name.toLowerCase() === query.trim().toLowerCase()) && (
            <button
              type="button"
              onClick={() => { onChange(query.trim()); setOpen(false); }}
              className="w-full text-left px-3 py-2 text-sm text-primary-600 font-medium border-t border-gray-100 hover:bg-primary-50 transition-colors"
            >
              Use "{query.trim()}" as custom allergen
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AllergiesTab ─────────────────────────────────────────────────────────────

export default function AllergiesTab({ allergies, patientId, onRefresh }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const severe = allergies.filter((a) => a.severity === 'severe');

  const set = (k: keyof typeof EMPTY, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const closeModal = () => { setShowModal(false); setError(''); setForm(EMPTY); };

  const handleSave = async () => {
    if (!form.allergen.trim()) { setError('Please select or enter an allergen.'); return; }
    setError('');
    setSaving(true);
    try {
      await api.post(`/patients/${patientId}/allergies`, form);
      closeModal();
      onRefresh();
    } catch {
      setError('Failed to save allergy. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (allergyId: string) => {
    if (!confirm('Remove this allergy record?')) return;
    setDeletingId(allergyId);
    try {
      await api.delete(`/patients/${patientId}/allergies/${allergyId}`);
      onRefresh();
    } catch {
      // silent
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg shadow-sm transition-all"
        >
          <Plus size={16} /> Add Allergy
        </button>
      </div>

      {severe.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm font-bold text-red-700">⚠️ Severe Allergies — Life-threatening risk</span>
          </div>
          {severe.map((a) => (
            <p key={a.id} className="text-sm text-red-600 mt-1">• <strong>{a.allergen}</strong> ({a.type}): {a.reaction}</p>
          ))}
        </div>
      )}

      {allergies.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
          <p className="text-gray-400">NKDA — No Known Drug Allergies</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {allergies.map((a) => {
            const Icon = typeIcon[a.type as keyof typeof typeIcon] ?? Pill;
            return (
              <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-4 ${a.severity === 'severe' ? 'border-red-200' : 'border-gray-100'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${a.severity === 'severe' ? 'bg-red-100' : 'bg-orange-50'}`}>
                      <Icon size={18} className={a.severity === 'severe' ? 'text-red-500' : 'text-orange-500'} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{a.allergen}</p>
                      <p className="text-xs text-gray-500 capitalize mt-0.5">{a.type} allergy</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize flex-shrink-0 ${severityConfig[a.severity] ?? 'bg-gray-100 text-gray-600'}`}>
                      {a.severity}
                    </span>
                    <button
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove allergy"
                    >
                      {deletingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </div>
                </div>
                {a.reaction && (
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-500"><span className="font-medium text-gray-600">Reaction: </span>{a.reaction}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add Allergy Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">Add Allergy</h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select
                    value={form.type}
                    onChange={e => set('type', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="drug">Drug</option>
                    <option value="food">Food</option>
                    <option value="environmental">Environmental</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Severity</label>
                  <select
                    value={form.severity}
                    onChange={e => set('severity', e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="mild">Mild</option>
                    <option value="moderate">Moderate</option>
                    <option value="severe">Severe</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Allergen <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">— filtered by type selected above</span>
                </label>
                <AllergenSelect
                  value={form.allergen}
                  type={form.type}
                  onChange={v => set('allergen', v)}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Reaction / Symptoms</label>
                <textarea
                  value={form.reaction}
                  onChange={e => set('reaction', e.target.value)}
                  rows={2}
                  placeholder="Describe the allergic reaction..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-all"
              >
                {saving ? <><Loader2 size={14} className="animate-spin" /> Saving...</> : 'Add Allergy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
