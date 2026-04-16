import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router: ReturnType<typeof Router> = Router();
const prisma = new PrismaClient();

// All call routes require authentication
router.use(authenticate);

/** Generate a short-lived JWT room token for a specific call */
function generateRoomToken(callId: string, userId: string, role: string): string {
  return jwt.sign(
    { callId, userId, role },
    process.env.JWT_SECRET!,
    { expiresIn: '2h' }
  );
}

// ─── POST /api/calls/start — Doctor starts an instant call ───────────────────
router.post('/start', authorize('DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { patientId } = req.body as { patientId: string };
    if (!patientId) {
      res.status(400).json({ error: 'patientId is required' });
      return;
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Cancel any existing active call between this doctor and patient
    await prisma.videoCall.updateMany({
      where: { doctorId: req.user!.id, patientId, status: 'active' },
      data:  { status: 'cancelled' },
    });

    const call = await prisma.videoCall.create({
      data: {
        doctorId:  req.user!.id,
        patientId,
        status:    'active',
        startedAt: new Date(),
        roomToken: generateRoomToken('placeholder', req.user!.id, 'DOCTOR'),
      },
    });

    // Update roomToken now that we have the call id
    const roomToken = generateRoomToken(call.id, req.user!.id, 'DOCTOR');
    const updated = await prisma.videoCall.update({
      where: { id: call.id },
      data:  { roomToken },
    });

    res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/calls/schedule — Doctor schedules a future call ───────────────
router.post('/schedule', authorize('DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { patientId, scheduledAt } = req.body as { patientId: string; scheduledAt: string };
    if (!patientId || !scheduledAt) {
      res.status(400).json({ error: 'patientId and scheduledAt are required' });
      return;
    }

    const patient = await prisma.patient.findUnique({ where: { id: patientId } });
    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    const scheduled = new Date(scheduledAt);
    if (isNaN(scheduled.getTime()) || scheduled <= new Date()) {
      res.status(400).json({ error: 'scheduledAt must be a valid future date' });
      return;
    }

    const call = await prisma.videoCall.create({
      data: {
        doctorId:    req.user!.id,
        patientId,
        status:      'scheduled',
        scheduledAt: scheduled,
        roomToken:   generateRoomToken('placeholder', req.user!.id, 'DOCTOR'),
      },
    });

    const roomToken = generateRoomToken(call.id, req.user!.id, 'DOCTOR');
    const updated = await prisma.videoCall.update({
      where: { id: call.id },
      data:  { roomToken },
    });

    res.status(201).json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/calls — List calls for the current user ────────────────────────
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, id: userId, patientProfileId } = req.user!;
    const where =
      role === 'DOCTOR'
        ? { doctorId: userId }
        : patientProfileId
        ? { patientId: patientProfileId }
        : null;

    if (!where) {
      res.json([]);
      return;
    }

    const calls = await prisma.videoCall.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        doctor:  { select: { id: true, firstName: true, lastName: true, specialty: true } },
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    res.json(calls);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/calls/:id — Get call + issue a personal room token ─────────────
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const call = await prisma.videoCall.findUnique({
      where: { id: req.params.id },
      include: {
        doctor:  { select: { id: true, firstName: true, lastName: true, specialty: true } },
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });

    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }

    const { id: userId, role, patientProfileId } = req.user!;

    // Only the doctor or the linked patient may access
    const isDoctor  = role === 'DOCTOR' && call.doctorId === userId;
    const isPatient = patientProfileId === call.patientId;

    if (!isDoctor && !isPatient) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    // Issue a fresh personal token so the caller's identity is embedded
    const personalToken = generateRoomToken(call.id, userId, role);

    res.json({ ...call, personalToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/calls/:id/end — End call + save notes ────────────────────────
router.patch('/:id/end', authorize('DOCTOR'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const call = await prisma.videoCall.findUnique({ where: { id: req.params.id } });
    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }
    if (call.doctorId !== req.user!.id) { res.status(403).json({ error: 'Access denied' }); return; }

    const endedAt  = new Date();
    const duration = call.startedAt
      ? Math.round((endedAt.getTime() - call.startedAt.getTime()) / 1000)
      : null;

    const updated = await prisma.videoCall.update({
      where: { id: call.id },
      data: {
        status:    'completed',
        endedAt,
        duration:  duration ?? undefined,
        callNotes: req.body.callNotes ?? null,
        startedAt: call.startedAt ?? endedAt,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PATCH /api/calls/:id/activate — Mark scheduled call as active ───────────
router.patch('/:id/activate', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const call = await prisma.videoCall.findUnique({ where: { id: req.params.id } });
    if (!call) { res.status(404).json({ error: 'Call not found' }); return; }

    const { id: userId, role, patientProfileId } = req.user!;
    const isDoctor  = role === 'DOCTOR' && call.doctorId === userId;
    const isPatient = patientProfileId === call.patientId;
    if (!isDoctor && !isPatient) { res.status(403).json({ error: 'Access denied' }); return; }

    if (call.status !== 'scheduled') {
      res.status(400).json({ error: 'Only scheduled calls can be activated' });
      return;
    }

    const updated = await prisma.videoCall.update({
      where: { id: call.id },
      data: { status: 'active', startedAt: new Date() },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
