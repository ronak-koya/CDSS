import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import api from '../../lib/api';

interface LabResult {
  id: string;
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  flag?: string;
  resultDate: string;
}

const flagConfig: Record<string, { label: string; color: string }> = {
  normal:   { label: 'Normal',   color: 'bg-emerald-100 text-emerald-700' },
  low:      { label: 'Low',      color: 'bg-blue-100 text-blue-700' },
  high:     { label: 'High',     color: 'bg-amber-100 text-amber-700' },
  critical: { label: 'Critical', color: 'bg-red-100 text-red-700' },
};

export default function PortalResults() {
  const [results, setResults] = useState<LabResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<LabResult[]>('/portal/results')
      .then(r => setResults(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Results</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your laboratory test results</p>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : results.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <FlaskConical className="mx-auto text-gray-300 mb-2" size={32} />
          <p className="text-gray-500 text-sm">No lab results on file</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Test</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Result</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Normal Range</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {results.map(r => {
                const fc = flagConfig[r.flag ?? 'normal'] ?? flagConfig.normal;
                return (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{r.testName}</td>
                    <td className="px-4 py-3 text-gray-700">
                      {r.value}{r.unit && <span className="text-gray-400 ml-1">{r.unit}</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell text-xs">{r.referenceRange ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${fc.color}`}>
                        {fc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{r.resultDate}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400">
        These results are for your reference. Please discuss any concerns with your doctor.
      </p>
    </div>
  );
}
