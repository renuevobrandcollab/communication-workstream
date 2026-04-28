import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();
router.use(requireAuth);

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code } });
}

router.get('/:code/milestones', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const milestones = await prisma.milestone.findMany({
    where: { siteId: site.id },
    orderBy: { plannedDate: 'asc' },
  });
  res.json({ milestones });
});

router.put('/:code/milestones/:id', async (req, res) => {
  const { gate, name, plannedDate, actualDate, status, notes } = req.body;
  const milestone = await prisma.milestone.update({
    where: { id: req.params.id },
    data: {
      ...(gate !== undefined && { gate }),
      ...(name !== undefined && { name }),
      ...(plannedDate !== undefined && { plannedDate: new Date(plannedDate) }),
      ...(actualDate !== undefined && {
        actualDate: actualDate ? new Date(actualDate) : null,
      }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
  });
  res.json({ milestone });
});

router.post('/:code/milestones/:id/complete', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const { actualDate, notes } = req.body;
  const milestone = await prisma.milestone.update({
    where: { id: req.params.id },
    data: {
      status: 'COMPLETED',
      actualDate: actualDate ? new Date(actualDate) : new Date(),
      notes: notes || null,
    },
  });
  // Auto-create gate communication event
  await prisma.communicationEvent.create({
    data: {
      siteId: site.id,
      templateCode: milestone.gate,
      title: `${milestone.gate} — ${milestone.name}`,
      dueDate: milestone.actualDate || new Date(),
      status: 'DUE',
    },
  });
  await prisma.milestone.update({
    where: { id: milestone.id },
    data: { commSent: true },
  });
  res.json({ milestone });
});

export default router;
