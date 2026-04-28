import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();
router.use(requireAuth);

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code } });
}

router.get('/:code/kpis', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const kpis = await prisma.kPIEntry.findMany({
    where: { siteId: site.id },
    orderBy: { quarter: 'asc' },
  });
  res.json({ kpis });
});

router.post('/:code/kpis', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const data = req.body;
  const kpi = await prisma.kPIEntry.upsert({
    where: { siteId_quarter: { siteId: site.id, quarter: data.quarter } },
    update: {
      scAttendanceRate: data.scAttendanceRate ?? null,
      trainingAttendance: data.trainingAttendance ?? null,
      bsbDeliveryRate: data.bsbDeliveryRate ?? null,
      glSequenceOnTime: data.glSequenceOnTime ?? null,
      unnecessaryEscalations: data.unnecessaryEscalations ?? null,
      satisfactionScore: data.satisfactionScore ?? null,
      commRelatedGLIssues: data.commRelatedGLIssues ?? null,
      notes: data.notes ?? null,
    },
    create: {
      siteId: site.id,
      authorId: u.id,
      quarter: data.quarter,
      scAttendanceRate: data.scAttendanceRate ?? null,
      trainingAttendance: data.trainingAttendance ?? null,
      bsbDeliveryRate: data.bsbDeliveryRate ?? null,
      glSequenceOnTime: data.glSequenceOnTime ?? null,
      unnecessaryEscalations: data.unnecessaryEscalations ?? null,
      satisfactionScore: data.satisfactionScore ?? null,
      commRelatedGLIssues: data.commRelatedGLIssues ?? null,
      notes: data.notes ?? null,
    },
  });
  res.json({ kpi });
});

router.put('/:code/kpis/:id', async (req, res) => {
  const data = req.body;
  const kpi = await prisma.kPIEntry.update({
    where: { id: req.params.id },
    data: {
      ...(data.scAttendanceRate !== undefined && { scAttendanceRate: data.scAttendanceRate }),
      ...(data.trainingAttendance !== undefined && { trainingAttendance: data.trainingAttendance }),
      ...(data.bsbDeliveryRate !== undefined && { bsbDeliveryRate: data.bsbDeliveryRate }),
      ...(data.glSequenceOnTime !== undefined && { glSequenceOnTime: data.glSequenceOnTime }),
      ...(data.unnecessaryEscalations !== undefined && {
        unnecessaryEscalations: data.unnecessaryEscalations,
      }),
      ...(data.satisfactionScore !== undefined && { satisfactionScore: data.satisfactionScore }),
      ...(data.commRelatedGLIssues !== undefined && {
        commRelatedGLIssues: data.commRelatedGLIssues,
      }),
      ...(data.notes !== undefined && { notes: data.notes }),
    },
  });
  res.json({ kpi });
});

export default router;
