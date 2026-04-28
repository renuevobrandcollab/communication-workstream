import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();
router.use(requireAuth);

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code } });
}

router.get('/:code/comm-events', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const where: any = { siteId: site.id };
  if (req.query.status) where.status = req.query.status;
  const events = await prisma.communicationEvent.findMany({
    where,
    orderBy: { dueDate: 'asc' },
    include: { author: true },
  });
  res.json({ events });
});

router.post('/:code/comm-events', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const { templateCode, title, dueDate, status, notes } = req.body;
  const event = await prisma.communicationEvent.create({
    data: {
      siteId: site.id,
      templateCode,
      title,
      dueDate: new Date(dueDate),
      status: status || 'PLANNED',
      notes: notes || null,
      authorId: u.id,
    },
  });
  res.json({ event });
});

router.put('/:code/comm-events/:id', async (req, res) => {
  const { templateCode, title, dueDate, status, notes } = req.body;
  const event = await prisma.communicationEvent.update({
    where: { id: req.params.id },
    data: {
      ...(templateCode !== undefined && { templateCode }),
      ...(title !== undefined && { title }),
      ...(dueDate !== undefined && { dueDate: new Date(dueDate) }),
      ...(status !== undefined && { status }),
      ...(notes !== undefined && { notes }),
    },
  });
  res.json({ event });
});

router.post('/:code/comm-events/:id/log-sent', async (req, res) => {
  const { sentDate, approvedBy, archivedPath, notes } = req.body;
  const event = await prisma.communicationEvent.update({
    where: { id: req.params.id },
    data: {
      status: 'SENT',
      sentDate: sentDate ? new Date(sentDate) : new Date(),
      approvedBy: approvedBy || null,
      approvedAt: new Date(),
      archivedPath: archivedPath || null,
      notes: notes || null,
    },
  });
  res.json({ event });
});

export default router;
