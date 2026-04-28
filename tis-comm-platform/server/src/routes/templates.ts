import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../index';
import templates from '../data/templates.json';

const router = Router();
router.use(requireAuth);

router.get('/', (_req, res) => {
  res.json({ templates });
});

router.get('/due', async (req, res) => {
  const siteCode = String(req.query.siteCode || '');
  const weekOffset = Number(req.query.weekOffset || 0);
  const site = await prisma.site.findUnique({ where: { code: siteCode } });
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1 + weekOffset * 7);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const events = await prisma.communicationEvent.findMany({
    where: {
      siteId: site.id,
      dueDate: { gte: weekStart, lt: weekEnd },
    },
  });
  // Match events to templates
  const tmpls = (templates as any[]).filter((t) => events.some((e) => e.templateCode === t.code));
  res.json({ templates: tmpls, events });
});

router.get('/:code', (req, res) => {
  const t = (templates as any[]).find((x) => x.code === req.params.code);
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json({ template: t });
});

export default router;
