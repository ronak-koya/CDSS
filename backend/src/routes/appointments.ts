import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Shared doctor select fields
const doctorSelect = {
  id: true, firstName: true, lastName: true, specialty: true, role: true,
};

const appointmentInclude = {
  patient: { select: { id: true, firstName: true, lastName: true, mrn: true, dateOfBirth: true, phone: true } },
  doctor: { select: doctorSelect },
  createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
};

// ─── GET /api/appointments ────────────────────────────────────────────────────
// Query: doctorId, patientId, status, date (YYYY-MM-DD), view (today|week|all)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId, patientId, status, date, view } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};

    // Doctors only see their own appointments by default
    if (req.user!.role === 'DOCTOR') {
      where.doctorId = req.user!.id;
    } else if (doctorId) {
      where.doctorId = doctorId;
    }

    if (patientId) where.patientId = patientId;
    if (status) where.status = status;

    // Date filtering — parse "YYYY-MM-DD" as LOCAL midnight, not UTC
    if (date) {
      const [yr, mo, dy] = date.split('-').map(Number);
      const start = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
      const end   = new Date(yr, mo - 1, dy, 23, 59, 59, 999);
      where.scheduledAt = { gte: start, lte: end };
    } else if (view === 'today') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: start, lte: end };
    } else if (view === 'week') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setDate(end.getDate() + 7);
      end.setHours(23, 59, 59, 999);
      where.scheduledAt = { gte: start, lte: end };
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: appointmentInclude,
      orderBy: { scheduledAt: 'asc' },
    });

    res.json(appointments);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/appointments/doctors ───────────────────────────────────────────
// List all doctors (for booking selector)
router.get('/doctors', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR' },
      select: { id: true, firstName: true, lastName: true, specialty: true },
      orderBy: { firstName: 'asc' },
    });
    res.json(doctors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/appointments/slots?doctorId=&date= ─────────────────────────────
// Returns 08:00–18:00 slots (30-min) with availability status
router.get('/slots', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { doctorId, date, excludeId } = req.query as Record<string, string>;
    if (!doctorId || !date) {
      res.status(400).json({ error: 'doctorId and date are required' });
      return;
    }

    const [yr, mo, dy] = date.split('-').map(Number);
    const start = new Date(yr, mo - 1, dy, 0, 0, 0, 0);
    const end   = new Date(yr, mo - 1, dy, 23, 59, 59, 999);

    const booked = await prisma.appointment.findMany({
      where: {
        doctorId,
        scheduledAt: { gte: start, lte: end },
        status: { notIn: ['cancelled', 'no_show'] },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { scheduledAt: true, duration: true },
    });

    // Generate 08:00–17:30 slots (30-min increments)
    const slots: { time: string; available: boolean }[] = [];
    for (let hour = 8; hour < 18; hour++) {
      for (const min of [0, 30]) {
        const slotTime = new Date(yr, mo - 1, dy, hour, min, 0, 0);
        const slotEnd = new Date(slotTime.getTime() + 30 * 60 * 1000);

        const conflict = booked.some((b) => {
          const bStart = new Date(b.scheduledAt);
          const bEnd = new Date(bStart.getTime() + b.duration * 60 * 1000);
          return slotTime < bEnd && slotEnd > bStart;
        });

        slots.push({
          time: `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`,
          available: !conflict,
        });
      }
    }

    res.json(slots);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/appointments/stats ─────────────────────────────────────────────
router.get('/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const doctorFilter = req.user!.role === 'DOCTOR' ? { doctorId: req.user!.id } : {};

    const [todayTotal, scheduled, inProgress, completed] = await Promise.all([
      prisma.appointment.count({ where: { ...doctorFilter, scheduledAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.appointment.count({ where: { ...doctorFilter, status: 'scheduled', scheduledAt: { gte: todayStart, lte: todayEnd } } }),
      prisma.appointment.count({ where: { ...doctorFilter, status: 'in_progress' } }),
      prisma.appointment.count({ where: { ...doctorFilter, status: 'completed', scheduledAt: { gte: todayStart, lte: todayEnd } } }),
    ]);

    res.json({ todayTotal, scheduled, inProgress, completed });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/appointments/:id ────────────────────────────────────────────────
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id: req.params.id },
      include: appointmentInclude,
    });
    if (!appt) { res.status(404).json({ error: 'Appointment not found' }); return; }
    res.json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/appointments ───────────────────────────────────────────────────
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { patientId, doctorId, title, type, scheduledAt, duration, department, room, notes } = req.body;

    if (!patientId || !doctorId || !title || !type || !scheduledAt) {
      res.status(400).json({ error: 'patientId, doctorId, title, type, scheduledAt are required' });
      return;
    }

    // Check doctor exists
    const doctor = await prisma.user.findFirst({ where: { id: doctorId, role: 'DOCTOR' } });
    if (!doctor) { res.status(404).json({ error: 'Doctor not found' }); return; }

    // Check patient exists
    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) { res.status(404).json({ error: 'Patient not found' }); return; }

    // Conflict check
    const apptStart = new Date(scheduledAt);
    const apptEnd = new Date(apptStart.getTime() + (duration ?? 30) * 60 * 1000);
    const conflict = await prisma.appointment.findFirst({
      where: {
        doctorId,
        status: { notIn: ['cancelled', 'no_show'] },
        scheduledAt: { lt: apptEnd },
        AND: [{
          scheduledAt: {
            gte: new Date(apptStart.getTime() - (duration ?? 30) * 60 * 1000),
          },
        }],
      },
    });
    if (conflict) {
      res.status(409).json({ error: 'Doctor already has an appointment at this time' });
      return;
    }

    const appt = await prisma.appointment.create({
      data: {
        patientId,
        doctorId,
        createdById: req.user!.id,
        title,
        type,
        status: 'scheduled',
        scheduledAt: new Date(scheduledAt),
        duration: duration ?? 30,
        department: department ?? null,
        room: room ?? null,
        notes: notes ?? null,
      },
      include: appointmentInclude,
    });

    res.status(201).json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/appointments/:id ─────────────────────────────────────────────
router.patch('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, type, scheduledAt, duration, department, room, notes, status, completionNotes } = req.body;

    // Status transition guard
    const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Appointment not found' }); return; }

    // Doctors can only update status + completionNotes on their own appointments
    if (req.user!.role === 'DOCTOR' && existing.doctorId !== req.user!.id) {
      res.status(403).json({ error: 'You can only update your own appointments' });
      return;
    }

    const data: Record<string, unknown> = {};
    if (title) data.title = title;
    if (type) data.type = type;
    if (scheduledAt) data.scheduledAt = new Date(scheduledAt);
    if (duration) data.duration = duration;
    if (department !== undefined) data.department = department;
    if (room !== undefined) data.room = room;
    if (notes !== undefined) data.notes = notes;
    if (status) data.status = status;
    if (completionNotes !== undefined) data.completionNotes = completionNotes;

    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data,
      include: appointmentInclude,
    });

    res.json(appt);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/appointments/:id ─────────────────────────────────────────────
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const existing = await prisma.appointment.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: 'Appointment not found' }); return; }

    // Only cancel (soft) rather than hard delete
    const appt = await prisma.appointment.update({
      where: { id: req.params.id },
      data: { status: 'cancelled' },
      include: appointmentInclude,
    });
    res.json(appt);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
