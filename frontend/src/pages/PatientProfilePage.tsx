import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Brain, Phone, Mail, MapPin, User, Droplets, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { Patient } from '../types';
import { format, differenceInYears } from 'date-fns';
import OverviewTab from '../components/patient/OverviewTab';
import VitalsTab from '../components/patient/VitalsTab';
import LabsTab from '../components/patient/LabsTab';
import MedicationsTab from '../components/patient/MedicationsTab';
import AllergiesTab from '../components/patient/AllergiesTab';
import EncountersTab from '../components/patient/EncountersTab';
import DiagnosisHistoryTab from '../components/patient/DiagnosisHistoryTab';

const TABS = ['Overview', 'Vitals', 'Labs', 'Medications', 'Allergies', 'Encounters', 'Diagnosis History'];

export default function PatientProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const locationState = location.state as { registered?: boolean; activeTab?: string } | null;
  const justRegistered = locationState?.registered === true;
  const initialTab = locationState?.activeTab;
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(initialTab ?? 'Overview');

  const fetchPatient = () => {
    if (!id) return;
    api.get<Patient>(`/patients/${id}`)
      .then((res) => setPatient(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchPatient(); }, [id]);

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <Loader2 size={32} className="animate-spin text-primary-500" />
    </div>
  );

  if (!patient) return (
    <div className="flex h-full items-center justify-center text-gray-400">Patient not found</div>
  );

  const age = differenceInYears(new Date(), new Date(patient.dateOfBirth));
  const activeAlerts = patient.alerts?.filter((a) => a.status === 'active' || a.status === 'escalated').length ?? 0;
  const severeAllergies = patient.allergies?.filter((a) => a.severity === 'severe') ?? [];

  const tabCounts: Record<string, number> = {
    Vitals: patient.vitals?.length ?? 0,
    Labs: patient.labResults?.length ?? 0,
    Medications: patient.medications?.length ?? 0,
    Allergies: patient.allergies?.length ?? 0,
    Encounters: patient.encounters?.length ?? 0,
  };

  return (
    <div className="min-h-full bg-gray-50">
      {justRegistered && (
        <div className="flex items-center gap-2 bg-green-50 border-b border-green-200 text-green-800 px-6 py-3 text-sm">
          <CheckCircle size={16} className="text-green-600 flex-shrink-0" />
          <span>Patient <strong>{patient.firstName} {patient.lastName}</strong> registered successfully. MRN assigned: <strong>{patient.mrn}</strong></span>
        </div>
      )}
      {/* Header */}
      <div className="bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          {/* Back button */}
          <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors">
            <ArrowLeft size={16} /> Back to Patients
          </button>

          {/* Patient header */}
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-primary-100 flex items-center justify-center text-primary-700 text-2xl font-bold flex-shrink-0">
                {patient.firstName[0]}{patient.lastName[0]}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{patient.firstName} {patient.lastName}</h1>
                  <span className="text-sm bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">{patient.mrn}</span>
                  {activeAlerts > 0 && (
                    <span className="flex items-center gap-1 text-sm bg-red-100 text-red-600 px-2.5 py-1 rounded-full font-semibold border border-red-200">
                      <AlertTriangle size={12} /> {activeAlerts} Alert{activeAlerts > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <User size={14} />
                    <span>{patient.gender}, {age} years</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-gray-500">
                    <span>DOB: {format(new Date(patient.dateOfBirth), 'MMM d, yyyy')}</span>
                  </div>
                  {patient.bloodType && (
                    <div className="flex items-center gap-1.5 text-sm">
                      <Droplets size={14} className="text-red-400" />
                      <span className="font-semibold text-red-500">{patient.bloodType}</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                  {patient.phone && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Phone size={12} />{patient.phone}</div>}
                  {patient.email && <div className="flex items-center gap-1.5 text-xs text-gray-400"><Mail size={12} />{patient.email}</div>}
                  {patient.address && <div className="flex items-center gap-1.5 text-xs text-gray-400"><MapPin size={12} />{patient.address}</div>}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {severeAllergies.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                    <AlertTriangle size={12} /> Severe Allergies:
                  </p>
                  {severeAllergies.map((a) => (
                    <p key={a.id} className="text-xs text-red-600">{a.allergen}</p>
                  ))}
                </div>
              )}
              <button
                onClick={() => navigate(`/diagnosis?patientId=${patient.id}`)}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
              >
                <Brain size={16} /> Start AI Diagnosis
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-6 border-b border-gray-100 -mb-px overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab
                    ? 'border-primary-600 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-200'
                }`}
              >
                {tab}
                {tabCounts[tab] !== undefined && tabCounts[tab] > 0 && (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-500'}`}>
                    {tabCounts[tab]}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {activeTab === 'Overview' && <OverviewTab patient={patient} />}
        {activeTab === 'Vitals' && <VitalsTab vitals={patient.vitals ?? []} patientId={patient.id} onRefresh={fetchPatient} />}
        {activeTab === 'Labs' && <LabsTab labs={patient.labResults ?? []} patientId={patient.id} onRefresh={fetchPatient} />}
        {activeTab === 'Medications' && <MedicationsTab medications={patient.medications ?? []} patientId={patient.id} onRefresh={fetchPatient} />}
        {activeTab === 'Allergies' && <AllergiesTab allergies={patient.allergies ?? []} patientId={patient.id} onRefresh={fetchPatient} />}
        {activeTab === 'Encounters' && <EncountersTab encounters={patient.encounters ?? []} patientId={patient.id} onRefresh={fetchPatient} />}
        {activeTab === 'Diagnosis History' && <DiagnosisHistoryTab patientId={patient.id} />}
      </div>
    </div>
  );
}
