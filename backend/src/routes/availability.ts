import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

function doctorOnly(req: AuthRequest, res: Response): boolean {
  if (req.user!.role !== 'DOCTOR') {
    res.status(403).json({ error: 'Only doctors can manage availability' });
    return false;
  }
  return true;
}

// ─── GET /api/availability ────────────────────────────────────────────────────
// Returns the calling doctor's availability (or a specific doctor's via ?doctorId=)
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctorId = (req.query.doctorId as string) ?? (req.user!.role === 'DOCTOR' ? req.user!.id : null);
    if (!doctorId) {
      res.status(400).json({ error: 'doctorId required' });
      return;
    }

    const avail = await prisma.doctorAvailability.findUnique({ where: { doctorId } });
    res.json(avail ?? null);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── PUT /api/availability ────────────────────────────────────────────────────
// Upsert weekly schedule + slot duration for the calling doctor
router.put('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!doctorOnly(req, res)) return;
  try {
    const { schedule, slotDuration } = req.body;
    if (!schedule) {
      res.status(400).json({ error: 'schedule is required' });
      return;
    }

    const avail = await prisma.doctorAvailability.upsert({
      where: { doctorId: req.user!.id },
      update: {
        schedule: typeof schedule === 'string' ? schedule : JSON.stringify(schedule),
        slotDuration: slotDuration ?? 20,
      },
      create: {
        doctorId: req.user!.id,
        schedule: typeof schedule === 'string' ? schedule : JSON.stringify(schedule),
        slotDuration: slotDuration ?? 20,
      },
    });
    res.json(avail);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/availability/blocks ─────────────────────────────────────────────
router.get('/blocks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctorId = (req.query.doctorId as string) ?? (req.user!.role === 'DOCTOR' ? req.user!.id : null);
    if (!doctorId) {
      res.status(400).json({ error: 'doctorId required' });
      return;
    }

    const blocks = await prisma.doctorBlock.findMany({
      where: { doctorId },
      orderBy: { date: 'asc' },
    });
    res.json(blocks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/availability/blocks ────────────────────────────────────────────
router.post('/blocks', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!doctorOnly(req, res)) return;
  try {
    const { date, reason, note } = req.body;
    if (!date) {
      res.status(400).json({ error: 'date is required' });
      return;
    }

    // Prevent duplicate blocks for same date
    const existing = await prisma.doctorBlock.findFirst({
      where: { doctorId: req.user!.id, date },
    });
    if (existing) {
      res.status(409).json({ error: 'A block already exists for this date' });
      return;
    }

    const block = await prisma.doctorBlock.create({
      data: { doctorId: req.user!.id, date, reason: reason ?? null, note: note ?? null },
    });
    res.status(201).json(block);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/availability/blocks/:id ─────────────────────────────────────
router.delete('/blocks/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  if (!doctorOnly(req, res)) return;
  try {
    const block = await prisma.doctorBlock.findUnique({ where: { id: req.params.id } });
    if (!block) { res.status(404).json({ error: 'Block not found' }); return; }
    if (block.doctorId !== req.user!.id) { res.status(403).json({ error: 'Forbidden' }); return; }

    await prisma.doctorBlock.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
