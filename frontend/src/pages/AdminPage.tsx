import { useState, useEffect, useRef, useCallback } from 'react';
import { Shield, UserPlus, Search, Stethoscope, Users, UserCheck, Loader2, MoreVertical, Pencil, Trash2, X, AlertCircle, CheckCircle, Eye, EyeOff, Palette, Check, Pill, Plus, ToggleLeft, ToggleRight, Filter, ImagePlus, Upload, Trash } from 'lucide-react';
import api from '../lib/api';
import { User, UserRole, AllergenMaster } from '../types';
import { useLogo } from '../contexts/LogoContext';
import { format } from 'date-fns';
import { THEMES, useTheme } from '../contexts/ThemeContext';

// ─── Types ───────────────────────────────────────────────────────────────────

interface AdminStats { doctors: number; nurses: number; staff: number; admins: number; patients: number; }

interface DoctorFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
  specialty: string;
}

const EMPTY_FORM: DoctorFormData = {
  firstName: '', lastName: '', email: '', password: '', confirmPassword: '', role: 'DOCTOR', specialty: '',
};

const SPECIALTIES = [
  'General Practice', 'Internal Medicine', 'Emergency Medicine', 'Cardiology', 'Neurology',
  'Oncology', 'Pediatrics', 'Psychiatry', 'Radiology', 'Surgery', 'Orthopedics',
  'Dermatology', 'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Nephrology',
  'Rheumatology', 'Urology', 'Ophthalmology', 'Anesthesiology', 'Pathology', 'Other',
];

const ROLE_META: Record<string, { label: string; color: string; bg: string }> = {
  DOCTOR:  { label: 'Doctor',  color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200' },
  NURSE:   { label: 'Nurse',   color: 'text-green-700',  bg: 'bg-green-50 border-green-200' },
  STAFF:   { label: 'Staff',   color: 'text-gray-700',   bg: 'bg-gray-50 border-gray-200' },
  ADMIN:   { label: 'Admin',   color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
};

// ─── AddEditModal ─────────────────────────────────────────────────────────────

function AddEditModal({
  editUser,
  onClose,
  onSaved,
}: {
  editUser: User | null;
  onClose: () => void;
  onSaved: (user: User) => void;
}) {
  const isEdit = !!editUser;
  const [form, setForm] = useState<DoctorFormData>(
    editUser
      ? { firstName: editUser.firstName, lastName: editUser.lastName, email: editUser.email, password: '', confirmPassword: '', role: editUser.role, specialty: editUser.specialty ?? '' }
      : EMPTY_FORM
  );
  const [errors, setErrors] = useState<Partial<DoctorFormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const set = (field: keyof DoctorFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<DoctorFormData> = {};
    if (!form.firstName.trim()) e.firstName = 'Required';
    if (!form.lastName.trim()) e.lastName = 'Required';
    if (!form.email.trim()) e.email = 'Required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email';
    if (!isEdit) {
      if (!form.password) e.password = 'Required';
      else if (form.password.length < 8) e.password = 'Min 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    } else if (form.password) {
      if (form.password.length < 8) e.password = 'Min 8 characters';
      if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      const payload: Record<string, string> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        role: form.role,
      };
      if (form.specialty.trim()) payload.specialty = form.specialty.trim();
      if (form.password) payload.password = form.password;

      let res;
      if (isEdit) {
        res = await api.patch<User>(`/admin/users/${editUser!.id}`, payload);
      } else {
        res = await api.post<User>('/admin/users', payload);
      }
      onSaved(res.data);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = (field: keyof DoctorFormData) =>
    `w-full bg-white border ${errors[field] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'} rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-100 flex items-center justify-center">
              <UserPlus size={16} className="text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Profile' : 'Add Doctor / Staff'}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={18} />
          </button>
        </div>

        {apiError && (
          <div className="mx-6 mt-4 flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2.5 text-sm">
            <AlertCircle size={15} className="flex-shrink-0" />{apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name *</label>
              <input type="text" value={form.firstName} onChange={set('firstName')} placeholder="John" className={inputCls('firstName')} />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name *</label>
              <input type="text" value={form.lastName} onChange={set('lastName')} placeholder="Smith" className={inputCls('lastName')} />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address *</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="dr.john@hospital.com" className={inputCls('email')} />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
          </div>

          {/* Role + Specialty */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Role *</label>
              <select value={form.role} onChange={set('role')} className={inputCls('role')}>
                <option value="DOCTOR">Doctor</option>
                <option value="NURSE">Nurse</option>
                <option value="STAFF">Staff</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Specialty</label>
              <select value={form.specialty} onChange={set('specialty')} className={inputCls('specialty')}>
                <option value="">None / General</option>
                {SPECIALTIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              {isEdit ? 'New Password (leave blank to keep current)' : 'Password *'}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={set('password')}
                placeholder={isEdit ? '••••••••' : 'Min 8 characters'}
                className={`${inputCls('password')} pr-10`}
              />
              <button type="button" onClick={() => setShowPassword(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
          </div>

          {(form.password || !isEdit) && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Confirm Password {!isEdit && '*'}</label>
              <input type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Re-enter password" className={inputCls('confirmPassword')} />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg transition-all">
              {submitting ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><CheckCircle size={15} /> {isEdit ? 'Save Changes' : 'Add to Team'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── DeleteConfirmModal ───────────────────────────────────────────────────────

function DeleteConfirmModal({ user, onClose, onDeleted }: { user: User; onClose: () => void; onDeleted: (id: string) => void }) {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/admin/users/${user.id}`);
      onDeleted(user.id);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to delete user');
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
            <Trash2 size={20} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Remove Staff Member</h3>
          <p className="text-sm text-gray-500 mt-1">
            Are you sure you want to remove <strong>{user.firstName} {user.lastName}</strong>? This action cannot be undone.
          </p>
        </div>
        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm mb-4">
            <AlertCircle size={14} />{error}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">Cancel</button>
          <button onClick={handleDelete} disabled={deleting} className="flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-60 rounded-lg">
            {deleting ? <><Loader2 size={14} className="animate-spin" /> Removing...</> : 'Yes, Remove'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── StaffCard ────────────────────────────────────────────────────────────────

function StaffCard({ user, onEdit, onDelete }: { user: User; onEdit: (u: User) => void; onDelete: (u: User) => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = ROLE_META[user.role] ?? ROLE_META.STAFF;
  const initials = `${user.firstName[0]}${user.lastName[0]}`;
  const avatarColors: Record<string, string> = {
    DOCTOR: 'bg-blue-500', NURSE: 'bg-green-500', STAFF: 'bg-gray-500', ADMIN: 'bg-purple-500',
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md hover:border-primary-100 transition-all">
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className={`w-11 h-11 rounded-full ${avatarColors[user.role] ?? 'bg-gray-400'} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 text-sm">{user.firstName} {user.lastName}</h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${meta.bg} ${meta.color}`}>{meta.label}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{user.email}</p>
          {user.specialty && (
            <p className="text-xs text-primary-600 mt-1 flex items-center gap-1">
              <Stethoscope size={11} />{user.specialty}
            </p>
          )}
        </div>

        {/* Menu */}
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenuOpen(p => !p)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
            <MoreVertical size={15} />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-8 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-10 py-1 overflow-hidden">
              <button
                onClick={() => { onEdit(user); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Pencil size={13} className="text-gray-400" /> Edit Profile
              </button>
              <button
                onClick={() => { onDelete(user); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={13} className="text-red-400" /> Remove
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-50">
        <div className="flex items-center gap-1.5">
          <UserCheck size={12} className="text-gray-400" />
          <span className="text-xs text-gray-400">{user._count?.encounters ?? 0} encounters</span>
        </div>
        {user.createdAt && (
          <div className="text-xs text-gray-400 ml-auto">
            Joined {format(new Date(user.createdAt), 'MMM d, yyyy')}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── AppearanceSettings ───────────────────────────────────────────────────────

function AppearanceSettings() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
          <Palette size={18} className="text-primary-600" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-gray-900">Colour Theme</h2>
          <p className="text-xs text-gray-500 mt-0.5">Choose a colour palette for the application interface</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEMES.map(t => {
          const active = t.id === theme.id;
          return (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all ${
                active
                  ? 'border-primary-500 bg-primary-50 shadow-sm'
                  : 'border-gray-100 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* Palette swatch strip */}
              <div className="flex-shrink-0 flex flex-col gap-1">
                <div className="flex gap-0.5 rounded-md overflow-hidden">
                  {([200, 400, 600, 800] as const).map(shade => (
                    <span
                      key={shade}
                      className="w-5 h-8 block"
                      style={{ backgroundColor: `rgb(${t.shades[shade]})` }}
                    />
                  ))}
                </div>
              </div>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>
              </div>

              {/* Active tick */}
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                active ? 'bg-primary-600' : 'border-2 border-gray-200'
              }`}>
                {active && <Check size={11} className="text-white" strokeWidth={3} />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Live preview strip */}
      <div className="mt-6 p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
        <p className="text-xs font-medium text-gray-500 mb-3">Preview — {theme.name}</p>
        <div className="flex items-center gap-3 flex-wrap">
          <button className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors">
            Primary Action
          </button>
          <button className="px-4 py-2 text-sm font-medium text-primary-600 bg-primary-50 border border-primary-200 rounded-lg">
            Secondary
          </button>
          <span className="px-2.5 py-1 text-xs font-medium text-primary-700 bg-primary-100 rounded-full">Badge</span>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-primary-500" />
            <span className="text-xs text-primary-600 font-medium">Status indicator</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── AllergenManagement ───────────────────────────────────────────────────────

const CATEGORIES = ['drug', 'food', 'environmental'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABEL: Record<Category, string> = {
  drug: 'Drug', food: 'Food', environmental: 'Environmental',
};

function AllergenManagement() {
  const [allergens, setAllergens] = useState<AllergenMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTarget, setEditTarget] = useState<AllergenMaster | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  const load = () => {
    setLoading(true);
    api.get<AllergenMaster[]>('/admin/allergens')
      .then(r => setAllergens(r.data))
      .catch(() => showToast('Failed to load allergens', false))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const visible = allergens.filter(a => {
    const matchCat = categoryFilter === 'all' || a.category === categoryFilter;
    const matchQ = !searchQuery.trim() || a.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchQ;
  });

  const counts: Record<string, number> = { all: allergens.length };
  CATEGORIES.forEach(c => { counts[c] = allergens.filter(a => a.category === c).length; });

  const toggleActive = async (a: AllergenMaster) => {
    try {
      await api.patch(`/admin/allergens/${a.id}`, { isActive: !a.isActive });
      setAllergens(prev => prev.map(x => x.id === a.id ? { ...x, isActive: !a.isActive } : x));
      showToast(`${a.name} ${!a.isActive ? 'enabled' : 'disabled'}`);
    } catch {
      showToast('Failed to update', false);
    }
  };

  const handleDelete = async (a: AllergenMaster) => {
    if (!confirm(`Remove "${a.name}" from the allergen list?`)) return;
    try {
      await api.delete(`/admin/allergens/${a.id}`);
      setAllergens(prev => prev.filter(x => x.id !== a.id));
      showToast(`${a.name} removed`);
    } catch {
      showToast('Failed to delete', false);
    }
  };

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${toast.ok ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.ok ? <CheckCircle size={15} /> : <AlertCircle size={15} />} {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center">
            <Pill size={18} className="text-orange-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Allergen Master List</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage allergens available in patient allergy forms</p>
          </div>
        </div>
        <button
          onClick={() => { setEditTarget(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
        >
          <Plus size={15} /> Add Allergen
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(['all', ...CATEGORIES] as const).map(c => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                ${categoryFilter === c ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              {c === 'all' ? 'All' : CATEGORY_LABEL[c]}
              <span className={`text-xs rounded-full px-1.5 py-0.5 ${categoryFilter === c ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-500'}`}>
                {counts[c]}
              </span>
            </button>
          ))}
        </div>
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search allergens…"
            className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={26} className="animate-spin text-primary-400" /></div>
      ) : visible.length === 0 ? (
        <div className="text-center py-14 bg-white rounded-xl border border-gray-100">
          <Filter size={32} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-500 font-medium">No allergens found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting the filter or search</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {visible.map(a => (
            <div key={a.id} className={`flex items-center gap-4 px-4 py-3 ${!a.isActive ? 'opacity-50' : ''}`}>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize flex-shrink-0 ${
                a.category === 'drug' ? 'bg-blue-50 text-blue-700 border border-blue-100'
                : a.category === 'food' ? 'bg-green-50 text-green-700 border border-green-100'
                : 'bg-purple-50 text-purple-700 border border-purple-100'
              }`}>
                {CATEGORY_LABEL[a.category as Category] ?? a.category}
              </span>
              <span className="flex-1 text-sm text-gray-900 font-medium">{a.name}</span>
              <span className={`text-xs font-medium ${a.isActive ? 'text-green-600' : 'text-gray-400'}`}>
                {a.isActive ? 'Active' : 'Disabled'}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => { setEditTarget(a); setShowAddModal(true); }}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                  title="Edit"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => toggleActive(a)}
                  className={`p-1.5 rounded-lg transition-colors ${a.isActive ? 'hover:bg-orange-50 text-orange-400 hover:text-orange-600' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`}
                  title={a.isActive ? 'Disable' : 'Enable'}
                >
                  {a.isActive ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
                </button>
                <button
                  onClick={() => handleDelete(a)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AllergenFormModal
          allergen={editTarget}
          onClose={() => { setShowAddModal(false); setEditTarget(null); }}
          onSaved={(saved, isNew) => {
            if (isNew) {
              setAllergens(prev => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
            } else {
              setAllergens(prev => prev.map(x => x.id === saved.id ? saved : x));
            }
            setShowAddModal(false);
            setEditTarget(null);
            showToast(`${saved.name} ${isNew ? 'added' : 'updated'}`);
          }}
        />
      )}
    </div>
  );
}

function AllergenFormModal({
  allergen,
  onClose,
  onSaved,
}: {
  allergen: AllergenMaster | null;
  onClose: () => void;
  onSaved: (saved: AllergenMaster, isNew: boolean) => void;
}) {
  const isEdit = !!allergen;
  const [name, setName] = useState(allergen?.name ?? '');
  const [category, setCategory] = useState<Category>(allergen?.category as Category ?? 'drug');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required'); return; }
    setError('');
    setSaving(true);
    try {
      if (isEdit) {
        const res = await api.patch<AllergenMaster>(`/admin/allergens/${allergen!.id}`, { name: name.trim(), category });
        onSaved(res.data, false);
      } else {
        const res = await api.post<AllergenMaster>('/admin/allergens', { name: name.trim(), category });
        onSaved(res.data, true);
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setError(msg || 'Failed to save allergen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-base font-semibold text-gray-900">{isEdit ? 'Edit Allergen' : 'Add Allergen'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-sm">
              <AlertCircle size={14} />{error}
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value as Category)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Allergen Name *</label>
            <input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Penicillin"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 rounded-lg">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
              {isEdit ? 'Save Changes' : 'Add Allergen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── BrandingTab ─────────────────────────────────────────────────────────────

function BrandingTab() {
  const { logoUrl, refreshLogo } = useLogo();
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const ACCEPTED = ['image/png', 'image/jpeg', 'image/svg+xml'];
  const MAX_MB = 2;

  const showToast = (msg: string, isError = false) => {
    if (isError) { setError(msg); setTimeout(() => setError(''), 4000); }
    else { setSuccess(msg); setTimeout(() => setSuccess(''), 4000); }
  };

  const validate = useCallback((f: File): string | null => {
    if (!ACCEPTED.includes(f.type)) return 'Only PNG, JPG, and SVG files are allowed.';
    if (f.size > MAX_MB * 1024 * 1024) return `File must be under ${MAX_MB}MB.`;
    return null;
  }, []);

  const handleFile = (f: File) => {
    const err = validate(f);
    if (err) { showToast(err, true); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const handleSave = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const form = new FormData();
      form.append('logo', file);
      await api.post('/admin/logo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      refreshLogo();
      setFile(null);
      setPreview(null);
      showToast('Logo updated successfully!');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      showToast(msg || 'Upload failed. Please try again.', true);
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => { setFile(null); setPreview(null); setError(''); };

  const handleDelete = async () => {
    if (!logoUrl) return;
    setDeleting(true);
    try {
      await api.delete('/admin/logo');
      refreshLogo();
      showToast('Logo reset to default.');
    } catch {
      showToast('Failed to remove logo.', true);
    } finally {
      setDeleting(false);
    }
  };

  const activeLogo = preview ?? logoUrl ?? '/logo.svg';

  return (
    <div className="max-w-2xl space-y-6">
      {/* Toast messages */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
          <CheckCircle size={16} className="flex-shrink-0" /> {success}
        </div>
      )}

      {/* Current logo preview */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Current Logo</h3>
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl bg-slate-900 flex items-center justify-center overflow-hidden shadow-lg flex-shrink-0">
            <img src={activeLogo} alt="Logo preview" className="w-full h-full object-contain p-2" />
          </div>
          <div className="text-sm text-gray-500 space-y-1">
            <p>{preview ? <span className="text-primary-600 font-medium">New logo ready to save</span> : logoUrl ? 'Custom logo active' : 'Using default logo'}</p>
            <p className="text-xs text-gray-400">Shown in the sidebar and login screen</p>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-4">Upload New Logo</h3>
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-10 px-6 cursor-pointer transition-all
            ${dragging ? 'border-primary-400 bg-primary-50' : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center">
            <Upload size={22} className="text-primary-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-700">Drag & drop or <span className="text-primary-600">browse</span></p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG — max {MAX_MB}MB</p>
          </div>
          <input ref={inputRef} type="file" accept=".png,.jpg,.jpeg,.svg" className="hidden" onChange={onInputChange} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {file ? (
          <>
            <button
              onClick={handleSave}
              disabled={uploading}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-all shadow-sm"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
              {uploading ? 'Saving…' : 'Save Logo'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium px-5 py-2.5 rounded-lg transition-all"
            >
              <X size={15} /> Cancel
            </button>
          </>
        ) : logoUrl ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 bg-red-50 hover:bg-red-100 disabled:opacity-60 text-red-600 text-sm font-medium px-5 py-2.5 rounded-lg border border-red-200 transition-all"
          >
            {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash size={15} />}
            {deleting ? 'Removing…' : 'Reset to Default'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

// ─── AdminPage ────────────────────────────────────────────────────────────────

type AdminTab = 'staff' | 'allergens' | 'settings' | 'branding';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('staff');
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchUsers = (q = '', role = roleFilter) => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (role !== 'ALL') params.set('role', role);
    api.get<User[]>(`/admin/users?${params}`)
      .then(res => setUsers(res.data))
      .catch(() => showToast('Failed to load staff list', 'error'))
      .finally(() => setLoading(false));
  };

  const fetchStats = () => {
    api.get<AdminStats>('/admin/stats').then(res => setStats(res.data)).catch(() => {});
  };

  useEffect(() => { fetchUsers(); fetchStats(); }, []);

  const handleSearch = (val: string) => {
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(val), 350);
  };

  const handleRoleFilter = (role: string) => {
    setRoleFilter(role);
    fetchUsers(query, role);
  };

  const handleSaved = (saved: User) => {
    setUsers(prev => {
      const idx = prev.findIndex(u => u.id === saved.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = saved; return next; }
      return [saved, ...prev];
    });
    fetchStats();
    setShowModal(false);
    setEditUser(null);
    showToast(editUser ? `${saved.firstName} ${saved.lastName}'s profile updated` : `${saved.firstName} ${saved.lastName} added to the team`);
  };

  const handleDeleted = (id: string) => {
    const u = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    fetchStats();
    setDeleteUser(null);
    if (u) showToast(`${u.firstName} ${u.lastName} removed from the team`);
  };

  const ROLE_TABS = [
    { key: 'ALL', label: 'All Staff', icon: Users, count: (stats ? stats.doctors + stats.nurses + stats.staff + stats.admins : null) },
    { key: 'DOCTOR', label: 'Doctors', icon: Stethoscope, count: stats?.doctors ?? null },
    { key: 'NURSE', label: 'Nurses', icon: UserCheck, count: stats?.nurses ?? null },
    { key: 'STAFF', label: 'Staff', icon: Users, count: stats?.staff ?? null },
  ];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium transition-all
          ${toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
          {toast.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
            <Shield size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
            <p className="text-gray-500 text-sm mt-0.5">Manage staff and application settings</p>
          </div>
        </div>
        {activeTab === 'staff' && (
          <button
            onClick={() => { setEditUser(null); setShowModal(true); }}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-all shadow-sm"
          >
            <UserPlus size={16} /> Add Doctor
          </button>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit mb-6">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'staff' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users size={15} /> Staff Management
        </button>
        <button
          onClick={() => setActiveTab('allergens')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'allergens' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Pill size={15} /> Allergens
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'settings' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Palette size={15} /> Appearance
        </button>
        <button
          onClick={() => setActiveTab('branding')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'branding' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ImagePlus size={15} /> Branding
        </button>
      </div>

      {activeTab === 'staff' && (
        <>
          {/* Stats cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Doctors', value: stats.doctors, color: 'text-blue-600', bg: 'bg-blue-50', icon: Stethoscope },
                { label: 'Nurses', value: stats.nurses, color: 'text-green-600', bg: 'bg-green-50', icon: UserCheck },
                { label: 'Staff', value: stats.staff, color: 'text-gray-600', bg: 'bg-gray-50', icon: Users },
                { label: 'Patients', value: stats.patients, color: 'text-primary-600', bg: 'bg-primary-50', icon: Users },
              ].map(({ label, value, color, bg, icon: Icon }) => (
                <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={18} className={color} />
                  </div>
                  <div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Role filter tabs + Search */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {ROLE_TABS.map(({ key, label, count }) => (
                <button
                  key={key}
                  onClick={() => handleRoleFilter(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap
                    ${roleFilter === key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {label}
                  {count !== null && (
                    <span className={`text-xs rounded-full px-1.5 py-0.5 ${roleFilter === key ? 'bg-primary-100 text-primary-600' : 'bg-gray-200 text-gray-500'}`}>
                      {count}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={e => handleSearch(e.target.value)}
                placeholder="Search by name, email or specialty..."
                className="w-full bg-white border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          {/* Staff grid */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 size={28} className="animate-spin text-primary-400" />
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-gray-100">
              <Users size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">No staff members found</p>
              <p className="text-gray-400 text-sm mt-1">Try adjusting your search or role filter</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {users.map(u => (
                <StaffCard key={u.id} user={u} onEdit={u => { setEditUser(u); setShowModal(true); }} onDelete={setDeleteUser} />
              ))}
            </div>
          )}

          {/* Modals */}
          {showModal && (
            <AddEditModal
              editUser={editUser}
              onClose={() => { setShowModal(false); setEditUser(null); }}
              onSaved={handleSaved}
            />
          )}
          {deleteUser && (
            <DeleteConfirmModal
              user={deleteUser}
              onClose={() => setDeleteUser(null)}
              onDeleted={handleDeleted}
            />
          )}
        </>
      )}

      {activeTab === 'allergens' && <AllergenManagement />}
      {activeTab === 'settings' && <AppearanceSettings />}
      {activeTab === 'branding' && <BrandingTab />}
    </div>
  );
}
