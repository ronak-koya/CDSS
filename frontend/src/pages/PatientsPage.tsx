import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, UserPlus, ChevronRight, Activity, AlertTriangle, Loader2, User } from 'lucide-react';
import api from '../lib/api';
import { Patient } from '../types';

function PatientCard({ patient, onClick }: { patient: Patient; onClick: () => void }) {
  const age = new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear();
  const latestVital = patient.vitals?.[0];
  const activeAlerts = patient.alerts?.filter((a) => a.status === 'active').length ?? 0;

  return (
    <button onClick={onClick} className="w-full bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:border-primary-200 hover:shadow-md transition-all text-left group">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-bold text-lg flex-shrink-0">
          {patient.firstName[0]}{patient.lastName[0]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{patient.firstName} {patient.lastName}</h3>
            {activeAlerts > 0 && (
              <span className="flex items-center gap-1 text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full border border-red-200">
                <AlertTriangle size={10} />{activeAlerts} alert{activeAlerts > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            <span className="text-xs text-gray-500">{patient.mrn}</span>
            <span className="text-gray-300">·</span>
            <span className="text-xs text-gray-500">{patient.gender}, {age} yrs</span>
            {patient.bloodType && <><span className="text-gray-300">·</span><span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{patient.bloodType}</span></>}
          </div>
        </div>

        {latestVital && (
          <div className="hidden md:flex items-center gap-4 text-right flex-shrink-0">
            {latestVital.systolicBP && (
              <div>
                <p className="text-xs text-gray-400">BP</p>
                <p className={`text-sm font-semibold ${latestVital.systolicBP > 140 ? 'text-red-600' : 'text-gray-700'}`}>
                  {latestVital.systolicBP}/{latestVital.diastolicBP}
                </p>
              </div>
            )}
            {latestVital.spO2 && (
              <div>
                <p className="text-xs text-gray-400">SpO2</p>
                <p className={`text-sm font-semibold ${latestVital.spO2 < 95 ? 'text-orange-600' : 'text-gray-700'}`}>
                  {latestVital.spO2}%
                </p>
              </div>
            )}
            {latestVital.heartRate && (
              <div>
                <p className="text-xs text-gray-400">HR</p>
                <p className="text-sm font-semibold text-gray-700">{latestVital.heartRate}</p>
              </div>
            )}
          </div>
        )}

        <ChevronRight size={16} className="text-gray-300 group-hover:text-primary-500 flex-shrink-0 transition-colors" />
      </div>

      {/* Medications count */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-gray-400" />
          <span className="text-xs text-gray-400">{patient.medications?.filter(m => m.status === 'active').length ?? 0} active medications</span>
        </div>
        <div className="flex items-center gap-1.5">
          <User size={12} className="text-gray-400" />
          <span className="text-xs text-gray-400">{patient._count?.encounters ?? patient.encounters?.length ?? 0} encounters</span>
        </div>
      </div>
    </button>
  );
}

export default function PatientsPage() {
  const [query, setQuery] = useState('');
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchPatients = (q = '') => {
    setLoading(true);
    api.get<{ patients: Patient[]; total: number }>(`/patients?q=${encodeURIComponent(q)}&limit=20`)
      .then((res) => { setPatients(res.data.patients); setTotal(res.data.total); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPatients(); }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPatients(val), 350);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Patients</h1>
          <p className="text-gray-500 text-sm mt-1">{total} patient{total !== 1 ? 's' : ''} in system</p>
        </div>
        <button
          onClick={() => navigate('/patients/new')}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm"
        >
          <UserPlus size={16} /> Register Patient
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search by name, MRN, email or phone..."
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm transition-all"
        />
        {loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />}
      </div>

      {/* Patient list */}
      {patients.length === 0 && !loading ? (
        <div className="text-center py-16">
          <User size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No patients found</p>
          <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((p) => (
            <PatientCard key={p.id} patient={p} onClick={() => navigate(`/patients/${p.id}`)} />
          ))}
        </div>
      )}
    </div>
  );
}
