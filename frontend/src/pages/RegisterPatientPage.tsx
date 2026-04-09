import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Phone, MapPin, Heart, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import api from '../lib/api';
import { Patient } from '../types';

interface FormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: string;
  bloodType: string;
  phone: string;
  email: string;
  address: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  emergencyContactRel: string;
}

const INITIAL: FormData = {
  firstName: '',
  lastName: '',
  dateOfBirth: '',
  gender: '',
  bloodType: '',
  phone: '',
  email: '',
  address: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  emergencyContactRel: '',
};

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Child', 'Sibling', 'Friend', 'Guardian', 'Other'];

export default function RegisterPatientPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormData>(INITIAL);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.firstName.trim()) e.firstName = 'First name is required';
    if (!form.lastName.trim()) e.lastName = 'Last name is required';
    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    else if (new Date(form.dateOfBirth) >= new Date()) e.dateOfBirth = 'Date of birth must be in the past';
    if (!form.gender) e.gender = 'Gender is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Invalid email address';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setApiError('');
    try {
      const payload: Record<string, string> = {};
      (Object.keys(form) as (keyof FormData)[]).forEach(k => {
        if (form[k].trim()) payload[k] = form[k].trim();
      });
      const res = await api.post<Patient>('/patients', payload);
      navigate(`/patients/${res.data.id}`, { state: { registered: true } });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setApiError(msg || 'Failed to register patient. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = (field: keyof FormData) =>
    `w-full bg-white border ${errors[field] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-primary-500'} rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:border-transparent transition-all`;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/patients')}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Register New Patient</h1>
          <p className="text-gray-500 text-sm mt-0.5">Fill in patient details to create their medical record</p>
        </div>
      </div>

      {apiError && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 mb-5 text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {apiError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Personal Information */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
              <User size={14} className="text-primary-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Personal Information</h2>
            <span className="text-xs text-gray-400 ml-auto">* Required</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">First Name *</label>
              <input
                type="text"
                value={form.firstName}
                onChange={set('firstName')}
                placeholder="e.g. John"
                className={inputClass('firstName')}
              />
              {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Last Name *</label>
              <input
                type="text"
                value={form.lastName}
                onChange={set('lastName')}
                placeholder="e.g. Smith"
                className={inputClass('lastName')}
              />
              {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Date of Birth *</label>
              <input
                type="date"
                value={form.dateOfBirth}
                onChange={set('dateOfBirth')}
                max={new Date().toISOString().split('T')[0]}
                className={inputClass('dateOfBirth')}
              />
              {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Gender *</label>
              <select value={form.gender} onChange={set('gender')} className={inputClass('gender')}>
                <option value="">Select gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Blood Type</label>
              <select value={form.bloodType} onChange={set('bloodType')} className={inputClass('bloodType')}>
                <option value="">Unknown / Not tested</option>
                {BLOOD_TYPES.map(bt => <option key={bt} value={bt}>{bt}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Contact Information */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Phone size={14} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Contact Information</h2>
            <span className="text-xs text-gray-400 ml-auto">Optional</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={set('phone')}
                placeholder="e.g. +1 (555) 000-0000"
                className={inputClass('phone')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                placeholder="e.g. john.smith@email.com"
                className={inputClass('email')}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                <MapPin size={12} className="inline mr-1" />Address
              </label>
              <textarea
                value={form.address}
                onChange={set('address')}
                placeholder="Street address, city, state, ZIP"
                rows={2}
                className={`${inputClass('address')} resize-none`}
              />
            </div>
          </div>
        </section>

        {/* Emergency Contact */}
        <section className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center">
              <Heart size={14} className="text-orange-600" />
            </div>
            <h2 className="font-semibold text-gray-800">Emergency Contact</h2>
            <span className="text-xs text-gray-400 ml-auto">Optional</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
              <input
                type="text"
                value={form.emergencyContactName}
                onChange={set('emergencyContactName')}
                placeholder="Contact name"
                className={inputClass('emergencyContactName')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
              <input
                type="tel"
                value={form.emergencyContactPhone}
                onChange={set('emergencyContactPhone')}
                placeholder="Contact phone"
                className={inputClass('emergencyContactPhone')}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Relationship</label>
              <select value={form.emergencyContactRel} onChange={set('emergencyContactRel')} className={inputClass('emergencyContactRel')}>
                <option value="">Select relationship</option>
                {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-1 pb-4">
          <button
            type="button"
            onClick={() => navigate('/patients')}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-60 disabled:cursor-not-allowed rounded-lg transition-all shadow-sm"
          >
            {submitting ? (
              <><Loader2 size={16} className="animate-spin" /> Registering...</>
            ) : (
              <><CheckCircle size={16} /> Register Patient</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
