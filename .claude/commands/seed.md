# /seed — Run Main Database Seed

Reset and reseed the database with all base data (users, patients, vitals, labs, medications, allergies, encounters, diagnoses, risk scores, drug interactions, alerts).

> ⚠️ This wipes existing data. Use `/seed-appointments` to add appointment data only.

## Steps to execute:

1. Navigate to backend and run seed:
```bash
cd c:/Users/Bacancy/Downloads/CDSS/backend && export PATH="$PATH:/c/Users/Bacancy/AppData/Roaming/npm" && pnpm exec ts-node prisma/seed.ts
```

2. Confirm success — you should see output like:
```
✅ Seed completed
  - 4 users created
  - 6 patients created
  - Drug interactions, alerts, vitals, labs, etc.
```

3. Test credentials after seed:
- Doctor: dr.smith@cdss.com / Password123!
- Nurse: nurse.jones@cdss.com / Password123!
- Admin: admin@cdss.com / Password123!
