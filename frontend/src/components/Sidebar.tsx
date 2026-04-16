import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Brain, Bell, LogOut, ChevronRight, Activity, Shield, CalendarDays, CalendarClock, Video } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLogoSrc } from '../contexts/LogoContext';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', roles: null },
  { to: '/patients', icon: Users, label: 'Patients', roles: null },
  { to: '/diagnosis', icon: Brain, label: 'Diagnosis AI', roles: null },
  { to: '/alerts', icon: Bell, label: 'Alerts', roles: null },
  { to: '/appointments', icon: CalendarDays, label: 'Appointments', roles: null },
  { to: '/my-schedule', icon: CalendarClock, label: 'My Schedule', roles: ['DOCTOR'] },
  { to: '/video-calls', icon: Video, label: 'Video Calls', roles: ['DOCTOR'] },
  { to: '/admin', icon: Shield, label: 'Admin', roles: ['ADMIN'] },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const logoSrc = useLogoSrc();

  const handleLogout = () => { logout(); navigate('/login'); };
  const roleColor = { DOCTOR: 'bg-blue-500', NURSE: 'bg-green-500', ADMIN: 'bg-purple-500', STAFF: 'bg-gray-500' }[user?.role ?? 'STAFF'] ?? 'bg-gray-500';

  return (
    <aside className="w-64 flex-shrink-0 bg-slate-900 flex flex-col h-full shadow-2xl">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700">
        <div className="w-9 h-9 rounded-xl overflow-hidden shadow-lg shadow-primary-500/30 drop-shadow-[0_0_8px_rgba(249,115,22,0.4)]">
          <img src={logoSrc} alt="MedIntel" className="w-full h-full" />
        </div>
        <div>
          <p className="text-white font-bold text-lg leading-none">MedIntel</p>
          <p className="text-slate-400 text-xs mt-0.5">Clinical Decision Intelligence</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.filter(item => !item.roles || item.roles.includes(user?.role ?? '')).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all group ${
                isActive
                  ? 'bg-primary-600/20 text-primary-400 border border-primary-600/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-primary-400' : 'text-slate-500 group-hover:text-slate-300'} />
                <span className="text-sm font-medium flex-1">{label}</span>
                {isActive && <ChevronRight size={14} className="text-primary-400" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Vitals quick indicator */}
      <div className="mx-3 mb-3 px-3 py-3 rounded-lg bg-slate-800 border border-slate-700">
        <div className="flex items-center gap-2 mb-2">
          <Activity size={14} className="text-primary-400" />
          <span className="text-xs text-slate-400 font-medium">System Status</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-xs text-green-400">All systems operational</span>
        </div>
      </div>

      {/* User */}
      <div className="px-3 pb-4 border-t border-slate-700 pt-3">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className={`w-8 h-8 rounded-full ${roleColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
            {user?.firstName?.[0]}{user?.lastName?.[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-slate-200 text-sm font-medium truncate">{user?.role === 'DOCTOR' ? 'Dr. ' : ''}{user?.firstName} {user?.lastName}</p>
            <p className="text-slate-500 text-xs truncate">{user?.role}</p>
          </div>
          <button onClick={handleLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Logout">
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
