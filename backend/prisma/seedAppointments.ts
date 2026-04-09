import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function localDate(yr: number, mo: number, dy: number, hr: number, min: number) {
  return new Date(yr, mo - 1, dy, hr, min, 0, 0);
}

async function main() {
  const doctor = await prisma.user.findUnique({ where: { email: 'dr.smith@cdss.com' } });
  if (!doctor) { console.error('❌ Dr. Smith not found'); return; }

  const createdBy = await prisma.user.findUnique({ where: { email: 'nurse.jones@cdss.com' } });
  if (!createdBy) { console.error('❌ Nurse not found'); return; }

  const patients = await prisma.patient.findMany({ orderBy: { mrn: 'asc' } });
  if (patients.length < 6) { console.error('❌ Expected at least 6 patients'); return; }

  const [p1, p2, p3, p4, p5, p6] = patients;

  // Today = 2026-03-20
  const Y = 2026, M = 3;

  const appointments = [
    // ── Yesterday (Mar 19) — completed visits ─────────────────────────────────
    {
      patientId: p1.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Hypertension & Diabetes Follow-up',
      type: 'follow_up', status: 'completed',
      scheduledAt: localDate(Y, M, 19, 9, 0),
      duration: 30, department: 'Internal Medicine', room: 'Room 101',
      notes: 'Check BP trends and HbA1c results.',
      completionNotes: 'BP improved to 145/90. HbA1c trending down to 7.8%. Increased Amlodipine to 10mg. Diet counselling provided.',
    },
    {
      patientId: p2.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Asthma Review & Spirometry',
      type: 'follow_up', status: 'completed',
      scheduledAt: localDate(Y, M, 19, 10, 0),
      duration: 45, department: 'Internal Medicine', room: 'Room 102',
      notes: 'Post-exacerbation follow-up. Review inhaler technique.',
      completionNotes: 'Peak flow improved to 380 L/min. SpO2 98%. Inhaler technique corrected. Continue current regimen.',
    },
    {
      patientId: p5.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'COPD Management Review',
      type: 'consultation', status: 'completed',
      scheduledAt: localDate(Y, M, 19, 11, 0),
      duration: 30, department: 'Internal Medicine', room: 'Room 101',
      notes: 'Review recent ABG results and O2 therapy.',
      completionNotes: 'Discussed long-term O2 therapy. Adjusted Tiotropium dose. Referred to pulmonology for CPAP evaluation.',
    },
    {
      patientId: p3.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'CHF Acute Decompensation Assessment',
      type: 'emergency', status: 'completed',
      scheduledAt: localDate(Y, M, 19, 14, 0),
      duration: 60, department: 'Cardiology', room: 'Room 205',
      notes: 'Worsening oedema and dyspnoea. BNP critical.',
      completionNotes: 'IV Furosemide administered. Weight reduced 2.1kg. BNP trending down. Admitted for observation.',
    },

    // ── Today (Mar 20) — mix of scheduled, in-progress, completed ─────────────
    {
      patientId: p4.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Chest Pain Evaluation',
      type: 'emergency', status: 'completed',
      scheduledAt: localDate(Y, M, 20, 8, 0),
      duration: 60, department: 'Emergency', room: 'Room ER-3',
      notes: 'Acute chest pain, elevated troponin. Rule out ACS.',
      completionNotes: 'ECG showed ST changes. Cardiology consulted. Patient transferred for urgent PCI.',
    },
    {
      patientId: p1.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Medication Adjustment Consult',
      type: 'consultation', status: 'completed',
      scheduledAt: localDate(Y, M, 20, 9, 30),
      duration: 30, department: 'Internal Medicine', room: 'Room 101',
      notes: 'Review response to increased Amlodipine dose.',
      completionNotes: 'BP 138/86 — improved. Patient tolerating medication well. No side effects reported.',
    },
    {
      patientId: p6.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'New Patient — General Health Checkup',
      type: 'checkup', status: 'in_progress',
      scheduledAt: localDate(Y, M, 20, 11, 0),
      duration: 45, department: 'Internal Medicine', room: 'Room 103',
      notes: 'First visit. Complete physical exam, baseline labs ordered.',
    },
    {
      patientId: p2.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Allergy Panel Results Review',
      type: 'follow_up', status: 'scheduled',
      scheduledAt: localDate(Y, M, 20, 13, 0),
      duration: 30, department: 'Internal Medicine', room: 'Room 102',
      notes: 'Discuss IgE results and consider biologic therapy (Dupilumab).',
    },
    {
      patientId: p3.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Post-Admission CHF Follow-up',
      type: 'follow_up', status: 'scheduled',
      scheduledAt: localDate(Y, M, 20, 14, 30),
      duration: 45, department: 'Cardiology', room: 'Room 205',
      notes: 'Reassess fluid status and BNP after IV diuresis.',
    },
    {
      patientId: p5.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'COPD Exacerbation Urgent Visit',
      type: 'emergency', status: 'scheduled',
      scheduledAt: localDate(Y, M, 20, 16, 0),
      duration: 60, department: 'Internal Medicine', room: 'Room ER-1',
      notes: 'Patient called with worsening dyspnoea and increased sputum production.',
    },

    // ── Tomorrow (Mar 21) — all scheduled ─────────────────────────────────────
    {
      patientId: p4.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Post-PCI Recovery Follow-up',
      type: 'follow_up', status: 'scheduled',
      scheduledAt: localDate(Y, M, 21, 9, 0),
      duration: 30, department: 'Cardiology', room: 'Room 205',
      notes: 'Check troponin trend and ECG post-intervention.',
    },
    {
      patientId: p1.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Diabetes Educator Referral Debrief',
      type: 'follow_up', status: 'scheduled',
      scheduledAt: localDate(Y, M, 21, 10, 30),
      duration: 30, department: 'Internal Medicine', room: 'Room 101',
      notes: 'Review dietary log and glucose diary from past week.',
    },
    {
      patientId: p6.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Baseline Labs Review',
      type: 'follow_up', status: 'scheduled',
      scheduledAt: localDate(Y, M, 21, 12, 0),
      duration: 30, department: 'Internal Medicine', room: 'Room 103',
      notes: 'Discuss CBC, lipid panel, thyroid function results.',
    },
    {
      patientId: p3.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Cardiology Co-management — CHF',
      type: 'procedure', status: 'scheduled',
      scheduledAt: localDate(Y, M, 21, 14, 0),
      duration: 60, department: 'Cardiology', room: 'Room 206',
      notes: 'Echo scheduled. Review EF and wall motion. Consider device therapy.',
    },

    // ── Next week (Mar 25) ────────────────────────────────────────────────────
    {
      patientId: p2.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Biologic Therapy Initiation',
      type: 'procedure', status: 'scheduled',
      scheduledAt: localDate(Y, M, 25, 10, 0),
      duration: 60, department: 'Internal Medicine', room: 'Room 104',
      notes: 'First dose of Dupilumab if approved by insurance. Observation for 30 min post-injection.',
    },
    {
      patientId: p5.id, doctorId: doctor.id, createdById: createdBy.id,
      title: 'Pulmonology Co-consultation',
      type: 'consultation', status: 'scheduled',
      scheduledAt: localDate(Y, M, 25, 13, 30),
      duration: 45, department: 'Internal Medicine', room: 'Room 101',
      notes: 'Multidisciplinary case review with Dr. Pulm.',
    },
  ];

  let created = 0;
  for (const appt of appointments) {
    await prisma.appointment.create({ data: appt });
    created++;
  }

  console.log(`✅ Created ${created} appointments for Dr. Sarah Smith`);
}

main()
  .catch((e) => { console.error('❌ Failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
