import { useState, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, TrendingUp, XCircle, Filter, RefreshCw, AlertTriangle, Clock, User, Loader2 } from 'lucide-react';
import api from '../lib/api';
import { Alert } from '../types';
import { format, formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';

const severityConfig: Record<string, { bg: string; border: string; badge: string; dot: string }> = {
  critical: { bg: 'bg-red-50', border: 'border-l-red-500', badge: 'bg-red-100 text-red-700 border-red-200', dot: 'bg-red-500' },
  high: { bg: 'bg-orange-50', border: 'border-l-orange-400', badge: 'bg-orange-100 text-orange-700 border-orange-200', dot: 'bg-orange-500' },
  medium: { bg: 'bg-yellow-50', border: 'border-l-yellow-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-200', dot: 'bg-yellow-500' },
  low: { bg: 'bg-blue-50', border: 'border-l-blue-400', badge: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-400' },
};

const statusConfig: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  acknowledged: 'bg-gray-100 text-gray-600',
  escalated: 'bg-red-100 text-red-700',
  resolved: 'bg-slate-100 text-slate-500',
};

const typeIcons: Record<string, string> = {
  vitals: '💓', lab: '🔬', drug_interaction: '💊', sepsis: '🦠', guideline: '📋',
};

function AlertCard({ alert, onAction }: { alert: Alert; onAction: () => void }) {
  const cfg = severityConfig[alert.severity] ?? severityConfig.low;
  const [acting, setActing] = useState(false);
  const navigate = useNavigate();

  const act = async (endpoint: string) => {
    setActing(true);
    try { await api.patch(`/alerts/${alert.id}/${endpoint}`); onAction(); }
    finally { setActing(false); }
  };

  return (
    <div className={`bg-white rounded-xl border border-l-4 ${cfg.border} shadow-sm overflow-hidden ${alert.status === 'resolved' ? 'opacity-60' : ''}`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot} ${alert.status === 'active' ? 'animate-pulse' : ''}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-base">{typeIcons[alert.type] ?? '⚠️'}</span>
                  <h3 className="font-semibold text-gray-900 text-sm">{alert.title}</h3>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{alert.message}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full border capitalize ${cfg.badge}`}>{alert.severity}</span>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusConfig[alert.status] ?? statusConfig.active}`}>{alert.status}</span>
              </div>
            </div>

            <div className="flex items-center gap-4 mt-2 text-xs text-gray-400 flex-wrap">
              {alert.patient && (
                <button onClick={() => navigate(`/patients/${alert.patient!.id}`)} className="flex items-center gap-1 hover:text-primary-600 transition-colors">
                  <User size={11} />{alert.patient.firstName} {alert.patient.lastName} ({alert.patient.mrn})
                </button>
              )}
              <div className="flex items-center gap-1">
                <Clock size={11} />{formatDistanceToNow(new Date(alert.createdAt), { addSuffix: true })}
              </div>
              <span>{format(new Date(alert.createdAt), 'MMM d, h:mm a')}</span>
            </div>

            {/* Actions */}
            {alert.status !== 'resolved' && (
              <div className="flex items-center gap-2 mt-3">
                {acting && <Loader2 size={14} className="animate-spin text-gray-400" />}
                {alert.status === 'active' && (
                  <>
                    <button onClick={() => act('acknowledge')} disabled={acting}
                      className="flex items-center gap-1.5 text-xs bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all">
                      <CheckCheck size={12} /> Acknowledge
                    </button>
                    <button onClick={() => act('escalate')} disabled={acting}
                      className="flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 rounded-lg font-medium transition-all">
                      <TrendingUp size={12} /> Escalate
                    </button>
                  </>
                )}
                {(alert.status === 'acknowledged' || alert.status === 'escalated') && (
                  <button onClick={() => act('resolve')} disabled={acting}
                    className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-all">
                    <XCircle size={12} /> Resolve
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [stats, setStats] = useState({ total: 0, active: 0, critical: 0, high: 0 });

  const fetchAlerts = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterSeverity) params.set('severity', filterSeverity);
    Promise.all([
      api.get<Alert[]>(`/alerts?${params}`),
      api.get<typeof stats>('/alerts/stats'),
    ])
      .then(([a, s]) => { setAlerts(a.data); setStats(s.data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filterStatus, filterSeverity]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // WebSocket for real-time updates
  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const ws = new WebSocket(`${proto}://${window.location.host}/ws`);
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.type === 'alert') fetchAlerts();
    };
    return () => ws.close();
  }, [fetchAlerts]);

  const active = alerts.filter((a) => a.status !== 'resolved');
  const resolved = alerts.filter((a) => a.status === 'resolved');

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={24} className="text-orange-500" /> Alert Center
          </h1>
          <p className="text-gray-500 text-sm mt-1">Real-time clinical alerts and notifications</p>
        </div>
        <button onClick={fetchAlerts} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 bg-white border border-gray-200 px-3 py-2 rounded-lg transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Alerts', value: stats.total, color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200' },
          { label: 'Active', value: stats.active, color: 'text-green-600', bg: 'bg-green-50 border-green-200' },
          { label: 'Critical', value: stats.critical, color: 'text-red-600', bg: 'bg-red-50 border-red-200' },
          { label: 'High Priority', value: stats.high, color: 'text-orange-600', bg: 'bg-orange-50 border-orange-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Filter size={14} /> Filter:
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="acknowledged">Acknowledged</option>
          <option value="escalated">Escalated</option>
          <option value="resolved">Resolved</option>
        </select>
        <select value={filterSeverity} onChange={(e) => setFilterSeverity(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500">
          <option value="">All Severities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        {(filterStatus || filterSeverity) && (
          <button onClick={() => { setFilterStatus(''); setFilterSeverity(''); }} className="text-xs text-red-500 hover:text-red-700">
            Clear filters
          </button>
        )}
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-primary-500" /></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-100 shadow-sm">
          <Bell size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No alerts found</p>
          <p className="text-gray-400 text-sm mt-1">All clear — no alerts match your filters</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active first */}
          {active.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-orange-500" />
                <h2 className="text-sm font-semibold text-gray-700">Active ({active.length})</h2>
              </div>
              <div className="space-y-3">
                {active.map((a) => <AlertCard key={a.id} alert={a} onAction={fetchAlerts} />)}
              </div>
            </div>
          )}

          {/* Resolved */}
          {resolved.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 mt-4">
                <XCircle size={14} className="text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-500">Resolved ({resolved.length})</h2>
              </div>
              <div className="space-y-3">
                {resolved.map((a) => <AlertCard key={a.id} alert={a} onAction={fetchAlerts} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
