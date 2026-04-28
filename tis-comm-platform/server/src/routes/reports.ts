import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();
router.use(requireAuth);

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code }, include: { workstreams: true } });
}

router.get('/:code/reports', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const reports = await prisma.weeklyReport.findMany({
    where: { siteId: site.id },
    orderBy: { weekStart: 'desc' },
    include: { author: true },
  });
  res.json({ reports });
});

router.get('/:code/reports/latest', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const report = await prisma.weeklyReport.findFirst({
    where: { siteId: site.id },
    orderBy: { weekStart: 'desc' },
    include: {
      author: true,
      workstreamRAGs: { include: { workstream: true } },
      decisions: true,
      actions: true,
      risks: { include: { risk: true } },
    },
  });
  res.json({ report });
});

router.get('/:code/reports/:id', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const report = await prisma.weeklyReport.findFirst({
    where: { id: req.params.id, siteId: site.id },
    include: {
      author: true,
      workstreamRAGs: { include: { workstream: true } },
      decisions: true,
      actions: true,
      risks: { include: { risk: true } },
    },
  });
  if (!report) return res.status(404).json({ error: 'Not found' });
  res.json({ report });
});

router.post('/:code/reports', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const { weekStart, weekEnd, weekNumber, overallRAG, doneThisWeek, plannedNextWeek, keyMessage } =
    req.body;
  const report = await prisma.weeklyReport.create({
    data: {
      siteId: site.id,
      authorId: u.id,
      weekStart: new Date(weekStart),
      weekEnd: new Date(weekEnd),
      weekNumber: Number(weekNumber) || 1,
      overallRAG: overallRAG || 'GREEN',
      doneThisWeek: doneThisWeek || '',
      plannedNextWeek: plannedNextWeek || '',
      keyMessage: keyMessage || '',
    },
  });
  // Initialize workstreamRAGs
  await prisma.workstreamRAG.createMany({
    data: site.workstreams.map((w) => ({
      workstreamId: w.id,
      reportId: report.id,
      rag: 'GREEN',
      trend: 'STABLE',
      comment: '',
    })),
  });
  res.json({ report });
});

router.put('/:code/reports/:id', async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const { overallRAG, doneThisWeek, plannedNextWeek, keyMessage, workstreamRAGs, decisions, actions } =
    req.body;
  const report = await prisma.weeklyReport.update({
    where: { id: req.params.id },
    data: {
      ...(overallRAG !== undefined && { overallRAG }),
      ...(doneThisWeek !== undefined && { doneThisWeek }),
      ...(plannedNextWeek !== undefined && { plannedNextWeek }),
      ...(keyMessage !== undefined && { keyMessage }),
    },
  });
  if (Array.isArray(workstreamRAGs)) {
    for (const ws of workstreamRAGs) {
      if (ws.id) {
        await prisma.workstreamRAG.update({
          where: { id: ws.id },
          data: { rag: ws.rag, trend: ws.trend, comment: ws.comment || '' },
        });
      } else if (ws.workstreamId) {
        await prisma.workstreamRAG.create({
          data: {
            workstreamId: ws.workstreamId,
            reportId: report.id,
            rag: ws.rag,
            trend: ws.trend,
            comment: ws.comment || '',
          },
        });
      }
    }
  }
  if (Array.isArray(decisions)) {
    for (const d of decisions) {
      if (d.id) {
        await prisma.decision.update({
          where: { id: d.id },
          data: {
            description: d.description,
            context: d.context || '',
            recommendation: d.recommendation || '',
            neededBy: new Date(d.neededBy),
            decidedBy: d.decidedBy || '',
            status: d.status || 'OPEN',
            resolution: d.resolution || null,
          },
        });
      } else {
        await prisma.decision.create({
          data: {
            reportId: report.id,
            description: d.description,
            context: d.context || '',
            recommendation: d.recommendation || '',
            neededBy: new Date(d.neededBy),
            decidedBy: d.decidedBy || '',
            status: d.status || 'OPEN',
          },
        });
      }
    }
  }
  if (Array.isArray(actions)) {
    for (const a of actions) {
      if (a.id) {
        await prisma.actionItem.update({
          where: { id: a.id },
          data: {
            description: a.description,
            ownerName: a.ownerName,
            dueDate: new Date(a.dueDate),
            status: a.status,
            notes: a.notes || null,
          },
        });
      } else {
        await prisma.actionItem.create({
          data: {
            reportId: report.id,
            siteId: site.id,
            description: a.description,
            ownerName: a.ownerName,
            dueDate: new Date(a.dueDate),
            status: a.status || 'OPEN',
          },
        });
      }
    }
  }
  const full = await prisma.weeklyReport.findUnique({
    where: { id: report.id },
    include: {
      author: true,
      workstreamRAGs: { include: { workstream: true } },
      decisions: true,
      actions: true,
      risks: { include: { risk: true } },
    },
  });
  res.json({ report: full });
});

router.post('/:code/reports/:id/submit', async (req, res) => {
  const report = await prisma.weeklyReport.update({
    where: { id: req.params.id },
    data: { status: 'SUBMITTED' },
  });
  res.json({ report });
});

export default router;
