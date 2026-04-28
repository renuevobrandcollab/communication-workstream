import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { isProgramView } from '../middleware/roleCheck';

const router = Router();
router.use(requireAuth);

// Helper: check if user can access a site
export async function userCanAccessSite(userId: string, role: string, siteId: string) {
  if (isProgramView(role)) return true;
  const link = await prisma.siteUser.findFirst({ where: { userId, siteId } });
  return !!link;
}

router.get('/', async (req, res) => {
  const user = req.user!;
  let sites;
  if (isProgramView(user.role)) {
    sites = await prisma.site.findMany({
      orderBy: { name: 'asc' },
      include: { users: { include: { user: true } } },
    });
  } else {
    const links = await prisma.siteUser.findMany({
      where: { userId: user.id },
      include: { site: { include: { users: { include: { user: true } } } } },
    });
    sites = links.map((l) => l.site);
  }
  res.json({ sites });
});

router.post('/', async (req, res) => {
  const user = req.user!;
  if (!['ADMIN', 'PROGRAM_MANAGER'].includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { name, code, country, kickoffDate, goLiveDate, currentPhase } = req.body;
  const site = await prisma.site.create({
    data: {
      name,
      code,
      country,
      kickoffDate: kickoffDate ? new Date(kickoffDate) : null,
      goLiveDate: goLiveDate ? new Date(goLiveDate) : null,
      currentPhase: currentPhase || 'ASSESS',
    },
  });
  // Create default workstreams
  const workstreams = [
    'ERP / Functional',
    'Data Migration',
    'Integration / EDI',
    'Change Management',
    'Infrastructure / IT',
    'Testing & QA',
    'Project Management',
  ];
  await prisma.workstream.createMany({
    data: workstreams.map((name, i) => ({ siteId: site.id, name, order: i })),
  });
  // Create default milestones
  const gates: Array<{ gate: any; name: string }> = [
    { gate: 'TG0', name: 'Project Charter Approved' },
    { gate: 'TG1', name: 'Kick-off' },
    { gate: 'TG2', name: 'Design Approved' },
    { gate: 'TG3', name: 'Build Complete' },
    { gate: 'TG4', name: 'Test & Train Complete' },
    { gate: 'TG5', name: 'Go-Live' },
    { gate: 'TG6', name: 'HyperCare Exit' },
  ];
  if (site.goLiveDate) {
    const goLive = site.goLiveDate;
    await prisma.milestone.createMany({
      data: gates.map((g) => ({
        siteId: site.id,
        gate: g.gate,
        name: g.name,
        plannedDate:
          g.gate === 'TG5'
            ? goLive
            : g.gate === 'TG6'
            ? new Date(goLive.getTime() + 28 * 86400000)
            : new Date(goLive.getTime() - 90 * 86400000),
        status: 'PLANNED',
      })),
    });
  }
  res.json({ site });
});

router.get('/:code', async (req, res) => {
  const user = req.user!;
  const site = await prisma.site.findUnique({
    where: { code: req.params.code },
    include: {
      workstreams: { orderBy: { order: 'asc' } },
      users: { include: { user: true } },
    },
  });
  if (!site) return res.status(404).json({ error: 'Site not found' });
  if (!(await userCanAccessSite(user.id, user.role, site.id))) {
    return res.status(403).json({ error: 'No access to this site' });
  }
  res.json({ site });
});

router.put('/:code', async (req, res) => {
  const user = req.user!;
  if (!['ADMIN', 'PROGRAM_MANAGER'].includes(user.role)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const site = await prisma.site.findUnique({ where: { code: req.params.code } });
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const { name, country, kickoffDate, goLiveDate, currentPhase, status, hyperCareEnd } = req.body;
  const updated = await prisma.site.update({
    where: { id: site.id },
    data: {
      ...(name !== undefined && { name }),
      ...(country !== undefined && { country }),
      ...(kickoffDate !== undefined && { kickoffDate: kickoffDate ? new Date(kickoffDate) : null }),
      ...(goLiveDate !== undefined && { goLiveDate: goLiveDate ? new Date(goLiveDate) : null }),
      ...(currentPhase !== undefined && { currentPhase }),
      ...(status !== undefined && { status }),
      ...(hyperCareEnd !== undefined && {
        hyperCareEnd: hyperCareEnd ? new Date(hyperCareEnd) : null,
      }),
    },
  });
  res.json({ site: updated });
});

export default router;
