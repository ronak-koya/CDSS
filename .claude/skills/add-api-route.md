---
name: add-api-route
description: Add a new Express API route to the MedIntel backend
---

# Add API Route

Add a new Express route to the MedIntel backend following project conventions.

## Steps

1. **Check for existing route** — Read `backend/src/routes/` to see if a related route file already exists. Check `memory/schema_and_api.md` for the full API inventory.

2. **Create or extend route file** at `backend/src/routes/<resource>.ts`:

```typescript
import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// GET /api/<resource>
router.get('/', authenticate, async (req: Request, res: Response) => {
  try {
    const items = await prisma.<model>.findMany();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch' });
  }
});

export default router;
```

3. **Register the route** in `backend/src/index.ts`:
```typescript
import <resource>Routes from './routes/<resource>';
app.use('/api/<resource>', <resource>Routes);
```

4. **Role guard pattern** (when needed):
```typescript
if (req.user!.role !== 'DOCTOR' && req.user!.role !== 'ADMIN') {
  return res.status(403).json({ error: 'Forbidden' });
}
```

5. **Update memory** — Add new endpoint to `memory/schema_and_api.md`.

## Conventions
- Always use `authenticate` middleware on protected routes
- Use `prisma` from `'../lib/prisma'` (not a new PrismaClient)
- Return `{ error: '...' }` on failure, data directly on success
- 500 for server errors, 400 for bad input, 403 for role violations, 404 for not found
