import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();
router.use(requireAuth);

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code } });
}

router.get('/:code/stakeholders', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const stakeholders = await prisma.stakeholder.findMany({
    where: { siteId: site.id, isActive: true },
    orderBy: { name: 'asc' },
  });
  res.json({ stakeholders });
});

router.post('/:code/stakeholders', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const data = req.body;
  const stakeholder = await prisma.stakeholder.create({
    data: {
      siteId: site.id,
      name: data.name,
      role: data.role,
      organization: data.organization || null,
      email: data.email || null,
      phone: data.phone || null,
      influence: data.influence || 'MEDIUM',
      interest: data.interest || 'MEDIUM',
      engagementStrategy: data.engagementStrategy || null,
      keyMessages: data.keyMessages || null,
      layer: data.layer || 'PROJECT',
      isKeyUser: !!data.isKeyUser,
    },
  });
  res.json({ stakeholder });
});

router.put('/:code/stakeholders/:id', async (req, res) => {
  const data = req.body;
  const stakeholder = await prisma.stakeholder.update({
    where: { id: req.params.id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.role !== undefined && { role: data.role }),
      ...(data.organization !== undefined && { organization: data.organization }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.phone !== undefined && { phone: data.phone }),
      ...(data.influence !== undefined && { influence: data.influence }),
      ...(data.interest !== undefined && { interest: data.interest }),
      ...(data.engagementStrategy !== undefined && {
        engagementStrategy: data.engagementStrategy,
      }),
      ...(data.keyMessages !== undefined && { keyMessages: data.keyMessages }),
      ...(data.layer !== undefined && { layer: data.layer }),
      ...(data.isKeyUser !== undefined && { isKeyUser: !!data.isKeyUser }),
    },
  });
  res.json({ stakeholder });
});

router.delete('/:code/stakeholders/:id', async (req, res) => {
  const stakeholder = await prisma.stakeholder.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ stakeholder });
});

export default router;
