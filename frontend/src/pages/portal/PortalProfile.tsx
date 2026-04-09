import { useEffect, useState } from 'react';
import { User, Shield, Phone, MapPin, Eye, EyeOff } from 'lucide-react';
import api from '../../lib/api';
import { format } from 'date-fns';

interface ProfileData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType?: string;
  phone?: string;
  email?: string;
  address?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRel?: string;
  allergies: { id: string; allergen: string; type: string; severity: string; reaction?: string }[];
}

const severityColor: Record<string, string> = {
  mild:     'bg-yellow-100 text-yellow-700',
  moderate: 'bg-orange-100 text-orange-700',
  severe:   'bg-red-100 text-red-700',
};

export default function PortalProfile() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Change password state
  const [showPwForm, setShowPwForm] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    api.get<ProfileData>('/portal/profile')
      .then(r => setProfile(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');
    if (newPw !== confirmPw) { setPwError('New passwords do not match'); return; }
    if (newPw.length < 8) { setPwError('Password must be at least 8 characters'); return; }
    setPwLoading(true);
    try {
      await api.post('/portal/change-password', { currentPassword: currentPw, newPassword: newPw });
      setPwSuccess('Password updated successfully');
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
      setTimeout(() => { setShowPwForm(false); setPwSuccess(''); }, 2000);
    } catch (err: any) {
      setPwError(err.response?.data?.error ?? 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 rounded-xl animate-pulse" />)}
    </div>
  );

  if (!profile) return null;

  const age = profile.dateOfBirth
    ? Math.floor((Date.now() - new Date(profile.dateOfBirth).getTime()) / (365.25 * 24 * 3600 * 1000))
    : null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900">My Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Your personal health information</p>
      </div>

      {/* Personal info */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800">Personal Information</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div><p className="text-xs text-gray-400 mb-0.5">Full Name</p><p className="font-medium text-gray-900">{profile.firstName} {profile.lastName}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Date of Birth</p><p className="font-medium text-gray-900">{profile.dateOfBirth}{age !== null && <span className="text-gray-400 ml-1">({age} yrs)</span>}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Gender</p><p className="font-medium text-gray-900">{profile.gender}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Blood Type</p><p className="font-medium text-gray-900">{profile.bloodType ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Email</p><p className="font-medium text-gray-900">{profile.email ?? '—'}</p></div>
          <div><p className="text-xs text-gray-400 mb-0.5">Phone</p><p className="font-medium text-gray-900">{profile.phone ?? '—'}</p></div>
        </div>
        {profile.address && (
          <div className="mt-3 pt-3 border-t border-gray-50 text-sm">
            <p className="text-xs text-gray-400 mb-0.5 flex items-center gap-1"><MapPin size={11} /> Address</p>
            <p className="font-medium text-gray-900">{profile.address}</p>
          </div>
        )}
      </div>

      {/* Emergency contact */}
      {profile.emergencyContactName && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-800">Emergency Contact</h2>
          </div>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><p className="text-xs text-gray-400 mb-0.5">Name</p><p className="font-medium text-gray-900">{profile.emergencyContactName}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Relationship</p><p className="font-medium text-gray-900">{profile.emergencyContactRel ?? '—'}</p></div>
            <div><p className="text-xs text-gray-400 mb-0.5">Phone</p><p className="font-medium text-gray-900">{profile.emergencyContactPhone ?? '—'}</p></div>
          </div>
        </div>
      )}

      {/* Allergies */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-800">Allergies</h2>
        </div>
        {profile.allergies.length === 0 ? (
          <p className="text-sm text-gray-400">No known allergies on file</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {profile.allergies.map(a => (
              <div key={a.id} className="border border-gray-100 rounded-lg px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{a.allergen}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${severityColor[a.severity] ?? 'bg-gray-100 text-gray-600'}`}>{a.severity}</span>
                </div>
                {a.reaction && <p className="text-xs text-gray-500 mt-0.5">{a.reaction}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Change password */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-gray-800">Password</h2>
          <button
            onClick={() => { setShowPwForm(v => !v); setPwError(''); setPwSuccess(''); }}
            className="text-sm text-primary-600 font-medium hover:text-primary-700"
          >
            {showPwForm ? 'Cancel' : 'Change Password'}
          </button>
        </div>

        {!showPwForm && (
          <p className="text-sm text-gray-500">••••••••••</p>
        )}

        {showPwForm && (
          <form onSubmit={handleChangePassword} className="space-y-3 mt-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Current Password</label>
              <input
                type="password"
                value={currentPw}
                onChange={e => setCurrentPw(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  required
                  className="w-full px-3 py-2 pr-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button type="button" onClick={() => setShowNew(v => !v)} className="absolute right-2.5 top-2.5 text-gray-400">
                  {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPw}
                onChange={e => setConfirmPw(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            {pwError && <p className="text-xs text-red-600">{pwError}</p>}
            {pwSuccess && <p className="text-xs text-emerald-600">{pwSuccess}</p>}
            <button
              type="submit"
              disabled={pwLoading}
              className="bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              {pwLoading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
