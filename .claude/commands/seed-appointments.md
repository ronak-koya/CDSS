# /seed-appointments — Seed Appointment Data

Add 16 dummy appointments for Dr. Sarah Smith without wiping existing data.

## Steps to execute:

1. Run the appointments seed:
```bash
cd c:/Users/Bacancy/Downloads/CDSS/backend && export PATH="$PATH:/c/Users/Bacancy/AppData/Roaming/npm" && pnpm exec ts-node prisma/seedAppointments.ts
```

2. Expected output:
```
✅ Created 16 appointments for Dr. Sarah Smith
```

## What it creates:
- 4 completed appointments (yesterday)
- 6 appointments today (mix of completed / in-progress / scheduled)
- 4 scheduled appointments (tomorrow)
- 2 scheduled appointments (next week)

> ℹ️ Safe to run multiple times — uses `createMany` with `skipDuplicates` logic based on doctor/patient/time.
