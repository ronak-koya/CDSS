/**
 * seedPatientUser.ts
 * Creates a PATIENT portal user linked to Robert Johnson (MRN-001).
 * Run with: pnpm exec ts-node prisma/seedPatientUser.ts
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Creating patient portal user...');

  // Find Robert Johnson
  const patient = await prisma.patient.findUnique({ where: { mrn: 'MRN-001' } });
  if (!patient) {
    console.error('❌ Patient MRN-001 not found. Run the main seed first.');
    process.exit(1);
  }

  const hashedPw = await bcrypt.hash('Password123!', 10);

  const user = await prisma.user.upsert({
    where: { email: 'patient.johnson@cdss.com' },
    update: { patientProfileId: patient.id },
    create: {
      email: 'patient.johnson@cdss.com',
      password: hashedPw,
      role: 'PATIENT',
      firstName: patient.firstName,
      lastName: patient.lastName,
      patientProfileId: patient.id,
    },
  });

  console.log(`✅ Patient user created: ${user.email}`);
  console.log(`   Linked to: ${patient.firstName} ${patient.lastName} (${patient.mrn})`);
  console.log(`\n🔑 Patient portal credentials:`);
  console.log(`   Email:    patient.johnson@cdss.com`);
  console.log(`   Password: Password123!`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
