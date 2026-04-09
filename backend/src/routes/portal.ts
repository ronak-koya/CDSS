import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Guard: must be PATIENT with a linked patientProfileId
function patientOnly(req: AuthRequest, res: Response): string | null {
  if (req.user?.role !== 'PATIENT' || !req.user?.patientProfileId) {
    res.status(403).json({ error: 'Patient access only' });
    return null;
  }
  return req.user.patientProfileId;
}

// GET /api/portal/summary — dashboard stats
router.get('/summary', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = patientOnly(req, res);
  if (!patientId) return;

  try {
    const now = new Date();

    // Next upcoming appointment
    const nextAppointment = await prisma.appointment.findFirst({
      where: {
        patientId,
        status: { in: ['scheduled', 'confirmed'] },
        scheduledAt: { gte: now },
      },
      orderBy: { scheduledAt: 'asc' },
      include: { doctor: { select: { firstName: true, lastName: true, specialty: true } } },
    });

    // Active medications count
    const activeMedCount = await prisma.medication.count({
      where: { patientId, status: 'active' },
    });

    // Recent lab results (last 30 days)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const recentLabCount = await prisma.labResult.count({
      where: {
        patientId,
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    res.json({
      nextAppointment: nextAppointment
        ? {
            doctor: `Dr. ${nextAppointment.doctor.firstName} ${nextAppointment.doctor.lastName}`,
            specialty: nextAppointment.doctor.specialty,
            scheduledAt: nextAppointment.scheduledAt,
            department: nextAppointment.department,
            status: nextAppointment.status,
          }
        : null,
      activeMedCount,
      recentLabCount,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load summary' });
  }
});

// GET /api/portal/appointments — all appointments (upcoming + past)
router.get('/appointments', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = patientOnly(req, res);
  if (!patientId) return;

  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId },
      orderBy: { scheduledAt: 'desc' },
      include: {
        doctor: { select: { firstName: true, lastName: true, specialty: true } },
      },
    });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load appointments' });
  }
});

// GET /api/portal/medications — active medications
router.get('/medications', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = patientOnly(req, res);
  if (!patientId) return;

  try {
    const medications = await prisma.medication.findMany({
      where: { patientId, status: 'active' },
      orderBy: { createdAt: 'desc' },
    });
    res.json(medications);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load medications' });
  }
});

// GET /api/portal/results — lab results
router.get('/results', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = patientOnly(req, res);
  if (!patientId) return;

  try {
    const results = await prisma.labResult.findMany({
      where: { patientId },
      orderBy: { createdAt: 'desc' },
    });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load lab results' });
  }
});

// GET /api/portal/profile — patient profile + allergies
router.get('/profile', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = patientOnly(req, res);
  if (!patientId) return;

  try {
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: { allergies: true },
    });
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.json(patient);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load profile' });
  }
});

// POST /api/portal/change-password
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  const patientId = patientOnly(req, res);
  if (!patientId) return;

  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: 'Current and new password are required' });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ error: 'New password must be at least 8 characters' });
    return;
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const valid = await bcrypt.compare(currentPassword, user.password);
    if (!valid) {
      res.status(400).json({ error: 'Current password is incorrect' });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
