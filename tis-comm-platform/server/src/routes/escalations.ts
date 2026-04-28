import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();
router.use(requireAuth);

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code } });
}

router.get('/:code/escalations', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const escalations = await prisma.escalation.findMany({
    where: { siteId: site.id },
    orderBy: { createdAt: 'desc' },
    include: { raisedBy: true },
  });
  res.json({ escalations });
});

router.post('/:code/escalations', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const data = req.body;
  const escalation = await prisma.escalation.create({
    data: {
      siteId: site.id,
      raisedById: u.id,
      title: data.title,
      issueSummary: data.issueSummary,
      impact: data.impact,
      options: data.options,
      recommendation: data.recommendation,
      decisionNeededBy: new Date(data.decisionNeededBy),
      decisionNeededFrom: data.decisionNeededFrom,
    },
  });
  res.json({ escalation });
});

router.put('/:code/escalations/:id', async (req, res) => {
  const data = req.body;
  const escalation = await prisma.escalation.update({
    where: { id: req.params.id },
    data: {
      ...(data.status !== undefined && { status: data.status }),
      ...(data.resolution !== undefined && { resolution: data.resolution }),
      ...(data.status === 'RESOLVED' && { resolvedAt: new Date() }),
      ...(data.title !== undefined && { title: data.title }),
      ...(data.issueSummary !== undefined && { issueSummary: data.issueSummary }),
      ...(data.impact !== undefined && { impact: data.impact }),
      ...(data.options !== undefined && { options: data.options }),
      ...(data.recommendation !== undefined && { recommendation: data.recommendation }),
    },
  });
  res.json({ escalation });
});

export default router;
