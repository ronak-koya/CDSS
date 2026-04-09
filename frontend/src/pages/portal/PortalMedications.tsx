import { useEffect, useState } from 'react';
import { Pill } from 'lucide-react';
import api from '../../lib/api';

interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  route?: string;
  prescribedBy?: string;
  startDate?: string;
}

export default function PortalMedications() {
  const [meds, setMeds] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Medication[]>('/portal/medications')
      .then(r => setMeds(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Medications</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your current active prescriptions</p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : meds.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <Pill className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-gray-500 text-sm">No active medications</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {meds.map(med => (
            <div key={med.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Pill size={16} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{med.name}</p>
                  <p className="text-sm text-gray-600">{med.dosage} · {med.frequency}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                    {med.route && <span>Route: <span className="text-gray-700">{med.route}</span></span>}
                    {med.prescribedBy && <span>Prescribed by: <span className="text-gray-700">{med.prescribedBy}</span></span>}
                    {med.startDate && <span>Since: <span className="text-gray-700">{med.startDate}</span></span>}
                  </div>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
                  Active
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400">
        Contact your doctor before stopping or changing any medication.
      </p>
    </div>
  );
}
