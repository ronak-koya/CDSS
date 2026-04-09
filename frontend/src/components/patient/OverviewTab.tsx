import { Patient } from '../../types';
import { Heart, Thermometer, Activity, Wind, Scale, TrendingUp, AlertTriangle, Pill } from 'lucide-react';

function VitalCard({ label, value, unit, icon: Icon, status }: { label: string; value?: number | null; unit: string; icon: React.ElementType; status?: 'normal' | 'warning' | 'critical' }) {
  const colorMap = { normal: 'text-green-600', warning: 'text-orange-500', critical: 'text-red-600' };
  const bgMap = { normal: 'bg-green-50 border-green-100', warning: 'bg-orange-50 border-orange-100', critical: 'bg-red-50 border-red-100' };
  const color = status ? colorMap[status] : 'text-gray-700';
  const bg = status ? bgMap[status] : 'bg-gray-50 border-gray-100';
  return (
    <div className={`rounded-xl border p-4 ${bg}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className={color} />
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
      <p className="text-xs text-gray-400 mt-0.5">{unit}</p>
    </div>
  );
}

function RiskBar({ label, score, level }: { label: string; score: number; level: string }) {
  const colors: Record<string, string> = { low: 'bg-green-500', moderate: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-500' };
  const textColors: Record<string, string> = { low: 'text-green-600', moderate: 'text-yellow-600', high: 'text-orange-600', critical: 'text-red-600' };
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-gray-600 capitalize">{label} Risk</span>
        <span className={`text-sm font-semibold ${textColors[level] ?? 'text-gray-600'}`}>{score}% <span className="font-normal capitalize">({level})</span></span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${colors[level] ?? 'bg-gray-400'}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  );
}

export default function OverviewTab({ patient }: { patient: Patient }) {
  const latest = patient.vitals?.[0];
  const activeMeds = patient.medications?.filter((m) => m.status === 'active') ?? [];
  const activeAlerts = patient.alerts?.filter((a) => a.status === 'active' || a.status === 'escalated') ?? [];
  const confirmedDiagnoses = patient.diagnoses?.filter((d) => d.status === 'confirmed') ?? [];
  const riskScores = patient.riskScores ?? [];

  const getBPStatus = (s?: number | null) => s ? (s >= 180 ? 'critical' : s >= 140 ? 'warning' : 'normal') : undefined;
  const getSpO2Status = (v?: number | null) => v ? (v < 90 ? 'critical' : v < 95 ? 'warning' : 'normal') : undefined;
  const getHRStatus = (v?: number | null) => v ? (v > 120 || v < 50 ? 'critical' : v > 100 || v < 60 ? 'warning' : 'normal') : undefined;

  return (
    <div className="space-y-6">
      {/* Active Alerts banner */}
      {activeAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-red-700">{activeAlerts.length} Active Alert{activeAlerts.length > 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-1">
            {activeAlerts.slice(0, 3).map((a) => (
              <p key={a.id} className="text-sm text-red-600">• {a.title}</p>
            ))}
          </div>
        </div>
      )}

      {/* Latest vitals */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-3">Latest Vitals</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <VitalCard label="Blood Pressure" value={latest?.systolicBP} unit={`/${latest?.diastolicBP ?? '—'} mmHg`} icon={Heart} status={getBPStatus(latest?.systolicBP)} />
          <VitalCard label="Heart Rate" value={latest?.heartRate} unit="bpm" icon={Activity} status={getHRStatus(latest?.heartRate)} />
          <VitalCard label="Temperature" value={latest?.temperature} unit="°C" icon={Thermometer} />
          <VitalCard label="SpO2" value={latest?.spO2} unit="%" icon={Wind} status={getSpO2Status(latest?.spO2)} />
          <VitalCard label="Resp. Rate" value={latest?.respiratoryRate} unit="/min" icon={Wind} />
          <VitalCard label="Weight" value={latest?.weight} unit="kg" icon={Scale} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active diagnoses */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">Active Diagnoses</h3>
          {confirmedDiagnoses.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No confirmed diagnoses</p>
          ) : (
            <div className="space-y-3">
              {confirmedDiagnoses.slice(0, 4).map((d) => (
                <div key={d.id} className="flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary-500 mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{d.name}</p>
                    {d.icdCode && <p className="text-xs text-gray-400">{d.icdCode}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Risk scores */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={16} className="text-primary-600" />
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Risk Scores</h3>
          </div>
          {riskScores.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No risk scores calculated</p>
          ) : (
            riskScores.slice(0, 4).map((r) => <RiskBar key={r.id} label={r.type} score={r.score} level={r.level} />)
          )}
        </div>
      </div>

      {/* Active medications */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Pill size={16} className="text-primary-600" />
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Active Medications</h3>
          <span className="ml-auto text-xs bg-primary-50 text-primary-600 px-2 py-0.5 rounded-full">{activeMeds.length}</span>
        </div>
        {activeMeds.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No active medications</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeMeds.map((m) => (
              <div key={m.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <Pill size={14} className="text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{m.name}</p>
                  <p className="text-xs text-gray-500">{m.dosage} · {m.frequency}</p>
                  {m.route && <p className="text-xs text-gray-400">{m.route}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
