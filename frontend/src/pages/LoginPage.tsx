import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, AlertCircle, Loader2, Brain, Bell, ShieldCheck, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const demoAccounts = [
  { role: 'Doctor',  email: 'dr.smith@cdss.com',           color: 'bg-blue-500' },
  { role: 'Nurse',   email: 'nurse.jones@cdss.com',        color: 'bg-emerald-500' },
  { role: 'Admin',   email: 'admin@cdss.com',              color: 'bg-violet-500' },
  { role: 'Patient', email: 'patient.johnson@cdss.com',    color: 'bg-orange-500' },
];

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Diagnostics',
    desc: 'Claude-driven differential diagnosis with evidence-based recommendations in seconds.',
  },
  {
    icon: Bell,
    title: 'Real-Time Clinical Alerts',
    desc: 'Instant notifications for critical lab values, drug interactions, and deteriorating patients.',
  },
  {
    icon: ShieldCheck,
    title: 'Evidence-Based Decisions',
    desc: 'Structured SOAP notes, risk stratification, and guideline-aligned care pathways.',
  },
];

// Waveform bar heights for the animated ECG-style graphic
const BARS = [3,6,4,8,5,12,5,8,4,6,3,5,8,4,10,6,3,7,5,9,4,6,3,8,5,11,5,7,4,6,3,5,8,4,10,6,3,7];

export default function LoginPage() {
  const [email, setEmail]     = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]   = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Login failed';
      setError((err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row font-sans">

      {/* ══════════════════════════════════════════════════════════════
          LEFT PANEL — Brand / Context
      ══════════════════════════════════════════════════════════════ */}
      <div className="relative lg:w-1/2 bg-[#0c1427] flex flex-col overflow-hidden">

        {/* ── Animated background ────────────────────────────────────── */}
        {/* Mesh dot grid */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle, #f97316 1px, transparent 1px)`,
            backgroundSize: '28px 28px',
          }}
        />

        {/* Pulse rings centred on logo area */}
        <div className="absolute top-[13%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <span className="absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary-500/30 animate-pulse-ring" />
          <span className="absolute inset-0 w-24 h-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary-500/20 animate-pulse-ring-slow" />
        </div>

        {/* Gradient glow blobs */}
        <div className="absolute -bottom-32 -right-24 w-[420px] h-[420px] bg-primary-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 -left-24 w-64 h-64 bg-primary-500/8 rounded-full blur-2xl pointer-events-none" />

        {/* ── Content ────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-col flex-1 px-10 py-10 lg:py-14 lg:px-14">

          {/* Logo */}
          <div className="flex items-center gap-3 mb-auto animate-fade-up" style={{ animationDelay: '0ms' }}>
            <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-primary-500/40 drop-shadow-[0_0_16px_rgba(249,115,22,0.5)] animate-float">
              <img src="/logo.svg" alt="MedIntel" className="w-full h-full" />
            </div>
            <div>
              <p className="text-white font-display font-bold text-xl leading-none tracking-tight">MedIntel</p>
              <p className="text-slate-400 text-xs mt-0.5 tracking-wide">Clinical Decision Intelligence</p>
            </div>
          </div>

          {/* Main copy */}
          <div className="my-10 lg:my-0 lg:flex-1 flex flex-col justify-center">
            <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-400 bg-primary-500/10 border border-primary-500/20 px-3 py-1 rounded-full mb-5 tracking-wider uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse inline-block" />
                Trusted by 500+ clinicians
              </span>
              <h1 className="font-display text-4xl lg:text-[2.75rem] font-extrabold text-white leading-[1.1] tracking-tight">
                Smarter Decisions.<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-orange-300">
                  Better Outcomes.
                </span>
              </h1>
              <p className="mt-4 text-slate-400 text-base leading-relaxed max-w-sm">
                An AI-augmented clinical platform that helps care teams act faster, reduce errors, and deliver evidence-based care at every step.
              </p>
            </div>

            {/* Feature list */}
            <div className="mt-8 space-y-4">
              {features.map((f, i) => (
                <div
                  key={f.title}
                  className="flex items-start gap-4 animate-fade-up"
                  style={{ animationDelay: `${160 + i * 80}ms` }}
                >
                  <div className="w-9 h-9 rounded-xl bg-primary-500/15 border border-primary-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <f.icon size={17} className="text-primary-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-200">{f.title}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Waveform graphic */}
          <div className="mt-10 mb-6 animate-fade-up hidden lg:flex items-end gap-[3px] h-12" style={{ animationDelay: '480ms' }}>
            {BARS.map((h, i) => (
              <div
                key={i}
                className="w-[5px] rounded-full bg-primary-500/40"
                style={{
                  height: `${h * 3.5}px`,
                  animation: `waveform ${0.8 + (i % 5) * 0.12}s ease-in-out infinite`,
                  animationDelay: `${i * 40}ms`,
                }}
              />
            ))}
          </div>

          {/* Footer */}
          <p className="text-slate-600 text-xs animate-fade-up" style={{ animationDelay: '520ms' }}>
            © 2026 MedIntel — For clinical use only
          </p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════
          RIGHT PANEL — Login form  (light)
      ══════════════════════════════════════════════════════════════ */}
      <div className="lg:w-1/2 bg-gray-50 flex items-center justify-center p-8 lg:p-12 relative overflow-hidden">

        {/* Subtle orange top-right accent */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-primary-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-orange-300/10 rounded-full blur-3xl pointer-events-none" />

        <div className="w-full max-w-md relative z-10">

          {/* Form header */}
          <div className="mb-8 animate-fade-up" style={{ animationDelay: '60ms' }}>
            <h2 className="font-display text-3xl font-bold text-gray-900 tracking-tight">Welcome back</h2>
            <p className="text-gray-500 text-sm mt-2">Sign in to access your clinical workspace</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-600 text-sm">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="clinician@hospital.com"
                required
                className="w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wider">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full bg-white border border-gray-200 text-gray-900 placeholder-gray-400 rounded-xl px-4 py-3 pr-12 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full relative group bg-primary-600 hover:bg-primary-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl py-3.5 text-sm transition-all shadow-lg shadow-primary-600/20 hover:shadow-primary-500/30 flex items-center justify-center gap-2 overflow-hidden"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in...</>
                : <><span>Sign In</span><ChevronRight size={16} /></>}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-7 animate-fade-up" style={{ animationDelay: '200ms' }}>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Demo Accounts</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Demo cards */}
          <div className="space-y-2.5 animate-fade-up" style={{ animationDelay: '260ms' }}>
            {demoAccounts.map(({ role, email: e, color }) => (
              <button
                key={e}
                onClick={() => { setEmail(e); setPassword('Password123!'); }}
                className="w-full flex items-center gap-3.5 px-4 py-3 rounded-xl bg-white hover:bg-primary-50 border border-gray-200 hover:border-primary-200 transition-all group text-left shadow-sm"
              >
                <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-md`}>
                  {role[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800 text-sm font-semibold">{role}</p>
                  <p className="text-gray-400 text-xs truncate">{e}</p>
                </div>
                <span className="text-gray-300 text-xs font-mono group-hover:text-gray-500 transition-colors flex-shrink-0">
                  Password123!
                </span>
              </button>
            ))}
          </div>

          {/* Mobile footer */}
          <p className="text-center text-gray-400 text-xs mt-8 lg:hidden">© 2026 MedIntel — For clinical use only</p>
        </div>
      </div>
    </div>
  );
}
