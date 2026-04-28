import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleCheck';

const router = Router();
router.use(requireAuth);

router.get('/', requireRole('ADMIN'), async (_req, res) => {
  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    include: { assignedSites: { include: { site: true } } },
  });
  res.json({
    users: users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isActive: u.isActive,
      sites: u.assignedSites.map((a) => ({
        siteId: a.siteId,
        siteCode: a.site.code,
        siteName: a.site.name,
        role: a.role,
      })),
    })),
  });
});

router.post('/', requireRole('ADMIN'), async (req, res) => {
  const { name, email, password, role, sites } = req.body;
  const hashed = await bcrypt.hash(password || 'Password1!', 10);
  const user = await prisma.user.create({
    data: { name, email, password: hashed, role },
  });
  if (Array.isArray(sites)) {
    for (const s of sites) {
      await prisma.siteUser.create({
        data: { siteId: s.siteId, userId: user.id, role: s.role || role },
      });
    }
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  const { name, email, role, isActive, password, sites } = req.body;
  const data: any = {};
  if (name !== undefined) data.name = name;
  if (email !== undefined) data.email = email;
  if (role !== undefined) data.role = role;
  if (isActive !== undefined) data.isActive = isActive;
  if (password) data.password = await bcrypt.hash(password, 10);
  const user = await prisma.user.update({ where: { id: req.params.id }, data });
  if (Array.isArray(sites)) {
    await prisma.siteUser.deleteMany({ where: { userId: user.id } });
    for (const s of sites) {
      await prisma.siteUser.create({
        data: { siteId: s.siteId, userId: user.id, role: s.role || user.role },
      });
    }
  }
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
