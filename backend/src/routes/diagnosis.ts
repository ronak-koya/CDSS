import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { analyzeSymptoms, PatientContext, SymptomInput } from '../services/claude';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const router: any = Router();
const prisma = new PrismaClient();

// POST /api/diagnosis/analyze
router.post('/analyze', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { patientId, symptoms } = req.body as { patientId: string; symptoms: SymptomInput[] };
    if (!patientId || !symptoms?.length) {
      res.status(400).json({ error: 'patientId and symptoms[] are required' });
      return;
    }

    // Fetch patient context
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        medications: { where: { status: 'active' } },
        allergies: true,
        vitals: { orderBy: { recordedAt: 'desc' }, take: 1 },
        labResults: { orderBy: { resultDate: 'desc' }, take: 10 },
        diagnoses: { where: { status: 'confirmed' }, orderBy: { createdAt: 'desc' }, take: 5 },
        riskScores: { orderBy: { calculatedAt: 'desc' }, take: 5 },
      },
    });

    if (!patient) {
      res.status(404).json({ error: 'Patient not found' });
      return;
    }

    // Calculate age
    const dob = new Date(patient.dateOfBirth);
    const age = Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 3600 * 1000));

    const latestVital = patient.vitals[0] ?? null;
    const vitalsData = latestVital
      ? {
          'BP': latestVital.systolicBP && latestVital.diastolicBP ? `${latestVital.systolicBP}/${latestVital.diastolicBP} mmHg` : undefined,
          'HR': latestVital.heartRate ? `${latestVital.heartRate} bpm` : undefined,
          'Temp': latestVital.temperature ? `${latestVital.temperature}°C` : undefined,
          'SpO2': latestVital.spO2 ? `${latestVital.spO2}%` : undefined,
          'RR': latestVital.respiratoryRate ? `${latestVital.respiratoryRate}/min` : undefined,
          'Weight': latestVital.weight ? `${latestVital.weight} kg` : undefined,
        }
      : null;

    const context: PatientContext = {
      age,
      gender: patient.gender,
      medications: patient.medications.map((m) => `${m.name} ${m.dosage} ${m.frequency}`),
      allergies: patient.allergies.map((a) => `${a.allergen} (${a.type}, ${a.severity})`),
      latestVitals: vitalsData,
      recentLabs: patient.labResults.map((l) => ({
        name: l.testName,
        value: l.value,
        unit: l.unit ?? '',
        flag: l.flag ?? 'normal',
      })),
      diagnoses: patient.diagnoses.map((d) => d.name),
      riskScores: patient.riskScores.map((r) => ({ type: r.type, level: r.level, score: r.score })),
    };

    const analysis = await analyzeSymptoms(context, symptoms);
    res.json({ analysis, patientContext: { age, gender: patient.gender } });
  } catch (err) {
    console.error('Diagnosis analysis error:', err);
    // Return mock data if Claude API is not configured
    res.json({
      analysis: {
        diagnoses: [
          {
            name: 'Assessment Pending',
            icdCode: 'Z03.89',
            confidence: 0.5,
            severity: 'moderate',
            reasoning: 'AI analysis unavailable — please configure ANTHROPIC_API_KEY in .env. This is a placeholder response.',
            supportingEvidence: ['Configure Claude API key to enable real AI analysis'],
            recommendedTests: ['Complete history and physical examination'],
            urgency: 'routine',
          },
        ],
        clinicalNotes: 'Configure ANTHROPIC_API_KEY in backend/.env to enable AI-powered diagnosis.',
        redFlags: [],
      },
      patientContext: {},
    });
  }
});

// POST /api/diagnosis/save
router.post('/save', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { patientId, encounterId, diagnoses, symptoms, clinicalNotes, redFlags } = req.body;
    if (!patientId || !diagnoses?.length) {
      res.status(400).json({ error: 'patientId and diagnoses[] are required' });
      return;
    }

    // Create a session to group these diagnoses together
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = await (prisma as any).diagnosisSession.create({
      data: {
        patientId,
        symptoms: JSON.stringify(symptoms ?? []),
        clinicalNotes: clinicalNotes ?? null,
        redFlags: redFlags?.length ? JSON.stringify(redFlags) : null,
      },
    });

    const saved = await prisma.$transaction(
      diagnoses.map((d: { name: string; icdCode?: string; confidence?: number; severity?: string; status: string; reasoning?: string; evidence?: string[] }) =>
        prisma.diagnosis.create({
          data: {
            patientId,
            encounterId: encounterId ?? null,
            sessionId: session.id,
            name: d.name,
            icdCode: d.icdCode ?? null,
            confidence: d.confidence ?? null,
            severity: d.severity ?? null,
            status: d.status,
            reasoning: d.reasoning ?? null,
            evidence: d.evidence ? JSON.stringify(d.evidence) : null,
          },
        })
      )
    );
    res.status(201).json({ session, diagnoses: saved });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/diagnosis/sessions/:patientId
router.get('/sessions/:patientId', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sessions = await (prisma as any).diagnosisSession.findMany({
      where: { patientId: req.params.patientId },
      orderBy: { createdAt: 'desc' },
      include: {
        diagnoses: { orderBy: { confidence: 'desc' } },
      },
    });
    res.json(sessions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/diagnosis/drugs/interactions?drug1=X&drug2=Y
router.get('/drugs/interactions', authenticate, async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { drug1, drug2 } = _req.query as Record<string, string>;
    if (!drug1) {
      const all = await prisma.drugInteraction.findMany({ orderBy: { severity: 'asc' } });
      res.json(all);
      return;
    }

    const interaction = await prisma.drugInteraction.findFirst({
      where: {
        OR: [
          { drug1: { contains: drug1 }, drug2: drug2 ? { contains: drug2 } : undefined },
          { drug1: drug2 ? { contains: drug2 } : undefined, drug2: { contains: drug1 } },
        ],
      },
    });
    res.json(interaction ?? null);
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
