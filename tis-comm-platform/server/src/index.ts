import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import cron from 'node-cron';
import { PrismaClient } from '@prisma/client';

import authRoutes from './routes/auth';
import sitesRoutes from './routes/sites';
import reportsRoutes from './routes/reports';
import risksRoutes from './routes/risks';
import commEventsRoutes from './routes/commEvents';
import stakeholdersRoutes from './routes/stakeholders';
import milestonesRoutes from './routes/milestones';
import escalationsRoutes from './routes/escalations';
import kpisRoutes from './routes/kpis';
import surveysRoutes from './routes/surveys';
import programRoutes from './routes/program';
import templatesRoutes from './routes/templates';
import usersRoutes from './routes/users';

export const prisma = new PrismaClient();

const app = express();

app.use(
  cors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/program', programRoutes);
app.use('/api/sites', sitesRoutes);
// Site-scoped sub-routers (mounted under /api/sites/:code/...)
app.use('/api/sites', reportsRoutes);
app.use('/api/sites', risksRoutes);
app.use('/api/sites', commEventsRoutes);
app.use('/api/sites', stakeholdersRoutes);
app.use('/api/sites', milestonesRoutes);
app.use('/api/sites', escalationsRoutes);
app.use('/api/sites', kpisRoutes);
app.use('/api/sites', surveysRoutes);
app.use('/api/surveys', surveysRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/users', usersRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[error]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = Number(process.env.PORT) || 3001;

// Daily cron: mark overdue comm events (07:00 server time)
cron.schedule('0 7 * * *', async () => {
  try {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const result = await prisma.communicationEvent.updateMany({
      where: {
        dueDate: { lt: now },
        status: { notIn: ['SENT', 'SKIPPED', 'OVERDUE'] },
      },
      data: { status: 'OVERDUE' },
    });
    console.log(`[cron] Marked ${result.count} comm events as overdue`);
  } catch (e) {
    console.error('[cron] Failed to mark overdue events', e);
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
