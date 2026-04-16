import { Router, Response, NextFunction, Request } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

// ─── Multer config for logo uploads ──────────────────────────────────────────
const LOGO_DIR = path.join(__dirname, '../../public/uploads/logo');
const ALLOWED_MIME = ['image/png', 'image/jpeg', 'image/svg+xml'];
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, LOGO_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `logo_${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG, JPG, and SVG files are allowed'));
    }
  },
});

const router: ReturnType<typeof Router> = Router();
const prisma = new PrismaClient();

// All admin routes require authentication + ADMIN role
router.use(authenticate, authorize('ADMIN'));

// GET /api/admin/users — list all staff (doctors, nurses, etc.)
router.get('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { q, role } = req.query as Record<string, string>;
    const where: Record<string, unknown> = {};
    if (role) where.role = role;
    if (q) {
      where.OR = [
        { firstName: { contains: q } },
        { lastName: { contains: q } },
        { email: { contains: q } },
        { specialty: { contains: q } },
      ];
    }
    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        specialty: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { encounters: true } },
      },
    });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/users/:id — get single user
router.get('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        email: true,
        role: true,
        firstName: true,
        lastName: true,
        specialty: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { encounters: true } },
      },
    });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/users — create new doctor/staff
router.post('/users', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, password, role, specialty } = req.body;
    if (!firstName || !lastName || !email || !password || !role) {
      res.status(400).json({ error: 'firstName, lastName, email, password, role are required' });
      return;
    }
    const validRoles = ['DOCTOR', 'NURSE', 'STAFF', 'ADMIN'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
      return;
    }
    if (password.length < 8) {
      res.status(400).json({ error: 'Password must be at least 8 characters' });
      return;
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      res.status(409).json({ error: 'A user with this email already exists' });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { firstName, lastName, email: email.toLowerCase(), password: hashed, role, specialty: specialty || null },
      select: { id: true, email: true, role: true, firstName: true, lastName: true, specialty: true, createdAt: true, updatedAt: true },
    });
    res.status(201).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/users/:id — update doctor/staff profile
router.patch('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { firstName, lastName, email, role, specialty, password } = req.body;
    // Prevent editing the calling admin's own role
    if (req.params.id === req.user!.id && role && role !== req.user!.role) {
      res.status(400).json({ error: 'You cannot change your own role' });
      return;
    }
    const data: Record<string, unknown> = {};
    if (firstName) data.firstName = firstName;
    if (lastName) data.lastName = lastName;
    if (email) {
      const existing = await prisma.user.findFirst({ where: { email: email.toLowerCase(), NOT: { id: req.params.id } } });
      if (existing) {
        res.status(409).json({ error: 'Email already in use by another user' });
        return;
      }
      data.email = email.toLowerCase();
    }
    if (role) {
      const validRoles = ['DOCTOR', 'NURSE', 'STAFF', 'ADMIN'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: `role must be one of: ${validRoles.join(', ')}` });
        return;
      }
      data.role = role;
    }
    if (specialty !== undefined) data.specialty = specialty || null;
    if (password) {
      if (password.length < 8) {
        res.status(400).json({ error: 'Password must be at least 8 characters' });
        return;
      }
      data.password = await bcrypt.hash(password, 10);
    }
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, role: true, firstName: true, lastName: true, specialty: true, createdAt: true, updatedAt: true },
    });
    res.json(user);
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/users/:id — remove staff member
router.delete('/users/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.params.id === req.user!.id) {
      res.status(400).json({ error: 'You cannot delete your own account' });
      return;
    }
    await prisma.user.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err: unknown) {
    if ((err as { code?: string }).code === 'P2025') {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/stats — aggregate counts
router.get('/stats', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [doctors, nurses, staff, admins, patients] = await Promise.all([
      prisma.user.count({ where: { role: 'DOCTOR' } }),
      prisma.user.count({ where: { role: 'NURSE' } }),
      prisma.user.count({ where: { role: 'STAFF' } }),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.patient.count(),
    ]);
    res.json({ doctors, nurses, staff, admins, patients });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Allergen Master CRUD ─────────────────────────────────────────────────────

// GET /api/admin/allergens
router.get('/allergens', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allergens = await (prisma as any).allergenMaster.findMany({
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
    res.json(allergens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/admin/allergens/active — only active ones (used by AllergiesTab)
router.get('/allergens/active', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const allergens = await (prisma as any).allergenMaster.findMany({
      where: { isActive: true },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
      select: { id: true, name: true, category: true },
    });
    res.json(allergens);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/allergens
router.post('/allergens', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, category } = req.body as { name: string; category: string };
    if (!name?.trim() || !category) {
      res.status(400).json({ error: 'name and category are required' });
      return;
    }
    const allergen = await (prisma as any).allergenMaster.create({
      data: { name: name.trim(), category },
    });
    res.status(201).json(allergen);
  } catch (err: any) {
    if (err?.code === 'P2002') {
      res.status(409).json({ error: 'An allergen with this name already exists' });
      return;
    }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/admin/allergens/:id — update name/category/isActive
router.patch('/allergens/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, category, isActive } = req.body as { name?: string; category?: string; isActive?: boolean };
    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name.trim();
    if (category !== undefined) data.category = category;
    if (isActive !== undefined) data.isActive = isActive;

    const allergen = await (prisma as any).allergenMaster.update({
      where: { id: req.params.id },
      data,
    });
    res.json(allergen);
  } catch (err: any) {
    if (err?.code === 'P2025') { res.status(404).json({ error: 'Not found' }); return; }
    if (err?.code === 'P2002') { res.status(409).json({ error: 'Name already exists' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/admin/allergens/:id
router.delete('/allergens/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await (prisma as any).allergenMaster.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err: any) {
    if (err?.code === 'P2025') { res.status(404).json({ error: 'Not found' }); return; }
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ── Logo / Branding ───────────────────────────────────────────────────────────

// GET /api/admin/logo — return current logo URL (or null)
router.get('/logo', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'logoPath' } });
    if (!config) { res.json({ logoUrl: null }); return; }
    res.json({ logoUrl: `/uploads/logo/${path.basename(config.value)}` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/logo — upload new logo (replaces existing)
router.post(
  '/logo',
  (req: Request, res: Response, next: NextFunction) => {
    upload.single('logo')(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
        return;
      }
      if (err instanceof Error) {
        res.status(400).json({ error: err.message });
        return;
      }
      next();
    });
  },
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded' });
        return;
      }

      // Delete previous logo file if one exists
      const existing = await prisma.systemConfig.findUnique({ where: { key: 'logoPath' } });
      if (existing && fs.existsSync(existing.value)) {
        fs.unlinkSync(existing.value);
      }

      // Persist the new file path
      await prisma.systemConfig.upsert({
        where:  { key: 'logoPath' },
        update: { value: req.file.path },
        create: { key: 'logoPath', value: req.file.path },
      });

      res.status(201).json({
        logoUrl: `/uploads/logo/${req.file.filename}`,
        message: 'Logo uploaded successfully',
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/admin/logo — remove logo and revert to default
router.delete('/logo', async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    const config = await prisma.systemConfig.findUnique({ where: { key: 'logoPath' } });
    if (!config) { res.json({ message: 'No custom logo to remove' }); return; }

    if (fs.existsSync(config.value)) fs.unlinkSync(config.value);
    await prisma.systemConfig.delete({ where: { key: 'logoPath' } });

    res.json({ message: 'Logo removed. Default logo is now active.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
