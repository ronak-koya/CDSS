import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/patients — search/list
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, limit = '20', offset = '0' } = req.query as Record<string, string>;
    const where = q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { mrn: { contains: q } },
            { email: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : {};

    const [patients, total] = await Promise.all([
      prisma.patient.findMany({
        where,
        take: parseInt(limit),
        skip: parseInt(offset),
        orderBy: { updatedAt: 'desc' },
        include: {
          _count: { select: { alerts: true, encounters: true } },
          vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
          alerts: { where: { status: 'active' }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
      prisma.patient.count({ where }),
    ]);

    res.json({ patients, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id — full patient profile
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const patient = await prisma.patient.findUnique({
      where: { id: req.params.id },
      include: {
        allergies: { orderBy: { createdAt: 'desc' } },
        medications: { orderBy: { createdAt: 'desc' } },
        vitals: { orderBy: { recordedAt: 'desc' }, take: 20 },
        labResults: { orderBy: { resultDate: 'desc' } },
        encounters: {
          orderBy: { startedAt: 'desc' },
          include: {
            doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
            diagnoses: true,
          },
        },
        diagnoses: { orderBy: { createdAt: 'desc' } },
        riskScores: { orderBy: { calculatedAt: 'desc' } },
        alerts: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }
    res.json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients — register new patient
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, dateOfBirth, gender, phone, email, address, bloodType, emergencyContactName, emergencyContactPhone, emergencyContactRel } = req.body;
    if (!firstName || !lastName || !dateOfBirth || !gender) {
      res.status(400).json({ error: 'firstName, lastName, dateOfBirth, gender are required' });
      return;
    }

    // Auto-generate MRN
    const count = await prisma.patient.count();
    const mrn = `MRN-${String(count + 1).padStart(3, '0')}`;

    const patient = await prisma.patient.create({
      data: { mrn, firstName, lastName, dateOfBirth, gender, phone, email, address, bloodType, emergencyContactName, emergencyContactPhone, emergencyContactRel },
    });
    res.status(201).json(patient);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/vitals
router.get('/:id/vitals', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const vitals = await prisma.vital.findMany({
      where: { patientId: req.params.id },
      orderBy: { recordedAt: 'desc' },
      take: 30,
    });
    res.json(vitals);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/labs
router.get('/:id/labs', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const labs = await prisma.labResult.findMany({
      where: { patientId: req.params.id },
      orderBy: { resultDate: 'desc' },
    });
    res.json(labs);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/alerts
router.get('/:id/alerts', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const alerts = await prisma.alert.findMany({
      where: { patientId: req.params.id },
      orderBy: { createdAt: 'desc' },
    });
    res.json(alerts);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/risk-scores
router.get('/:id/risk-scores', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const scores = await prisma.riskScore.findMany({
      where: { patientId: req.params.id },
      orderBy: { calculatedAt: 'desc' },
    });
    res.json(scores);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients/:id/vitals
router.post('/:id/vitals', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { systolicBP, diastolicBP, heartRate, temperature, spO2, respiratoryRate, weight, height, chiefComplaint, recordedAt } = req.body;
    const vital = await prisma.vital.create({
      data: {
        patientId: req.params.id,
        systolicBP: systolicBP ? Number(systolicBP) : null,
        diastolicBP: diastolicBP ? Number(diastolicBP) : null,
        heartRate: heartRate ? Number(heartRate) : null,
        temperature: temperature ? Number(temperature) : null,
        spO2: spO2 ? Number(spO2) : null,
        respiratoryRate: respiratoryRate ? Number(respiratoryRate) : null,
        weight: weight ? Number(weight) : null,
        height: height ? Number(height) : null,
        chiefComplaint: chiefComplaint || null,
        recordedBy: `${req.user!.firstName} ${req.user!.lastName}`,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
      },
    });
    res.status(201).json(vital);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients/:id/labs
router.post('/:id/labs', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { testName, value, unit, referenceRange, flag, resultDate } = req.body;
    if (!testName || !value) {
      res.status(400).json({ error: 'testName and value are required' });
      return;
    }
    const lab = await prisma.labResult.create({
      data: {
        patientId: req.params.id,
        testName,
        value,
        unit: unit || null,
        referenceRange: referenceRange || null,
        flag: flag || 'normal',
        resultDate: resultDate || new Date().toISOString().split('T')[0],
        orderedBy: `${req.user!.firstName} ${req.user!.lastName}`,
      },
    });
    res.status(201).json(lab);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients/:id/medications
router.post('/:id/medications', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, dosage, frequency, route, purpose, startDate } = req.body;
    if (!name || !dosage || !frequency) {
      res.status(400).json({ error: 'name, dosage, frequency are required' });
      return;
    }
    const med = await prisma.medication.create({
      data: {
        patientId: req.params.id,
        name,
        dosage,
        frequency,
        route: route || null,
        purpose: purpose || null,
        startDate: startDate || new Date().toISOString().split('T')[0],
        prescribedBy: `${req.user!.firstName} ${req.user!.lastName}`,
        status: 'active',
      },
    });
    res.status(201).json(med);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/patients/:id/medications/:medId
router.patch('/:id/medications/:medId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, endDate } = req.body;
    const med = await prisma.medication.update({
      where: { id: req.params.medId },
      data: {
        ...(status ? { status } : {}),
        ...(endDate ? { endDate: new Date(endDate).toISOString().split('T')[0] } : {}),
      },
    });
    res.json(med);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/patients/:id/medications/:medId
router.delete('/:id/medications/:medId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.medication.delete({ where: { id: req.params.medId } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients/:id/encounters — start a new encounter
router.post('/:id/encounters', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { chiefComplaint, doctorId } = req.body;
    const assignedDoctorId = doctorId || req.user!.id;
    const encounter = await prisma.encounter.create({
      data: {
        patientId: req.params.id,
        doctorId: assignedDoctorId,
        chiefComplaint: chiefComplaint || null,
        status: 'active',
        startedAt: new Date(),
      },
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        diagnoses: true,
      },
    });
    res.status(201).json(encounter);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/patients/:id/encounters/:encId — update SOAP notes / status
router.patch('/:id/encounters/:encId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, chiefComplaint, soapNotes } = req.body;
    const data: Record<string, unknown> = {};
    if (chiefComplaint !== undefined) data.chiefComplaint = chiefComplaint;
    if (soapNotes !== undefined) data.soapNotes = typeof soapNotes === 'string' ? soapNotes : JSON.stringify(soapNotes);
    if (status !== undefined) {
      data.status = status;
      if (status === 'completed' || status === 'discharged') data.endedAt = new Date();
    }
    const encounter = await prisma.encounter.update({
      where: { id: req.params.encId },
      data,
      include: {
        doctor: { select: { id: true, firstName: true, lastName: true, specialty: true } },
        diagnoses: true,
      },
    });
    res.json(encounter);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/patients/:id/encounters/:encId
router.delete('/:id/encounters/:encId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.encounter.delete({ where: { id: req.params.encId } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/patients/:id/doctors — list doctors for encounter assignment
router.get('/:id/doctors', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const doctors = await prisma.user.findMany({
      where: { role: 'DOCTOR' },
      select: { id: true, firstName: true, lastName: true, specialty: true },
      orderBy: { firstName: 'asc' },
    });
    res.json(doctors);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/patients/:id/allergies
router.post('/:id/allergies', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { allergen, type, severity, reaction } = req.body;
    if (!allergen || !type || !severity) {
      res.status(400).json({ error: 'allergen, type, severity are required' });
      return;
    }
    const allergy = await prisma.allergy.create({
      data: {
        patientId: req.params.id,
        allergen,
        type,
        severity,
        reaction: reaction || null,
      },
    });
    res.status(201).json(allergy);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/patients/:id/allergies/:allergyId
router.delete('/:id/allergies/:allergyId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await prisma.allergy.delete({ where: { id: req.params.allergyId } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
