export type UserRole = 'DOCTOR' | 'NURSE' | 'ADMIN' | 'STAFF' | 'PATIENT';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  specialty?: string;
  patientProfileId?: string;
  createdAt?: string;
  updatedAt?: string;
  _count?: { encounters: number };
}

export interface Patient {
  id: string;
  mrn: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  phone?: string;
  email?: string;
  address?: string;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRel?: string;
  createdAt: string;
  updatedAt: string;
  allergies?: Allergy[];
  medications?: Medication[];
  vitals?: Vital[];
  labResults?: LabResult[];
  encounters?: Encounter[];
  diagnoses?: Diagnosis[];
  riskScores?: RiskScore[];
  alerts?: Alert[];
  _count?: { alerts: number; encounters: number };
}

export interface Allergy {
  id: string;
  patientId: string;
  allergen: string;
  type: string;
  severity: string;
  reaction?: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  purpose?: string;
  prescribedBy?: string;
  startDate?: string;
  endDate?: string;
  status: string;
  createdAt: string;
}

export interface Vital {
  id: string;
  patientId: string;
  systolicBP?: number;
  diastolicBP?: number;
  heartRate?: number;
  temperature?: number;
  spO2?: number;
  respiratoryRate?: number;
  weight?: number;
  height?: number;
  recordedAt: string;
  recordedBy?: string;
  chiefComplaint?: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  resultDate: string;
  orderedBy?: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  doctorId: string;
  doctor?: { id: string; firstName: string; lastName: string; specialty?: string };
  chiefComplaint?: string;
  status: string;
  startedAt: string;
  endedAt?: string;
  soapNotes?: string;
  diagnoses?: Diagnosis[];
}

export interface Diagnosis {
  id: string;
  patientId: string;
  encounterId?: string;
  sessionId?: string;
  icdCode?: string;
  name: string;
  confidence?: number;
  severity?: string;
  status: string;
  reasoning?: string;
  evidence?: string;
  createdAt: string;
}

export interface AllergenMaster {
  id: string;
  name: string;
  category: string; // drug | food | environmental
  isActive: boolean;
  createdAt: string;
}

export interface DiagnosisSession {
  id: string;
  patientId: string;
  symptoms: string;       // JSON string
  clinicalNotes?: string;
  redFlags?: string;      // JSON string
  createdAt: string;
  diagnoses: Diagnosis[];
}

export interface RiskScore {
  id: string;
  patientId: string;
  type: string;
  score: number;
  level: string;
  factors?: string;
  calculatedAt: string;
}

export interface Alert {
  id: string;
  patientId?: string;
  patient?: { id: string; firstName: string; lastName: string; mrn: string };
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  status: string;
  assignedTo?: string;
  acknowledgedAt?: string;
  escalatedAt?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface DrugInteraction {
  id: string;
  drug1: string;
  drug2: string;
  severity: string;
  description: string;
  mechanism?: string;
  alternatives?: string;
}

export interface AppointmentDoctor {
  id: string;
  firstName: string;
  lastName: string;
  specialty?: string;
  role: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  patient: { id: string; firstName: string; lastName: string; mrn: string; dateOfBirth: string; phone?: string };
  doctorId: string;
  doctor: AppointmentDoctor;
  createdById: string;
  createdBy: { id: string; firstName: string; lastName: string; role: string };
  title: string;
  type: string;
  status: string;
  scheduledAt: string;
  duration: number;
  department?: string;
  room?: string;
  notes?: string;
  completionNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimeSlot {
  time: string;
  available: boolean;
}

export interface AppointmentStats {
  todayTotal: number;
  scheduled: number;
  inProgress: number;
  completed: number;
}

export interface SymptomInput {
  name: string;
  severity: 'mild' | 'moderate' | 'severe';
  duration: string;
}

export interface DiagnosisResult {
  name: string;
  icdCode: string;
  confidence: number;
  severity: string;
  reasoning: string;
  supportingEvidence: string[];
  recommendedTests: string[];
  urgency: 'routine' | 'urgent' | 'emergency';
}

export interface AnalysisResponse {
  diagnoses: DiagnosisResult[];
  clinicalNotes: string;
  redFlags: string[];
}
