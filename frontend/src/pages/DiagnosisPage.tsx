import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Brain, Plus, X, Loader2, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle, ArrowRight, Search, Zap } from 'lucide-react';
import api from '../lib/api';
import { Patient, SymptomInput, DiagnosisResult, AnalysisResponse } from '../types';

const COMMON_SYMPTOMS = [
  'Chest pain', 'Shortness of breath', 'Fever', 'Headache', 'Fatigue', 'Nausea', 'Vomiting',
  'Abdominal pain', 'Cough', 'Dizziness', 'Leg swelling', 'Back pain', 'Palpitations',
  'Loss of appetite', 'Night sweats', 'Weight loss', 'Confusion', 'Weakness', 'Joint pain', 'Rash',
];

const urgencyConfig = {
  emergency: { color: 'bg-red-600', text: 'text-white', label: '🚨 EMERGENCY' },
  urgent: { color: 'bg-orange-100', text: 'text-orange-700', label: '⚡ Urgent' },
  routine: { color: 'bg-green-100', text: 'text-green-700', label: '✓ Routine' },
};

const severityColors: Record<string, string> = {
  critical: 'text-red-600',
  severe: 'text-orange-600',
  moderate: 'text-yellow-600',
  mild: 'text-green-600',
};

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? 'bg-green-500' : pct >= 60 ? 'bg-yellow-500' : 'bg-gray-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-gray-700 w-12 text-right">{pct}%</span>
    </div>
  );
}

function DiagnosisCard({ diagnosis, index, onAction }: {
  diagnosis: DiagnosisResult;
  index: number;
  onAction: (name: string, action: 'confirmed' | 'rejected') => void;
}) {
  const [expanded, setExpanded] = useState(index === 0);
  const [savedStatus, setSavedStatus] = useState<'confirmed' | 'rejected' | null>(null);
  const urgency = urgencyConfig[diagnosis.urgency] ?? urgencyConfig.routine;

  const handleAction = (action: 'confirmed' | 'rejected') => {
    setSavedStatus(action);
    onAction(diagnosis.name, action);
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${savedStatus === 'confirmed' ? 'border-green-300 bg-green-50/30' : savedStatus === 'rejected' ? 'border-gray-200 opacity-60' : 'border-gray-100 hover:border-primary-200'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {index + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-semibold text-gray-900">{diagnosis.name}</h3>
                <span className="text-xs text-gray-400 font-mono">{diagnosis.icdCode}</span>
                {diagnosis.severity && <span className={`text-xs font-semibold capitalize ${severityColors[diagnosis.severity] ?? 'text-gray-600'}`}>{diagnosis.severity}</span>}
              </div>
              <ConfidenceBar value={diagnosis.confidence} />
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${urgency.color} ${urgency.text}`}>{urgency.label}</span>
            <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
              {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Clinical Reasoning</p>
              <p className="text-sm text-gray-700">{diagnosis.reasoning}</p>
            </div>
            {diagnosis.supportingEvidence.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Supporting Evidence</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosis.supportingEvidence.map((e, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2 py-1 rounded-lg">{e}</span>
                  ))}
                </div>
              </div>
            )}
            {diagnosis.recommendedTests.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Recommended Tests</p>
                <div className="flex flex-wrap gap-2">
                  {diagnosis.recommendedTests.map((t, i) => (
                    <span key={i} className="text-xs bg-purple-50 text-purple-700 border border-purple-100 px-2 py-1 rounded-lg">{t}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        {!savedStatus ? (
          <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
            <button onClick={() => handleAction('confirmed')} className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all">
              <CheckCircle size={14} /> Confirm
            </button>
            <button onClick={() => handleAction('rejected')} className="flex items-center gap-1.5 bg-white hover:bg-gray-50 text-gray-600 border border-gray-200 text-sm font-medium px-4 py-2 rounded-lg transition-all">
              <XCircle size={14} /> Reject
            </button>
          </div>
        ) : (
          <div className={`flex items-center gap-2 mt-4 pt-4 border-t ${savedStatus === 'confirmed' ? 'border-green-100' : 'border-gray-50'}`}>
            {savedStatus === 'confirmed'
              ? <p className="text-sm text-green-600 font-semibold flex items-center gap-1"><CheckCircle size={14} /> Confirmed</p>
              : <p className="text-sm text-gray-400 flex items-center gap-1"><XCircle size={14} /> Rejected</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default function DiagnosisPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialPatientId = searchParams.get('patientId') ?? '';

  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [symptoms, setSymptoms] = useState<SymptomInput[]>([]);
  const [symptomInput, setSymptomInput] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actions, setActions] = useState<Record<string, 'confirmed' | 'rejected'>>({});
  const [showPatientSearch, setShowPatientSearch] = useState(!initialPatientId);

  // Load patient from URL param
  useEffect(() => {
    if (initialPatientId) {
      api.get<Patient>(`/patients/${initialPatientId}`).then((res) => {
        setSelectedPatient(res.data);
        setShowPatientSearch(false);
      }).catch(console.error);
    }
  }, [initialPatientId]);

  // Patient search
  useEffect(() => {
    if (!patientSearch.trim()) { setPatients([]); return; }
    const t = setTimeout(() => {
      api.get<{ patients: Patient[] }>(`/patients?q=${encodeURIComponent(patientSearch)}&limit=5`)
        .then((res) => setPatients(res.data.patients));
    }, 300);
    return () => clearTimeout(t);
  }, [patientSearch]);

  const addSymptom = (name: string) => {
    if (symptoms.find((s) => s.name === name)) return;
    setSymptoms((prev) => [...prev, { name, severity: 'moderate', duration: '1-3 days' }]);
  };

  const updateSymptom = (index: number, field: keyof SymptomInput, value: string) => {
    setSymptoms((prev) => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSymptom = (index: number) => setSymptoms((prev) => prev.filter((_, i) => i !== index));

  const analyze = async () => {
    if (!selectedPatient || symptoms.length === 0) return;
    setLoading(true);
    setAnalysis(null);
    setActions({});
    try {
      const res = await api.post<{ analysis: AnalysisResponse }>('/diagnosis/analyze', {
        patientId: selectedPatient.id,
        symptoms,
      });
      setAnalysis(res.data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const saveResults = async () => {
    if (!analysis || !selectedPatient) return;
    setSaving(true);
    try {
      const toSave = analysis.diagnoses
        .filter((d) => actions[d.name] !== 'rejected')
        .map((d) => ({
          name: d.name,
          icdCode: d.icdCode,
          confidence: d.confidence,
          severity: d.severity,
          status: actions[d.name] ?? 'pending',
          reasoning: d.reasoning,
          evidence: d.supportingEvidence,
        }));
      await api.post('/diagnosis/save', {
        patientId: selectedPatient.id,
        diagnoses: toSave,
        symptoms,
        clinicalNotes: analysis.clinicalNotes,
        redFlags: analysis.redFlags,
      });
      navigate(`/patients/${selectedPatient.id}`, { state: { activeTab: 'Diagnosis History' } });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
            <Brain size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">AI Diagnosis Assistant</h1>
            <p className="text-gray-500 text-sm">Powered by Groq — Enter symptoms to get differential diagnosis</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left panel: Patient + Symptoms */}
        <div className="lg:col-span-2 space-y-4">
          {/* Patient selector */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Patient</h2>
            {selectedPatient && !showPatientSearch ? (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold flex-shrink-0">
                  {selectedPatient.firstName[0]}{selectedPatient.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{selectedPatient.firstName} {selectedPatient.lastName}</p>
                  <p className="text-xs text-gray-400">{selectedPatient.mrn} · {selectedPatient.gender}</p>
                </div>
                <button onClick={() => { setSelectedPatient(null); setShowPatientSearch(true); setAnalysis(null); }} className="text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                {patients.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                    {patients.map((p) => (
                      <button key={p.id} onClick={() => { setSelectedPatient(p); setPatientSearch(''); setPatients([]); setShowPatientSearch(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-50 text-left text-sm">
                        <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-bold">{p.firstName[0]}{p.lastName[0]}</div>
                        <div><p className="font-medium text-gray-800">{p.firstName} {p.lastName}</p><p className="text-xs text-gray-400">{p.mrn}</p></div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Patient context pills */}
            {selectedPatient && (
              <div className="mt-3 space-y-2">
                {selectedPatient.medications?.filter(m => m.status === 'active').slice(0, 3).map(m => (
                  <div key={m.id} className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />
                    {m.name} {m.dosage}
                  </div>
                ))}
                {selectedPatient.allergies?.slice(0, 2).map(a => (
                  <div key={a.id} className="flex items-center gap-2 text-xs text-red-500">
                    <AlertTriangle size={10} />
                    Allergy: {a.allergen}
                  </div>
                ))}
                <button onClick={() => navigate(`/patients/${selectedPatient.id}`)} className="text-xs text-primary-600 hover:underline flex items-center gap-1 mt-1">
                  View full profile <ArrowRight size={10} />
                </button>
              </div>
            )}
          </div>

          {/* Symptom input */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Symptoms</h2>

            {/* Quick select */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {COMMON_SYMPTOMS.slice(0, 12).map((s) => (
                <button key={s} onClick={() => addSymptom(s)}
                  disabled={!!symptoms.find((x) => x.name === s)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-all ${symptoms.find(x => x.name === s) ? 'bg-primary-100 text-primary-700 border-primary-200' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-primary-300 hover:text-primary-600'}`}>
                  {s}
                </button>
              ))}
            </div>

            {/* Custom input */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add custom symptom..."
                value={symptomInput}
                onChange={(e) => setSymptomInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && symptomInput.trim()) { addSymptom(symptomInput.trim()); setSymptomInput(''); } }}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button onClick={() => { if (symptomInput.trim()) { addSymptom(symptomInput.trim()); setSymptomInput(''); } }}
                className="bg-primary-600 text-white px-3 py-2 rounded-lg hover:bg-primary-700 transition-all">
                <Plus size={16} />
              </button>
            </div>

            {/* Selected symptoms */}
            {symptoms.length > 0 && (
              <div className="mt-3 space-y-2">
                {symptoms.map((s, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">{s.name}</span>
                      <button onClick={() => removeSymptom(i)} className="text-gray-400 hover:text-red-500"><X size={12} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={s.severity} onChange={(e) => updateSymptom(i, 'severity', e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white">
                        <option value="mild">Mild</option>
                        <option value="moderate">Moderate</option>
                        <option value="severe">Severe</option>
                      </select>
                      <select value={s.duration} onChange={(e) => updateSymptom(i, 'duration', e.target.value)}
                        className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white">
                        <option value="&lt;1 hour">&lt;1 hour</option>
                        <option value="1-6 hours">1-6 hours</option>
                        <option value="6-24 hours">6-24 hours</option>
                        <option value="1-3 days">1-3 days</option>
                        <option value="3-7 days">3-7 days</option>
                        <option value="1-2 weeks">1-2 weeks</option>
                        <option value="2-4 weeks">2-4 weeks</option>
                        <option value="&gt;1 month">&gt;1 month</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Analyze button */}
          <button
            onClick={analyze}
            disabled={!selectedPatient || symptoms.length === 0 || loading}
            className="w-full flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl shadow-sm transition-all"
          >
            {loading ? <><Loader2 size={18} className="animate-spin" /> Analyzing with AI...</>
              : <><Zap size={18} /> Analyze with Groq AI</>}
          </button>
        </div>

        {/* Right panel: Results */}
        <div className="lg:col-span-3">
          {!analysis && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20 text-gray-400">
              <Brain size={48} className="mb-4 text-gray-200" />
              <p className="text-lg font-medium text-gray-500">Ready for Analysis</p>
              <p className="text-sm mt-1">Select a patient, add symptoms, and click Analyze</p>
            </div>
          )}

          {loading && (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <div className="w-16 h-16 rounded-full bg-primary-50 flex items-center justify-center mb-4">
                <Brain size={32} className="text-primary-500 animate-pulse" />
              </div>
              <p className="text-lg font-medium text-gray-700">Groq is analyzing...</p>
              <p className="text-sm text-gray-400 mt-1">Reviewing patient history, medications, vitals & symptoms</p>
            </div>
          )}

          {analysis && !loading && (
            <div className="space-y-4">
              {/* Red flags */}
              {analysis.redFlags.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={16} className="text-red-500" />
                    <span className="text-sm font-bold text-red-700">Clinical Red Flags</span>
                  </div>
                  {analysis.redFlags.map((f, i) => <p key={i} className="text-sm text-red-600">• {f}</p>)}
                </div>
              )}

              {/* Clinical notes */}
              {analysis.clinicalNotes && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 uppercase mb-1">Clinical Notes</p>
                  <p className="text-sm text-blue-700">{analysis.clinicalNotes}</p>
                </div>
              )}

              {/* Diagnoses */}
              <div className="space-y-3">
                {analysis.diagnoses.map((d, i) => (
                  <DiagnosisCard key={d.name} diagnosis={d} index={i} onAction={(name, action) => setActions(prev => ({ ...prev, [name]: action }))} />
                ))}
              </div>

              {/* Save */}
              {Object.keys(actions).length > 0 && (
                <button onClick={saveResults} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-sm transition-all">
                  {saving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                  Save Results to Patient Chart
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
