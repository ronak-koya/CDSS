import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding CDSS database...');

  // ── Users ────────────────────────────────────────────────────────────────
  const hashedPw = await bcrypt.hash('Password123!', 10);

  const doctor = await prisma.user.upsert({
    where: { email: 'dr.smith@cdss.com' },
    update: {},
    create: {
      email: 'dr.smith@cdss.com',
      password: hashedPw,
      role: 'DOCTOR',
      firstName: 'Sarah',
      lastName: 'Smith',
      specialty: 'Internal Medicine',
    },
  });

  const nurse = await prisma.user.upsert({
    where: { email: 'nurse.jones@cdss.com' },
    update: {},
    create: {
      email: 'nurse.jones@cdss.com',
      password: hashedPw,
      role: 'NURSE',
      firstName: 'John',
      lastName: 'Jones',
    },
  });

  await prisma.user.upsert({
    where: { email: 'admin@cdss.com' },
    update: {},
    create: {
      email: 'admin@cdss.com',
      password: hashedPw,
      role: 'ADMIN',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  // ── Drug Interactions ─────────────────────────────────────────────────────
  const interactions = [
    { drug1: 'Warfarin', drug2: 'Aspirin', severity: 'critical', description: 'Concurrent use significantly increases risk of major bleeding events including intracranial hemorrhage.', mechanism: 'Aspirin inhibits platelet aggregation while Warfarin inhibits clotting factor synthesis, creating a synergistic anticoagulant effect.', alternatives: '["Acetaminophen for analgesia", "Clopidogrel if antiplatelet therapy is required with close monitoring"]' },
    { drug1: 'Warfarin', drug2: 'Ibuprofen', severity: 'critical', description: 'NSAIDs increase anticoagulant effect and can cause GI bleeding.', mechanism: 'NSAIDs inhibit COX-1, reducing thromboxane-mediated platelet aggregation and can cause GI mucosal damage.', alternatives: '["Acetaminophen for pain relief", "Topical NSAIDs if systemic exposure is a concern"]' },
    { drug1: 'Simvastatin', drug2: 'Amiodarone', severity: 'major', description: 'Increased risk of myopathy and rhabdomyolysis.', mechanism: 'Amiodarone inhibits CYP3A4, increasing simvastatin plasma concentrations.', alternatives: '["Pravastatin (not metabolized by CYP3A4)", "Rosuvastatin at reduced dose"]' },
    { drug1: 'Metformin', drug2: 'Contrast Dye', severity: 'major', description: 'Risk of contrast-induced nephropathy leading to metformin accumulation and lactic acidosis.', mechanism: 'Iodinated contrast can impair renal function; metformin is renally cleared and accumulates in renal insufficiency.', alternatives: '["Hold metformin 48 hours before and after contrast administration", "Monitor renal function before restarting"]' },
    { drug1: 'Lisinopril', drug2: 'Potassium', severity: 'major', description: 'ACE inhibitors reduce aldosterone production, causing potassium retention. Supplemental potassium can cause dangerous hyperkalemia.', mechanism: 'ACE inhibition decreases angiotensin II → decreased aldosterone → decreased renal potassium excretion.', alternatives: '["Monitor serum potassium closely", "Reduce or eliminate potassium supplementation"]' },
    { drug1: 'Clopidogrel', drug2: 'Omeprazole', severity: 'major', description: 'Omeprazole inhibits CYP2C19 reducing conversion of clopidogrel to its active metabolite, decreasing antiplatelet effect.', mechanism: 'Clopidogrel is a prodrug requiring CYP2C19 activation; omeprazole is a potent CYP2C19 inhibitor.', alternatives: '["Pantoprazole (weaker CYP2C19 inhibition)", "Famotidine (H2 blocker, no CYP2C19 interaction)"]' },
    { drug1: 'Ciprofloxacin', drug2: 'Warfarin', severity: 'major', description: 'Fluoroquinolones potentiate the anticoagulant effect of warfarin, increasing bleeding risk.', mechanism: 'Ciprofloxacin inhibits CYP1A2 and reduces vitamin K-producing gut flora, both increasing warfarin effect.', alternatives: '["Use alternative antibiotic if possible", "Reduce warfarin dose and monitor INR closely"]' },
    { drug1: 'Digoxin', drug2: 'Amiodarone', severity: 'major', description: 'Amiodarone increases digoxin plasma levels, leading to toxicity.', mechanism: 'Amiodarone inhibits P-glycoprotein and reduces renal/non-renal clearance of digoxin.', alternatives: '["Reduce digoxin dose by 30-50% when starting amiodarone", "Monitor digoxin levels and symptoms of toxicity"]' },
    { drug1: 'Methotrexate', drug2: 'Ibuprofen', severity: 'major', description: 'NSAIDs reduce renal clearance of methotrexate, causing toxic accumulation.', mechanism: 'NSAIDs inhibit prostaglandin synthesis in the kidney, reducing renal blood flow and methotrexate clearance.', alternatives: '["Acetaminophen for pain management", "If NSAIDs essential, reduce methotrexate dose and monitor CBC/renal function"]' },
    { drug1: 'Fluoxetine', drug2: 'Tramadol', severity: 'major', description: 'Increased risk of serotonin syndrome and seizures.', mechanism: 'Both increase serotonergic transmission; tramadol also inhibits serotonin reuptake.', alternatives: '["Codeine or non-opioid analgesics", "If opioid required, morphine or oxycodone have less serotonergic activity"]' },
    { drug1: 'Atorvastatin', drug2: 'Clarithromycin', severity: 'major', description: 'Clarithromycin markedly increases atorvastatin exposure, raising risk of myopathy and rhabdomyolysis.', mechanism: 'Clarithromycin is a strong CYP3A4 inhibitor; atorvastatin is a CYP3A4 substrate.', alternatives: '["Azithromycin (no significant CYP3A4 inhibition)", "Temporarily discontinue atorvastatin during antibiotic course"]' },
    { drug1: 'Sildenafil', drug2: 'Nitrates', severity: 'critical', description: 'Severe and potentially fatal hypotension.', mechanism: 'Both increase cGMP levels through different mechanisms, causing profound vasodilation.', alternatives: '["Avoid combination entirely", "If nitrate required for angina, sildenafil is absolutely contraindicated"]' },
    { drug1: 'Spironolactone', drug2: 'ACE Inhibitor', severity: 'major', description: 'Combination significantly increases risk of life-threatening hyperkalemia.', mechanism: 'Both drugs reduce renal potassium excretion through different mechanisms (aldosterone blockade vs decreased aldosterone production).', alternatives: '["Monitor potassium levels every 1-2 weeks initially", "Consider lower doses of each drug"]' },
    { drug1: 'Azithromycin', drug2: 'Hydroxychloroquine', severity: 'major', description: 'Additive QT prolongation with increased risk of ventricular arrhythmias including Torsades de Pointes.', mechanism: 'Both drugs block cardiac hERG potassium channels, prolonging the QT interval.', alternatives: '["Alternative antibiotic without QT prolongation risk", "Doxycycline as alternative"]' },
    { drug1: 'Amlodipine', drug2: 'Simvastatin', severity: 'minor', description: 'Amlodipine can increase simvastatin exposure, slightly increasing myopathy risk.', mechanism: 'Amlodipine weakly inhibits CYP3A4.', alternatives: '["Limit simvastatin dose to 20mg daily when combined with amlodipine", "Consider rosuvastatin or pravastatin"]' },
  ];

  for (const interaction of interactions) {
    await prisma.drugInteraction.create({ data: interaction });
  }
  console.log(`✅ Created ${interactions.length} drug interactions`);

  // ── Patients ──────────────────────────────────────────────────────────────
  const p1 = await prisma.patient.create({
    data: {
      mrn: 'MRN-001',
      firstName: 'Robert',
      lastName: 'Johnson',
      dateOfBirth: '1966-03-15',
      gender: 'Male',
      phone: '(555) 234-5678',
      email: 'rjohnson@email.com',
      address: '123 Oak Street, Springfield, IL 62701',
      bloodType: 'A+',
      emergencyContactName: 'Mary Johnson',
      emergencyContactPhone: '(555) 234-5679',
      emergencyContactRel: 'Spouse',
    },
  });

  const p2 = await prisma.patient.create({
    data: {
      mrn: 'MRN-002',
      firstName: 'Emily',
      lastName: 'Chen',
      dateOfBirth: '1979-07-22',
      gender: 'Female',
      phone: '(555) 345-6789',
      email: 'echen@email.com',
      address: '456 Maple Ave, Chicago, IL 60601',
      bloodType: 'O+',
      emergencyContactName: 'David Chen',
      emergencyContactPhone: '(555) 345-6780',
      emergencyContactRel: 'Husband',
    },
  });

  const p3 = await prisma.patient.create({
    data: {
      mrn: 'MRN-003',
      firstName: 'Michael',
      lastName: 'Davis',
      dateOfBirth: '1952-11-08',
      gender: 'Male',
      phone: '(555) 456-7890',
      email: 'mdavis@email.com',
      address: '789 Pine Road, Peoria, IL 61602',
      bloodType: 'B+',
      emergencyContactName: 'Linda Davis',
      emergencyContactPhone: '(555) 456-7891',
      emergencyContactRel: 'Daughter',
    },
  });

  const p4 = await prisma.patient.create({
    data: {
      mrn: 'MRN-004',
      firstName: 'Sarah',
      lastName: 'Williams',
      dateOfBirth: '1989-05-30',
      gender: 'Female',
      phone: '(555) 567-8901',
      email: 'swilliams@email.com',
      address: '321 Elm Street, Rockford, IL 61101',
      bloodType: 'AB-',
      emergencyContactName: 'Tom Williams',
      emergencyContactPhone: '(555) 567-8902',
      emergencyContactRel: 'Father',
    },
  });

  const p5 = await prisma.patient.create({
    data: {
      mrn: 'MRN-005',
      firstName: 'James',
      lastName: 'Wilson',
      dateOfBirth: '1959-09-12',
      gender: 'Male',
      phone: '(555) 678-9012',
      email: 'jwilson@email.com',
      address: '654 Cedar Lane, Aurora, IL 60505',
      bloodType: 'O-',
      emergencyContactName: 'Betty Wilson',
      emergencyContactPhone: '(555) 678-9013',
      emergencyContactRel: 'Wife',
    },
  });

  const p6 = await prisma.patient.create({
    data: {
      mrn: 'MRN-006',
      firstName: 'Maria',
      lastName: 'Garcia',
      dateOfBirth: '1995-02-14',
      gender: 'Female',
      phone: '(555) 789-0123',
      email: 'mgarcia@email.com',
      address: '987 Birch Blvd, Naperville, IL 60540',
      bloodType: 'A-',
      emergencyContactName: 'Carlos Garcia',
      emergencyContactPhone: '(555) 789-0124',
      emergencyContactRel: 'Brother',
    },
  });

  console.log('✅ Created 6 patients');

  // ── Allergies ─────────────────────────────────────────────────────────────
  await prisma.allergy.createMany({
    data: [
      { patientId: p1.id, allergen: 'Penicillin', type: 'drug', severity: 'severe', reaction: 'Anaphylaxis — throat swelling, hypotension' },
      { patientId: p1.id, allergen: 'Sulfa drugs', type: 'drug', severity: 'moderate', reaction: 'Rash, urticaria' },
      { patientId: p1.id, allergen: 'Shellfish', type: 'food', severity: 'moderate', reaction: 'Hives, GI upset' },
      { patientId: p2.id, allergen: 'Aspirin', type: 'drug', severity: 'moderate', reaction: 'Bronchospasm, urticaria' },
      { patientId: p2.id, allergen: 'Latex', type: 'environmental', severity: 'mild', reaction: 'Contact dermatitis' },
      { patientId: p3.id, allergen: 'Codeine', type: 'drug', severity: 'moderate', reaction: 'Severe nausea, vomiting' },
      { patientId: p3.id, allergen: 'Iodine/Contrast', type: 'drug', severity: 'severe', reaction: 'Anaphylactoid reaction' },
      { patientId: p4.id, allergen: 'Amoxicillin', type: 'drug', severity: 'mild', reaction: 'Rash' },
      { patientId: p5.id, allergen: 'NSAIDs', type: 'drug', severity: 'moderate', reaction: 'Exacerbation of asthma/COPD' },
      { patientId: p6.id, allergen: 'Peanuts', type: 'food', severity: 'severe', reaction: 'Anaphylaxis' },
      { patientId: p6.id, allergen: 'Tree nuts', type: 'food', severity: 'severe', reaction: 'Anaphylaxis' },
    ],
  });
  console.log('✅ Created allergies');

  // ── Medications ───────────────────────────────────────────────────────────
  await prisma.medication.createMany({
    data: [
      // Robert Johnson - HTN, DM2
      { patientId: p1.id, name: 'Metformin', dosage: '1000mg', frequency: 'Twice daily', route: 'Oral', prescribedBy: 'Dr. Smith', startDate: '2022-01-10', status: 'active' },
      { patientId: p1.id, name: 'Lisinopril', dosage: '10mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Smith', startDate: '2021-06-15', status: 'active' },
      { patientId: p1.id, name: 'Atorvastatin', dosage: '40mg', frequency: 'Once daily at bedtime', route: 'Oral', prescribedBy: 'Dr. Smith', startDate: '2021-06-15', status: 'active' },
      { patientId: p1.id, name: 'Amlodipine', dosage: '5mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Smith', startDate: '2022-03-01', status: 'active' },
      // Emily Chen - Asthma
      { patientId: p2.id, name: 'Albuterol Inhaler', dosage: '90mcg/puff', frequency: 'As needed (max 4x/day)', route: 'Inhaled', prescribedBy: 'Dr. Brown', startDate: '2019-08-20', status: 'active' },
      { patientId: p2.id, name: 'Fluticasone Inhaler', dosage: '250mcg/puff', frequency: 'Twice daily', route: 'Inhaled', prescribedBy: 'Dr. Brown', startDate: '2019-08-20', status: 'active' },
      { patientId: p2.id, name: 'Montelukast', dosage: '10mg', frequency: 'Once daily at bedtime', route: 'Oral', prescribedBy: 'Dr. Brown', startDate: '2020-02-01', status: 'active' },
      { patientId: p2.id, name: 'Loratadine', dosage: '10mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Brown', startDate: '2020-04-15', status: 'active' },
      // Michael Davis - Cardiac, CHF
      { patientId: p3.id, name: 'Warfarin', dosage: '5mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Cardio', startDate: '2018-11-01', status: 'active' },
      { patientId: p3.id, name: 'Digoxin', dosage: '0.125mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Cardio', startDate: '2018-11-01', status: 'active' },
      { patientId: p3.id, name: 'Furosemide', dosage: '40mg', frequency: 'Twice daily', route: 'Oral', prescribedBy: 'Dr. Cardio', startDate: '2019-01-15', status: 'active' },
      { patientId: p3.id, name: 'Metoprolol', dosage: '25mg', frequency: 'Twice daily', route: 'Oral', prescribedBy: 'Dr. Cardio', startDate: '2018-11-01', status: 'active' },
      { patientId: p3.id, name: 'Spironolactone', dosage: '25mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Cardio', startDate: '2019-06-01', status: 'active' },
      // James Wilson - COPD, HTN
      { patientId: p5.id, name: 'Tiotropium Inhaler', dosage: '18mcg', frequency: 'Once daily', route: 'Inhaled', prescribedBy: 'Dr. Pulm', startDate: '2020-05-10', status: 'active' },
      { patientId: p5.id, name: 'Salmeterol/Fluticasone', dosage: '50/250mcg', frequency: 'Twice daily', route: 'Inhaled', prescribedBy: 'Dr. Pulm', startDate: '2020-05-10', status: 'active' },
      { patientId: p5.id, name: 'Amlodipine', dosage: '10mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Smith', startDate: '2021-01-01', status: 'active' },
      { patientId: p5.id, name: 'Hydrochlorothiazide', dosage: '25mg', frequency: 'Once daily', route: 'Oral', prescribedBy: 'Dr. Smith', startDate: '2021-01-01', status: 'active' },
    ],
  });
  console.log('✅ Created medications');

  // ── Vitals ────────────────────────────────────────────────────────────────
  const now = new Date();
  const days = (n: number) => new Date(now.getTime() - n * 86400000);

  // Robert Johnson vitals (hypertensive)
  const p1Vitals = [
    { systolicBP: 162, diastolicBP: 98, heartRate: 88, temperature: 37.1, spO2: 97, respiratoryRate: 16, weight: 95.2, recordedAt: days(14) },
    { systolicBP: 158, diastolicBP: 96, heartRate: 85, temperature: 36.9, spO2: 97, respiratoryRate: 15, weight: 95.0, recordedAt: days(10) },
    { systolicBP: 155, diastolicBP: 95, heartRate: 82, temperature: 36.8, spO2: 98, respiratoryRate: 16, weight: 94.8, recordedAt: days(7) },
    { systolicBP: 148, diastolicBP: 92, heartRate: 79, temperature: 37.0, spO2: 98, respiratoryRate: 15, weight: 94.5, recordedAt: days(3) },
    { systolicBP: 145, diastolicBP: 90, heartRate: 78, temperature: 36.9, spO2: 98, respiratoryRate: 15, weight: 94.3, recordedAt: days(1) },
  ];
  for (const v of p1Vitals) {
    await prisma.vital.create({ data: { patientId: p1.id, ...v, recordedBy: nurse.id } });
  }

  // Emily Chen vitals (mostly normal, slightly elevated HR during asthma episode)
  const p2Vitals = [
    { systolicBP: 118, diastolicBP: 76, heartRate: 96, temperature: 37.2, spO2: 94, respiratoryRate: 22, weight: 62.0, recordedAt: days(10) },
    { systolicBP: 120, diastolicBP: 78, heartRate: 88, temperature: 37.0, spO2: 96, respiratoryRate: 18, weight: 62.1, recordedAt: days(5) },
    { systolicBP: 116, diastolicBP: 74, heartRate: 76, temperature: 36.8, spO2: 98, respiratoryRate: 15, weight: 62.1, recordedAt: days(1) },
  ];
  for (const v of p2Vitals) {
    await prisma.vital.create({ data: { patientId: p2.id, ...v, recordedBy: nurse.id } });
  }

  // Michael Davis vitals (CHF, fluid overload)
  const p3Vitals = [
    { systolicBP: 132, diastolicBP: 84, heartRate: 72, temperature: 36.8, spO2: 93, respiratoryRate: 20, weight: 82.5, recordedAt: days(12) },
    { systolicBP: 128, diastolicBP: 82, heartRate: 68, temperature: 36.7, spO2: 94, respiratoryRate: 18, weight: 81.8, recordedAt: days(7) },
    { systolicBP: 124, diastolicBP: 80, heartRate: 65, temperature: 36.8, spO2: 95, respiratoryRate: 17, weight: 80.9, recordedAt: days(2) },
  ];
  for (const v of p3Vitals) {
    await prisma.vital.create({ data: { patientId: p3.id, ...v, recordedBy: nurse.id } });
  }

  // Sarah Williams vitals (presenting with chest pain)
  const p4Vitals = [
    { systolicBP: 138, diastolicBP: 88, heartRate: 102, temperature: 37.4, spO2: 98, respiratoryRate: 18, weight: 68.5, recordedAt: days(1), chiefComplaint: 'Chest pain and shortness of breath' },
    { systolicBP: 132, diastolicBP: 84, heartRate: 96, temperature: 37.2, spO2: 99, respiratoryRate: 16, weight: 68.5, recordedAt: days(0) },
  ];
  for (const v of p4Vitals) {
    await prisma.vital.create({ data: { patientId: p4.id, ...v, recordedBy: nurse.id } });
  }

  // James Wilson vitals (COPD)
  const p5Vitals = [
    { systolicBP: 142, diastolicBP: 88, heartRate: 82, temperature: 37.0, spO2: 91, respiratoryRate: 24, weight: 78.0, recordedAt: days(8) },
    { systolicBP: 138, diastolicBP: 86, heartRate: 80, temperature: 36.9, spO2: 92, respiratoryRate: 22, weight: 77.5, recordedAt: days(3) },
    { systolicBP: 136, diastolicBP: 84, heartRate: 78, temperature: 36.8, spO2: 93, respiratoryRate: 20, weight: 77.2, recordedAt: days(0) },
  ];
  for (const v of p5Vitals) {
    await prisma.vital.create({ data: { patientId: p5.id, ...v, recordedBy: nurse.id } });
  }

  console.log('✅ Created vitals');

  // ── Lab Results ───────────────────────────────────────────────────────────
  await prisma.labResult.createMany({
    data: [
      // Robert Johnson labs - DM2, HTN
      { patientId: p1.id, testName: 'HbA1c', value: '8.2', unit: '%', referenceRange: '<5.7% normal, 5.7-6.4% prediabetes, ≥6.5% diabetes', flag: 'high', resultDate: '2024-02-15', orderedBy: doctor.id },
      { patientId: p1.id, testName: 'Fasting Glucose', value: '186', unit: 'mg/dL', referenceRange: '70-100 mg/dL', flag: 'high', resultDate: '2024-02-15', orderedBy: doctor.id },
      { patientId: p1.id, testName: 'LDL Cholesterol', value: '142', unit: 'mg/dL', referenceRange: '<100 mg/dL (optimal)', flag: 'high', resultDate: '2024-02-15', orderedBy: doctor.id },
      { patientId: p1.id, testName: 'eGFR', value: '68', unit: 'mL/min/1.73m²', referenceRange: '≥60 mL/min/1.73m²', flag: 'normal', resultDate: '2024-02-15', orderedBy: doctor.id },
      { patientId: p1.id, testName: 'Serum Creatinine', value: '1.1', unit: 'mg/dL', referenceRange: '0.7-1.3 mg/dL', flag: 'normal', resultDate: '2024-02-15', orderedBy: doctor.id },
      { patientId: p1.id, testName: 'Potassium', value: '5.1', unit: 'mEq/L', referenceRange: '3.5-5.0 mEq/L', flag: 'high', resultDate: '2024-02-15', orderedBy: doctor.id },
      // Emily Chen labs - Asthma
      { patientId: p2.id, testName: 'Peak Flow', value: '320', unit: 'L/min', referenceRange: '≥80% predicted (predicted ~450 L/min)', flag: 'low', resultDate: '2024-02-20', orderedBy: doctor.id },
      { patientId: p2.id, testName: 'IgE Total', value: '485', unit: 'IU/mL', referenceRange: '<100 IU/mL', flag: 'high', resultDate: '2024-02-20', orderedBy: doctor.id },
      { patientId: p2.id, testName: 'Eosinophils', value: '8', unit: '%', referenceRange: '1-4%', flag: 'high', resultDate: '2024-02-20', orderedBy: doctor.id },
      { patientId: p2.id, testName: 'CBC - WBC', value: '9.2', unit: 'K/µL', referenceRange: '4.5-11.0 K/µL', flag: 'normal', resultDate: '2024-02-20', orderedBy: doctor.id },
      // Michael Davis labs - CHF
      { patientId: p3.id, testName: 'BNP', value: '892', unit: 'pg/mL', referenceRange: '<100 pg/mL', flag: 'critical', resultDate: '2024-02-18', orderedBy: doctor.id },
      { patientId: p3.id, testName: 'INR', value: '2.8', unit: '', referenceRange: 'Therapeutic: 2.0-3.0', flag: 'normal', resultDate: '2024-02-18', orderedBy: doctor.id },
      { patientId: p3.id, testName: 'Sodium', value: '132', unit: 'mEq/L', referenceRange: '136-145 mEq/L', flag: 'low', resultDate: '2024-02-18', orderedBy: doctor.id },
      { patientId: p3.id, testName: 'Digoxin Level', value: '1.8', unit: 'ng/mL', referenceRange: '0.8-2.0 ng/mL (therapeutic)', flag: 'normal', resultDate: '2024-02-18', orderedBy: doctor.id },
      { patientId: p3.id, testName: 'Troponin I', value: '0.04', unit: 'ng/mL', referenceRange: '<0.04 ng/mL', flag: 'high', resultDate: '2024-02-18', orderedBy: doctor.id },
      // Sarah Williams labs - chest pain workup
      { patientId: p4.id, testName: 'Troponin I (High Sensitivity)', value: '0.08', unit: 'ng/mL', referenceRange: '<0.04 ng/mL', flag: 'high', resultDate: '2024-03-12', orderedBy: doctor.id },
      { patientId: p4.id, testName: 'D-Dimer', value: '0.52', unit: 'µg/mL FEU', referenceRange: '<0.50 µg/mL', flag: 'high', resultDate: '2024-03-12', orderedBy: doctor.id },
      { patientId: p4.id, testName: 'CBC - WBC', value: '11.8', unit: 'K/µL', referenceRange: '4.5-11.0 K/µL', flag: 'high', resultDate: '2024-03-12', orderedBy: doctor.id },
      // James Wilson labs - COPD
      { patientId: p5.id, testName: 'ABG - PaO2', value: '68', unit: 'mmHg', referenceRange: '80-100 mmHg', flag: 'low', resultDate: '2024-02-25', orderedBy: doctor.id },
      { patientId: p5.id, testName: 'ABG - PaCO2', value: '52', unit: 'mmHg', referenceRange: '35-45 mmHg', flag: 'high', resultDate: '2024-02-25', orderedBy: doctor.id },
      { patientId: p5.id, testName: 'ABG - pH', value: '7.34', unit: '', referenceRange: '7.35-7.45', flag: 'low', resultDate: '2024-02-25', orderedBy: doctor.id },
      { patientId: p5.id, testName: 'CBC - Hemoglobin', value: '11.2', unit: 'g/dL', referenceRange: '13.5-17.5 g/dL', flag: 'low', resultDate: '2024-02-25', orderedBy: doctor.id },
    ],
  });
  console.log('✅ Created lab results');

  // ── Encounters ────────────────────────────────────────────────────────────
  const enc1 = await prisma.encounter.create({
    data: {
      patientId: p1.id,
      doctorId: doctor.id,
      chiefComplaint: 'Routine follow-up for hypertension and diabetes management',
      status: 'completed',
      startedAt: days(30),
      endedAt: days(30),
      soapNotes: JSON.stringify({
        subjective: 'Patient reports good medication compliance. Occasional headaches in the morning. Denies chest pain, shortness of breath, or visual changes.',
        objective: 'BP: 158/96 mmHg, HR: 85 bpm, Wt: 95kg. Labs: HbA1c 8.2%, Fasting glucose 186 mg/dL.',
        assessment: 'Hypertension — inadequately controlled. Type 2 Diabetes Mellitus — suboptimal glycemic control.',
        plan: '1. Increase Amlodipine to 10mg daily. 2. Continue Metformin 1000mg BID. 3. Reinforce dietary modifications. 4. Recheck BP in 2 weeks. 5. Refer to diabetes educator.',
      }),
    },
  });

  const enc2 = await prisma.encounter.create({
    data: {
      patientId: p3.id,
      doctorId: doctor.id,
      chiefComplaint: 'Worsening shortness of breath and bilateral leg swelling for 3 days',
      status: 'active',
      startedAt: days(1),
    },
  });

  const enc3 = await prisma.encounter.create({
    data: {
      patientId: p4.id,
      doctorId: doctor.id,
      chiefComplaint: 'Acute chest pain — 7/10 severity, substernal, radiates to left arm, onset 2 hours ago',
      status: 'active',
      startedAt: days(0),
    },
  });

  const enc4 = await prisma.encounter.create({
    data: {
      patientId: p2.id,
      doctorId: doctor.id,
      chiefComplaint: 'Asthma exacerbation — wheezing and difficulty breathing since this morning',
      status: 'completed',
      startedAt: days(10),
      endedAt: days(10),
    },
  });

  console.log('✅ Created encounters');

  // ── Diagnoses ─────────────────────────────────────────────────────────────
  await prisma.diagnosis.createMany({
    data: [
      { patientId: p1.id, encounterId: enc1.id, icdCode: 'I10', name: 'Essential (Primary) Hypertension', confidence: 0.98, severity: 'moderate', status: 'confirmed', reasoning: 'Persistently elevated BP readings despite current antihypertensive therapy. Multiple readings >140/90.' },
      { patientId: p1.id, encounterId: enc1.id, icdCode: 'E11.9', name: 'Type 2 Diabetes Mellitus without complications', confidence: 0.97, severity: 'moderate', status: 'confirmed', reasoning: 'HbA1c 8.2% with fasting glucose 186 mg/dL. On Metformin therapy. Requires optimization.' },
      { patientId: p3.id, encounterId: enc2.id, icdCode: 'I50.9', name: 'Heart Failure, Unspecified', confidence: 0.92, severity: 'severe', status: 'confirmed', reasoning: 'Elevated BNP (892 pg/mL), decreased SpO2 (93%), bilateral leg edema, exertional dyspnea.' },
      { patientId: p4.id, encounterId: enc3.id, icdCode: 'I21.9', name: 'Acute Myocardial Infarction, Unspecified', confidence: 0.85, severity: 'critical', status: 'pending', reasoning: 'Elevated troponin, typical chest pain pattern, tachycardia. Requires urgent cardiology consultation and ECG.' },
      { patientId: p2.id, encounterId: enc4.id, icdCode: 'J45.41', name: 'Moderate Persistent Asthma with Acute Exacerbation', confidence: 0.94, severity: 'moderate', status: 'confirmed', reasoning: 'Known asthma, low peak flow (320 L/min), SpO2 94%, elevated eosinophils and IgE.' },
    ],
  });
  console.log('✅ Created diagnoses');

  // ── Risk Scores ───────────────────────────────────────────────────────────
  await prisma.riskScore.createMany({
    data: [
      { patientId: p1.id, type: 'cardiac', score: 68, level: 'high', factors: JSON.stringify(['Age 58', 'Hypertension', 'Diabetes', 'Elevated LDL', 'Male sex']) },
      { patientId: p1.id, type: 'stroke', score: 42, level: 'moderate', factors: JSON.stringify(['Age 58', 'Hypertension', 'Diabetes']) },
      { patientId: p1.id, type: 'diabetes', score: 82, level: 'high', factors: JSON.stringify(['HbA1c 8.2%', 'Fasting glucose 186', 'Elevated BMI']) },
      { patientId: p3.id, type: 'cardiac', score: 88, level: 'critical', factors: JSON.stringify(['CHF diagnosis', 'Elevated BNP', 'Age 72', 'Anticoagulation therapy']) },
      { patientId: p3.id, type: 'readmission', score: 76, level: 'high', factors: JSON.stringify(['Prior CHF admissions', 'Low sodium', 'Age 72', 'Polypharmacy']) },
      { patientId: p4.id, type: 'cardiac', score: 78, level: 'high', factors: JSON.stringify(['Elevated troponin', 'Elevated D-dimer', 'Tachycardia', 'Substernal chest pain']) },
      { patientId: p2.id, type: 'readmission', score: 35, level: 'moderate', factors: JSON.stringify(['Asthma severity', 'Low SpO2', 'Elevated IgE']) },
      { patientId: p5.id, type: 'readmission', score: 65, level: 'high', factors: JSON.stringify(['COPD GOLD Stage III', 'Low PaO2', 'Elevated PaCO2', 'Anemia']) },
    ],
  });
  console.log('✅ Created risk scores');

  // ── Alerts ────────────────────────────────────────────────────────────────
  await prisma.alert.createMany({
    data: [
      { patientId: p4.id, type: 'lab', severity: 'critical', title: 'Critical Troponin Elevation — Possible ACS', message: 'Troponin I (hs): 0.08 ng/mL (Reference: <0.04 ng/mL). Patient Sarah Williams presenting with chest pain. Immediate cardiology assessment required.', status: 'active', assignedTo: 'DOCTOR', createdAt: new Date(Date.now() - 1800000) },
      { patientId: p3.id, type: 'vitals', severity: 'high', title: 'Low Oxygen Saturation — CHF Patient', message: 'SpO2: 93% for patient Michael Davis with known CHF. Review current diuretic therapy and consider supplemental oxygen.', status: 'active', assignedTo: 'NURSE', createdAt: new Date(Date.now() - 3600000) },
      { patientId: p1.id, type: 'vitals', severity: 'high', title: 'Hypertensive — BP 162/98 mmHg', message: 'Blood pressure 162/98 mmHg recorded for Robert Johnson. Exceeds target <140/90. Consider medication adjustment.', status: 'acknowledged', assignedTo: 'DOCTOR', acknowledgedAt: new Date(Date.now() - 7200000), createdAt: new Date(Date.now() - 86400000) },
      { patientId: p3.id, type: 'lab', severity: 'critical', title: 'Critically Elevated BNP — CHF Decompensation', message: 'BNP: 892 pg/mL (Reference: <100 pg/mL) for Michael Davis. Indicates significant cardiac decompensation. Immediate treatment review required.', status: 'escalated', assignedTo: 'DOCTOR', escalatedAt: new Date(Date.now() - 3600000), createdAt: new Date(Date.now() - 86400000 * 2) },
      { patientId: p5.id, type: 'lab', severity: 'high', title: 'Hypoxemia Detected — COPD Patient', message: 'PaO2: 68 mmHg (Reference: 80-100 mmHg) for James Wilson. pH 7.34 indicating respiratory acidosis. Consider supplemental O2 and bronchodilator optimization.', status: 'active', assignedTo: 'NURSE', createdAt: new Date(Date.now() - 43200000) },
      { patientId: p4.id, type: 'vitals', severity: 'high', title: 'Tachycardia — HR 102 bpm', message: 'Heart rate 102 bpm recorded for Sarah Williams in context of chest pain presentation.', status: 'active', assignedTo: 'NURSE', createdAt: new Date(Date.now() - 3600000) },
      { patientId: p2.id, type: 'vitals', severity: 'medium', title: 'Low SpO2 During Asthma Exacerbation', message: 'SpO2: 94% with respiratory rate 22 for Emily Chen. Asthma exacerbation — monitor closely and ensure rescue inhaler available.', status: 'resolved', assignedTo: 'NURSE', resolvedAt: new Date(Date.now() - 86400000 * 9), createdAt: new Date(Date.now() - 86400000 * 10) },
      { patientId: null, type: 'guideline', severity: 'low', title: 'System: 3 Patients Due for Annual Review', message: 'Patients Robert Johnson, Michael Davis, and James Wilson are overdue for comprehensive annual health review per clinical guidelines.', status: 'active', assignedTo: 'ALL', createdAt: new Date(Date.now() - 172800000) },
    ],
  });
  console.log('✅ Created alerts');

  // ── Patient Portal User ───────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'patient.johnson@cdss.com' },
    update: { patientProfileId: p1.id },
    create: {
      email: 'patient.johnson@cdss.com',
      password: hashedPw,
      role: 'PATIENT',
      firstName: p1.firstName,
      lastName: p1.lastName,
      patientProfileId: p1.id,
    },
  });
  console.log('✅ Created patient portal user (patient.johnson@cdss.com)');

  // ── Allergen Master List ─────────────────────────────────────────────────
  const allergens = [
    // Drug allergens
    { name: 'Penicillin', category: 'drug' },
    { name: 'Amoxicillin', category: 'drug' },
    { name: 'Ampicillin', category: 'drug' },
    { name: 'Cephalosporins', category: 'drug' },
    { name: 'Sulfonamides (Sulfa drugs)', category: 'drug' },
    { name: 'Aspirin', category: 'drug' },
    { name: 'Ibuprofen', category: 'drug' },
    { name: 'Naproxen', category: 'drug' },
    { name: 'Codeine', category: 'drug' },
    { name: 'Morphine', category: 'drug' },
    { name: 'Tramadol', category: 'drug' },
    { name: 'Tetracycline', category: 'drug' },
    { name: 'Erythromycin', category: 'drug' },
    { name: 'Ciprofloxacin', category: 'drug' },
    { name: 'Metronidazole', category: 'drug' },
    { name: 'Vancomycin', category: 'drug' },
    { name: 'Carbamazepine', category: 'drug' },
    { name: 'Phenytoin', category: 'drug' },
    { name: 'Insulin', category: 'drug' },
    { name: 'Latex', category: 'drug' },
    { name: 'Contrast Dye (Iodine)', category: 'drug' },
    { name: 'ACE Inhibitors', category: 'drug' },
    { name: 'Beta-Blockers', category: 'drug' },
    { name: 'Statins', category: 'drug' },
    { name: 'Heparin', category: 'drug' },
    { name: 'Warfarin', category: 'drug' },
    { name: 'Metformin', category: 'drug' },
    { name: 'Allopurinol', category: 'drug' },
    { name: 'Azithromycin', category: 'drug' },
    { name: 'Clindamycin', category: 'drug' },
    // Food allergens
    { name: 'Peanuts', category: 'food' },
    { name: 'Tree Nuts (Almonds, Walnuts, Cashews)', category: 'food' },
    { name: 'Milk / Dairy', category: 'food' },
    { name: 'Eggs', category: 'food' },
    { name: 'Wheat / Gluten', category: 'food' },
    { name: 'Soy', category: 'food' },
    { name: 'Fish (Cod, Bass, Flounder)', category: 'food' },
    { name: 'Shellfish (Shrimp, Crab, Lobster)', category: 'food' },
    { name: 'Sesame', category: 'food' },
    { name: 'Mustard', category: 'food' },
    { name: 'Celery', category: 'food' },
    { name: 'Lupin', category: 'food' },
    { name: 'Molluscs (Squid, Oysters)', category: 'food' },
    { name: 'Sulphites / Sulphur Dioxide', category: 'food' },
    { name: 'Corn', category: 'food' },
    { name: 'Kiwi', category: 'food' },
    { name: 'Strawberries', category: 'food' },
    { name: 'Tomatoes', category: 'food' },
    { name: 'Chocolate / Cocoa', category: 'food' },
    { name: 'Artificial Food Dyes', category: 'food' },
    // Environmental allergens
    { name: 'Dust Mites', category: 'environmental' },
    { name: 'Pet Dander (Cat)', category: 'environmental' },
    { name: 'Pet Dander (Dog)', category: 'environmental' },
    { name: 'Cockroach Allergen', category: 'environmental' },
    { name: 'Mould / Fungi Spores', category: 'environmental' },
    { name: 'Tree Pollen (Oak, Birch, Cedar)', category: 'environmental' },
    { name: 'Grass Pollen (Timothy, Bermuda)', category: 'environmental' },
    { name: 'Weed Pollen (Ragweed)', category: 'environmental' },
    { name: 'Bee / Wasp Venom', category: 'environmental' },
    { name: 'Fire Ant Venom', category: 'environmental' },
    { name: 'Nickel', category: 'environmental' },
    { name: 'Fragrance / Perfume', category: 'environmental' },
    { name: 'Formaldehyde', category: 'environmental' },
    { name: 'Chlorine', category: 'environmental' },
    { name: 'Wool / Animal Hair', category: 'environmental' },
    { name: 'Feathers', category: 'environmental' },
    { name: 'Tobacco Smoke', category: 'environmental' },
    { name: 'Cold Air / Exercise-Induced', category: 'environmental' },
  ];

  for (const a of allergens) {
    await (prisma as any).allergenMaster.upsert({
      where: { name: a.name },
      update: {},
      create: a,
    });
  }
  console.log(`✅ Seeded ${allergens.length} allergens across drug, food, and environmental categories`);

  console.log('\n🎉 Database seeded successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('   Doctor:  dr.smith@cdss.com        / Password123!');
  console.log('   Nurse:   nurse.jones@cdss.com      / Password123!');
  console.log('   Admin:   admin@cdss.com            / Password123!');
  console.log('   Patient: patient.johnson@cdss.com  / Password123!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
