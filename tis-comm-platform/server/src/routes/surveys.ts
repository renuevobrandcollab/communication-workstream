import { Router } from 'express';
import { prisma } from '../index';
import { requireAuth } from '../middleware/auth';
import { userCanAccessSite } from './sites';

const router = Router();

async function getSite(code: string) {
  return prisma.site.findUnique({ where: { code } });
}

// Authenticated routes for site-scoped survey management.
// These routes are mounted both under /api/sites and /api/surveys; the
// /respond routes below intentionally do NOT require auth.

router.get('/:code/surveys', requireAuth, async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const surveys = await prisma.survey.findMany({
    where: { siteId: site.id },
    include: { responses: true },
    orderBy: { sentDate: 'desc' },
  });
  res.json({ surveys });
});

router.post('/:code/surveys', requireAuth, async (req, res) => {
  const site = await getSite(req.params.code);
  if (!site) return res.status(404).json({ error: 'Site not found' });
  const u = req.user!;
  if (!(await userCanAccessSite(u.id, u.role, site.id)))
    return res.status(403).json({ error: 'No access' });
  const { type } = req.body;
  const survey = await prisma.survey.create({
    data: {
      siteId: site.id,
      type: type || 'POST_KICKOFF',
      sentDate: new Date(),
    },
  });
  res.json({ survey, link: `/survey/${survey.id}/respond` });
});

// Public — fetch survey for response
router.get('/:id/respond', async (req, res) => {
  const survey = await prisma.survey.findUnique({
    where: { id: req.params.id },
    include: { site: true },
  });
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  res.json({
    survey: {
      id: survey.id,
      type: survey.type,
      siteName: survey.site.name,
    },
  });
});

// Public — submit survey response
router.post('/:id/respond', async (req, res) => {
  const survey = await prisma.survey.findUnique({ where: { id: req.params.id } });
  if (!survey) return res.status(404).json({ error: 'Survey not found' });
  const { q1Score, q2Score, q3Text, q4Volume, q5Score } = req.body;
  const response = await prisma.surveyResponse.create({
    data: {
      surveyId: survey.id,
      q1Score: Number(q1Score) || 0,
      q2Score: Number(q2Score) || 0,
      q3Text: q3Text || '',
      q4Volume: q4Volume || '',
      q5Score: Number(q5Score) || 0,
    },
  });
  res.json({ ok: true, id: response.id });
});

export default router;
