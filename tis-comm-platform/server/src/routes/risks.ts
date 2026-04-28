import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();
router.use(requireAuth);

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code } });
}

router.get('/:code/risks', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const where: any = { siteId: site.id };
  if (req.query.resolved === 'false') where.resolved = false;
  if (req.query.resolved === 'true') where.resolved = true;
  const risks = await prisma.risk.findMany({ where, orderBy: { createdAt: 'desc' } });
  res.json({ risks });
});

router.post('/:code/risks', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const { type, title, description, impact, probability, status, mitigation, ownerName, dueDate } =
    req.body;
  const risk = await prisma.risk.create({
    data: {
      siteId: site.id,
      type: type || 'RISK',
      title,
      description: description || '',
      impact: impact || 'MEDIUM',
      probability: probability || 'MEDIUM',
      status: status || 'AMBER',
      mitigation: mitigation || '',
      ownerName: ownerName || '',
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
  res.json({ risk });
});

router.put('/:code/risks/:id', async (req, res) => {
  const { type, title, description, impact, probability, status, mitigation, ownerName, dueDate } =
    req.body;
  const risk = await prisma.risk.update({
    where: { id: req.params.id },
    data: {
      ...(type !== undefined && { type }),
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(impact !== undefined && { impact }),
      ...(probability !== undefined && { probability }),
      ...(status !== undefined && { status }),
      ...(mitigation !== undefined && { mitigation }),
      ...(ownerName !== undefined && { ownerName }),
      ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    },
  });
  res.json({ risk });
});

router.post('/:code/risks/:id/resolve', async (req, res) => {
  const { resolution } = req.body;
  const risk = await prisma.risk.update({
    where: { id: req.params.id },
    data: { resolved: true, resolution: resolution || '' },
  });
  res.json({ risk });
});

export default router;
