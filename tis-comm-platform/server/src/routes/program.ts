import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';

const router = Router();
router.use(requireAuth);

// All sites with latest RAG, phase, go-live, PM name, days to go-live
router.get('/summary', async (_req, res) => {
  const sites = await prisma.site.findMany({
    include: {
      reports: {
        orderBy: { weekStart: 'desc' },
        take: 2,
        include: { author: true },
      },
      users: { include: { user: true } },
    },
  });
  const now = new Date();
  const summary = sites.map((s) => {
    const latest = s.reports[0];
    const prev = s.reports[1];
    const pmAssignment = s.users.find((u) => u.role === 'PROJECT_MANAGER');
    const pm = pmAssignment ? pmAssignment.user.name : '—';
    let daysToGoLive: number | null = null;
    if (s.goLiveDate) {
      daysToGoLive = Math.ceil((s.goLiveDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    }
    let trend: 'IMPROVING' | 'STABLE' | 'WORSENING' = 'STABLE';
    if (latest && prev) {
      const order = { GREEN: 2, AMBER: 1, RED: 0 } as Record<string, number>;
      if (order[latest.overallRAG] > order[prev.overallRAG]) trend = 'IMPROVING';
      else if (order[latest.overallRAG] < order[prev.overallRAG]) trend = 'WORSENING';
    }
    return {
      id: s.id,
      code: s.code,
      name: s.name,
      country: s.country,
      phase: s.currentPhase,
      status: s.status,
      goLiveDate: s.goLiveDate,
      kickoffDate: s.kickoffDate,
      daysToGoLive,
      pm,
      latestRAG: latest?.overallRAG ?? null,
      lastUpdate: latest?.updatedAt ?? null,
      trend,
    };
  });
  res.json({ sites: summary });
});

router.get('/overdue', async (_req, res) => {
  const events = await prisma.communicationEvent.findMany({
    where: { status: 'OVERDUE' },
    include: { site: { include: { users: { include: { user: true } } } } },
    orderBy: { dueDate: 'asc' },
  });
  const now = new Date();
  const out = events.map((e) => {
    const pm = e.site.users.find((u) => u.role === 'PROJECT_MANAGER');
    return {
      id: e.id,
      siteCode: e.site.code,
      siteName: e.site.name,
      templateCode: e.templateCode,
      title: e.title,
      dueDate: e.dueDate,
      daysOverdue: Math.floor((now.getTime() - e.dueDate.getTime()) / (1000 * 60 * 60 * 24)),
      pm: pm ? pm.user.name : '—',
    };
  });
  res.json({ events: out });
});

router.get('/timeline', async (_req, res) => {
  const sites = await prisma.site.findMany({
    select: {
      id: true,
      code: true,
      name: true,
      country: true,
      kickoffDate: true,
      goLiveDate: true,
      currentPhase: true,
    },
    orderBy: { goLiveDate: 'asc' },
  });
  res.json({ sites });
});

export default router;
