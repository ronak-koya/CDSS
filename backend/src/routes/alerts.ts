import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/alerts
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, severity, limit = '50' } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (severity) where.severity = severity;

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
      take: parseInt(limit),
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, mrn: true } },
      },
    });
    res.json(alerts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/alerts/stats
router.get('/stats', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [total, active, critical, high] = await Promise.all([
      prisma.alert.count(),
      prisma.alert.count({ where: { status: 'active' } }),
      prisma.alert.count({ where: { severity: 'critical', status: { not: 'resolved' } } }),
      prisma.alert.count({ where: { severity: 'high', status: { not: 'resolved' } } }),
    ]);
    res.json({ total, active, critical, high });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status: 'acknowledged', acknowledgedAt: new Date() },
    });
    res.json(alert);
  } catch {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// PATCH /api/alerts/:id/escalate
router.patch('/:id/escalate', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status: 'escalated', escalatedAt: new Date() },
    });
    res.json(alert);
  } catch {
    res.status(404).json({ error: 'Alert not found' });
  }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alert = await prisma.alert.update({
      where: { id: req.params.id },
      data: { status: 'resolved', resolvedAt: new Date() },
    });
    res.json(alert);
  } catch {
    res.status(404).json({ error: 'Alert not found' });
  }
});

export default router;
