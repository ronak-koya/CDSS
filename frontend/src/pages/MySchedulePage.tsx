import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Loader2, CheckCircle, CalendarOff, Clock, Info } from 'lucide-react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import api from '../lib/api';

// ─── Types ────────────────────────────────────────────────────────────────────
interface TimeRange { start: string; end: string }
type DayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
type WeekSchedule = Record<DayKey, TimeRange[]>;

interface DoctorBlock {
  id: string;
  date: string;
  reason?: string;
  note?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const DAYS: { key: DayKey; label: string; short: string }[] = [
  { key: 'mon', label: 'Monday',    short: 'Mon' },
  { key: 'tue', label: 'Tuesday',   short: 'Tue' },
  { key: 'wed', label: 'Wednesday', short: 'Wed' },
  { key: 'thu', label: 'Thursday',  short: 'Thu' },
  { key: 'fri', label: 'Friday',    short: 'Fri' },
  { key: 'sat', label: 'Saturday',  short: 'Sat' },
  { key: 'sun', label: 'Sunday',    short: 'Sun' },
];

const SLOT_DURATIONS = [15, 20, 30];

const BLOCK_REASONS = [
  { value: 'vacation',    label: '🏖️ Vacation' },
  { value: 'conference',  label: '🎤 Conference' },
  { value: 'emergency',   label: '🚨 Emergency' },
  { value: 'personal',    label: '👤 Personal' },
  { value: 'training',    label: '📚 Training' },
  { value: 'other',       label: '📌 Other' },
];

const DEFAULT_SCHEDULE: WeekSchedule = {
  mon: [{ start: '09:00', end: '17:00' }],
  tue: [{ start: '09:00', end: '17:00' }],
  wed: [{ start: '09:00', end: '17:00' }],
  thu: [{ start: '09:00', end: '17:00' }],
  fri: [{ start: '09:00', end: '17:00' }],
  sat: [],
  sun: [],
};

// Generate time options in 30-min increments (06:00 – 21:00)
const TIME_OPTIONS: string[] = [];
for (let h = 6; h <= 21; h++) {
  for (const m of [0, 30]) {
    TIME_OPTIONS.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}

function slotsPerDay(ranges: TimeRange[], dur: number): number {
  return ranges.reduce((acc, r) => {
    const [sh, sm] = r.start.split(':').map(Number);
    const [eh, em] = r.end.split(':').map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    return acc + (mins > 0 ? Math.floor(mins / dur) : 0);
  }, 0);
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MySchedulePage() {
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE);
  const [slotDuration, setSlotDuration] = useState<number>(20);
  const [blocks, setBlocks] = useState<DoctorBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Block form
  const [blockDate, setBlockDate] = useState('');
  const [blockReason, setBlockReason] = useState('vacation');
  const [blockNote, setBlockNote] = useState('');
  const [addingBlock, setAddingBlock] = useState(false);
  const [blockError, setBlockError] = useState('');

  // Load
  const load = useCallback(async () => {
    try {
      const [avRes, blRes] = await Promise.all([
        api.get('/availability'),
        api.get('/availability/blocks'),
      ]);
      if (avRes.data) {
        setSlotDuration(avRes.data.slotDuration ?? 20);
        try {
          const parsed = typeof avRes.data.schedule === 'string'
            ? JSON.parse(avRes.data.schedule)
            : avRes.data.schedule;
          setSchedule({ ...DEFAULT_SCHEDULE, ...parsed });
        } catch { /* use default */ }
      }
      setBlocks(blRes.data ?? []);
    } catch { /* use defaults */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Schedule helpers ──────────────────────────────────────────────────────
  const toggleDay = (day: DayKey) => {
    setSchedule(s => ({
      ...s,
      [day]: s[day].length ? [] : [{ start: '09:00', end: '17:00' }],
    }));
  };

  const addRange = (day: DayKey) => {
    setSchedule(s => ({ ...s, [day]: [...s[day], { start: '09:00', end: '17:00' }] }));
  };

  const removeRange = (day: DayKey, idx: number) => {
    setSchedule(s => ({ ...s, [day]: s[day].filter((_, i) => i !== idx) }));
  };

  const updateRange = (day: DayKey, idx: number, field: 'start' | 'end', val: string) => {
    setSchedule(s => ({
      ...s,
      [day]: s[day].map((r, i) => i === idx ? { ...r, [field]: val } : r),
    }));
  };

  // ── Save schedule ─────────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/availability', { schedule, slotDuration });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  // ── Block helpers ─────────────────────────────────────────────────────────
  const handleAddBlock = async () => {
    if (!blockDate) { setBlockError('Please select a date.'); return; }
    if (isBefore(parseISO(blockDate), startOfDay(new Date()))) {
      setBlockError('Cannot block a date in the past.'); return;
    }
    setBlockError('');
    setAddingBlock(true);
    try {
      const res = await api.post('/availability/blocks', { date: blockDate, reason: blockReason, note: blockNote || undefined });
      setBlocks(b => [...b, res.data].sort((a, z) => a.date.localeCompare(z.date)));
      setBlockDate('');
      setBlockNote('');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error;
      setBlockError(msg ?? 'Failed to add block.');
    } finally { setAddingBlock(false); }
  };

  const handleDeleteBlock = async (id: string) => {
    try {
      await api.delete(`/availability/blocks/${id}`);
      setBlocks(b => b.filter(x => x.id !== id));
    } catch { /* silent */ }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const upcomingBlocks = blocks.filter(b => !isBefore(parseISO(b.date), startOfDay(new Date())));
  const totalWeeklySlots = DAYS.reduce((acc, d) => acc + slotsPerDay(schedule[d.key], slotDuration), 0);
  const activeDays = DAYS.filter(d => schedule[d.key].length > 0).length;

  if (loading) return (
    <div className="flex h-full items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-4 border-primary-500 border-t-transparent" />
    </div>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Availability</h1>
          <p className="text-gray-500 text-sm mt-1">Set your weekly working hours and block specific dates</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold px-5 py-2.5 rounded-xl shadow-sm transition-all"
        >
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving...</>
           : saved  ? <><CheckCircle size={16} /> Saved!</>
           : <><Save size={16} /> Save Schedule</>}
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-primary-600">{activeDays}</p>
          <p className="text-sm text-gray-500 mt-1">Working days / week</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-primary-600">{totalWeeklySlots}</p>
          <p className="text-sm text-gray-500 mt-1">Appointment slots / week</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-4 text-center">
          <p className="text-3xl font-bold text-primary-600">{slotDuration}<span className="text-lg">m</span></p>
          <p className="text-sm text-gray-500 mt-1">Slot duration</p>
        </div>
      </div>

      {/* ── Section 1: Slot Duration ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={18} className="text-primary-600" />
          <h2 className="text-base font-bold text-gray-900">Appointment Slot Duration</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">Each appointment slot will be this long. Patients can only book one slot at a time.</p>
        <div className="flex gap-3">
          {SLOT_DURATIONS.map(d => (
            <button
              key={d}
              onClick={() => setSlotDuration(d)}
              className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${
                slotDuration === d
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              {d} min
              {d === 20 && <span className="block text-xs font-normal text-gray-400">Default</span>}
            </button>
          ))}
        </div>
      </div>

      {/* ── Section 2: Weekly Schedule ───────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarOff size={18} className="text-primary-600" />
          <h2 className="text-base font-bold text-gray-900">Weekly Recurring Schedule</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">Toggle a day on/off and add multiple time blocks per day (e.g. morning + afternoon).</p>

        <div className="space-y-3">
          {DAYS.map(({ key, label, short }) => {
            const isOn = schedule[key].length > 0;
            const daySlots = slotsPerDay(schedule[key], slotDuration);
            return (
              <div key={key} className={`rounded-xl border transition-all ${isOn ? 'border-primary-200 bg-primary-50/30' : 'border-gray-100 bg-gray-50/50'}`}>
                {/* Day header row */}
                <div className="flex items-center gap-4 px-5 py-3">
                  {/* Toggle */}
                  <button
                    onClick={() => toggleDay(key)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${isOn ? 'bg-primary-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isOn ? 'translate-x-5' : ''}`} />
                  </button>

                  {/* Day label */}
                  <div className="w-24 flex-shrink-0">
                    <p className={`text-sm font-semibold ${isOn ? 'text-gray-900' : 'text-gray-400'}`}>{label}</p>
                    <p className="text-xs text-gray-400">{short}</p>
                  </div>

                  {/* OFF state */}
                  {!isOn && <p className="text-sm text-gray-400 italic">Day off — no appointments</p>}

                  {/* ON state: time ranges */}
                  {isOn && (
                    <div className="flex-1 space-y-2">
                      {schedule[key].map((range, idx) => (
                        <div key={idx} className="flex items-center gap-2 flex-wrap">
                          <select
                            value={range.start}
                            onChange={e => updateRange(key, idx, 'start', e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                          >
                            {TIME_OPTIONS.map(t => <option key={t}>{t}</option>)}
                          </select>
                          <span className="text-gray-400 text-sm">to</span>
                          <select
                            value={range.end}
                            onChange={e => updateRange(key, idx, 'end', e.target.value)}
                            className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400 bg-white"
                          >
                            {TIME_OPTIONS.filter(t => t > range.start).map(t => <option key={t}>{t}</option>)}
                          </select>
                          <span className="text-xs text-primary-600 font-medium bg-primary-50 px-2 py-1 rounded-md">
                            {slotsPerDay([range], slotDuration)} slots
                          </span>
                          {schedule[key].length > 1 && (
                            <button onClick={() => removeRange(key, idx)} className="text-gray-300 hover:text-red-500 transition-colors">
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => addRange(key)}
                        className="flex items-center gap-1 text-xs text-primary-600 hover:text-primary-700 font-medium mt-1"
                      >
                        <Plus size={13} /> Add break / split shift
                      </button>
                    </div>
                  )}

                  {/* Daily slot count */}
                  {isOn && (
                    <div className="ml-auto flex-shrink-0 text-right">
                      <p className="text-sm font-bold text-primary-700">{daySlots}</p>
                      <p className="text-xs text-gray-400">slots</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          <Info size={14} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700">
            This schedule repeats every week. To block a specific date (holiday, vacation, etc.) use the <strong>Blocked Dates</strong> section below.
            Slot count = total bookable appointments per day based on your slot duration.
          </p>
        </div>
      </div>

      {/* ── Section 3: Blocked Dates ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1">
          <CalendarOff size={18} className="text-red-500" />
          <h2 className="text-base font-bold text-gray-900">Blocked Dates</h2>
        </div>
        <p className="text-sm text-gray-500 mb-6">Mark specific dates as unavailable. No appointments can be booked on these days.</p>

        {/* Add block form */}
        <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 mb-6">
          <p className="text-sm font-semibold text-gray-700 mb-3">Block a Date</p>
          {blockError && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">{blockError}</p>}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
              <input
                type="date"
                value={blockDate}
                min={format(new Date(), 'yyyy-MM-dd')}
                onChange={e => { setBlockDate(e.target.value); setBlockError(''); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reason</label>
              <select
                value={blockReason}
                onChange={e => setBlockReason(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              >
                {BLOCK_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Note (optional)</label>
              <input
                value={blockNote}
                onChange={e => setBlockNote(e.target.value)}
                placeholder="e.g. CME conference"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400"
              />
            </div>
          </div>
          <button
            onClick={handleAddBlock}
            disabled={addingBlock || !blockDate}
            className="mt-3 flex items-center gap-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all"
          >
            {addingBlock ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Block This Date
          </button>
        </div>

        {/* Upcoming blocks list */}
        {upcomingBlocks.length === 0 ? (
          <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-xl">
            <CalendarOff size={28} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">No upcoming blocked dates</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Upcoming Blocked Dates ({upcomingBlocks.length})</p>
            {upcomingBlocks.map(b => {
              const reasonObj = BLOCK_REASONS.find(r => r.value === b.reason);
              return (
                <div key={b.id} className="flex items-center gap-4 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
                  <div className="w-14 flex-shrink-0 text-center">
                    <p className="text-xs text-red-400 font-medium uppercase">{format(parseISO(b.date), 'MMM')}</p>
                    <p className="text-xl font-bold text-red-700 leading-none">{format(parseISO(b.date), 'd')}</p>
                    <p className="text-xs text-red-400">{format(parseISO(b.date), 'EEE')}</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-red-800">{reasonObj?.label ?? b.reason}</p>
                    {b.note && <p className="text-xs text-red-600 mt-0.5">{b.note}</p>}
                    <p className="text-xs text-red-400 mt-0.5">{format(parseISO(b.date), 'EEEE, MMMM d, yyyy')}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteBlock(b.id)}
                    className="text-red-300 hover:text-red-600 transition-colors flex-shrink-0"
                    title="Remove block"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
