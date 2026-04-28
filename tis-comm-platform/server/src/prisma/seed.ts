import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

type Role = 'ADMIN' | 'PROGRAM_MANAGER' | 'PROJECT_MANAGER' | 'CHANGE_MANAGER' | 'SOLUTION_ARCHITECT' | 'PMO';
type Phase = 'ASSESS' | 'PREPARE' | 'DEMONSTRATE' | 'BUILD' | 'TEST_AND_TRAIN' | 'DEPLOY' | 'OPERATE';
type RAGStatus = 'RED' | 'AMBER' | 'GREEN';
type Trend = 'IMPROVING' | 'STABLE' | 'WORSENING';
type Severity = 'HIGH' | 'MEDIUM' | 'LOW';
type RiskType = 'RISK' | 'ISSUE';
type MilestoneStatus = 'PLANNED' | 'ON_TRACK' | 'AT_RISK' | 'COMPLETED' | 'DELAYED';
type GateCode = 'TG0' | 'TG1' | 'TG2' | 'TG3' | 'TG4' | 'TG5' | 'TG6';
type ReportStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED';
type InfluenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';
type StakeholderLayer = 'PROJECT' | 'PROGRAM' | 'PARTNER';

const WORKSTREAMS = [
  'ERP / Functional',
  'Data Migration',
  'Integration / EDI',
  'Change Management',
  'Infrastructure / IT',
  'Testing & QA',
  'Project Management',
];

const GATES: Array<{ gate: GateCode; name: string; offsetDays: number }> = [
  { gate: 'TG0', name: 'Project Charter Approved', offsetDays: -180 },
  { gate: 'TG1', name: 'Kick-off', offsetDays: -150 },
  { gate: 'TG2', name: 'Design Approved', offsetDays: -90 },
  { gate: 'TG3', name: 'Build Complete', offsetDays: -60 },
  { gate: 'TG4', name: 'Test & Train Complete', offsetDays: -28 },
  { gate: 'TG5', name: 'Go-Live', offsetDays: 0 },
  { gate: 'TG6', name: 'HyperCare Exit', offsetDays: 28 },
];

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  console.log('Seeding database...');

  // Clear existing data — order matters (FKs)
  await prisma.surveyResponse.deleteMany();
  await prisma.survey.deleteMany();
  await prisma.kPIEntry.deleteMany();
  await prisma.escalation.deleteMany();
  await prisma.actionItem.deleteMany();
  await prisma.decision.deleteMany();
  await prisma.reportRisk.deleteMany();
  await prisma.workstreamRAG.deleteMany();
  await prisma.weeklyReport.deleteMany();
  await prisma.risk.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.communicationEvent.deleteMany();
  await prisma.stakeholder.deleteMany();
  await prisma.workstream.deleteMany();
  await prisma.siteUser.deleteMany();
  await prisma.site.deleteMany();
  await prisma.user.deleteMany();

  // ---- Users ----
  const users = await Promise.all(
    [
      { email: 'admin@tis.com', name: 'System Admin', password: 'Admin2024!', role: 'ADMIN' as Role },
      { email: 'damien@tis.com', name: 'Damien Tremoulet', password: 'Damien2024!', role: 'PROGRAM_MANAGER' as Role },
      { email: 'massimo@tis.com', name: 'Massimo Rossi', password: 'Massimo2024!', role: 'PMO' as Role },
      { email: 'pm.varnamoo@tis.com', name: 'Lars Andersson', password: 'PMVrn2024!', role: 'PROJECT_MANAGER' as Role },
      { email: 'pm.taurage@tis.com', name: 'Mindaugas Petrauskas', password: 'PMTau2024!', role: 'PROJECT_MANAGER' as Role },
      { email: 'cm.varnamoo@tis.com', name: 'Astrid Bergman', password: 'CMVrn2024!', role: 'CHANGE_MANAGER' as Role },
      { email: 'sa@tis.com', name: 'Patrick Müller', password: 'SA2024!', role: 'SOLUTION_ARCHITECT' as Role },
    ].map(async (u) => {
      const password = await bcrypt.hash(u.password, 10);
      return prisma.user.create({ data: { ...u, password } });
    })
  );

  const byEmail = (e: string) => users.find((u) => u.email === e)!;
  const damien = byEmail('damien@tis.com');
  const massimo = byEmail('massimo@tis.com');
  const pmVrn = byEmail('pm.varnamoo@tis.com');
  const pmTau = byEmail('pm.taurage@tis.com');
  const cmVrn = byEmail('cm.varnamoo@tis.com');
  const sa = byEmail('sa@tis.com');

  // ---- Sites ----
  const sitesData = [
    { name: 'Varnamoo', code: 'VRN', country: 'SE', currentPhase: 'BUILD' as Phase, kickoffDate: new Date('2026-01-15'), goLiveDate: new Date('2027-03-01') },
    { name: 'Taurage', code: 'TAU', country: 'LT', currentPhase: 'DEMONSTRATE' as Phase, kickoffDate: new Date('2026-02-01'), goLiveDate: new Date('2027-03-15') },
    { name: 'Carquefou', code: 'CAR', country: 'FR', currentPhase: 'ASSESS' as Phase, kickoffDate: new Date('2026-04-01'), goLiveDate: new Date('2027-01-15') },
    { name: 'Forsheda', code: 'FOR', country: 'SE', currentPhase: 'BUILD' as Phase, kickoffDate: new Date('2026-01-20'), goLiveDate: new Date('2027-03-01') },
    { name: 'Ahmedabad', code: 'AHM', country: 'IN', currentPhase: 'PREPARE' as Phase, kickoffDate: new Date('2026-03-01'), goLiveDate: new Date('2026-12-01') },
    { name: 'Silao', code: 'SIL', country: 'MX', currentPhase: 'PREPARE' as Phase, kickoffDate: new Date('2026-04-15'), goLiveDate: new Date('2027-06-01') },
  ];

  const sites = await Promise.all(sitesData.map((s) => prisma.site.create({ data: s })));
  const byCode = (c: string) => sites.find((s) => s.code === c)!;

  // ---- SiteUser assignments ----
  const assignments: Array<{ userId: string; siteId: string; role: Role }> = [];
  for (const s of sites) {
    assignments.push({ userId: damien.id, siteId: s.id, role: 'PROGRAM_MANAGER' });
    assignments.push({ userId: massimo.id, siteId: s.id, role: 'PMO' });
  }
  assignments.push({ userId: pmVrn.id, siteId: byCode('VRN').id, role: 'PROJECT_MANAGER' });
  assignments.push({ userId: pmTau.id, siteId: byCode('TAU').id, role: 'PROJECT_MANAGER' });
  assignments.push({ userId: cmVrn.id, siteId: byCode('VRN').id, role: 'CHANGE_MANAGER' });
  assignments.push({ userId: sa.id, siteId: byCode('VRN').id, role: 'SOLUTION_ARCHITECT' });
  assignments.push({ userId: sa.id, siteId: byCode('TAU').id, role: 'SOLUTION_ARCHITECT' });

  await Promise.all(assignments.map((a) => prisma.siteUser.create({ data: a })));

  // ---- Workstreams for every site ----
  const workstreamsBySite: Record<string, { id: string; name: string }[]> = {};
  for (const s of sites) {
    const ws = await Promise.all(
      WORKSTREAMS.map((name, i) =>
        prisma.workstream.create({ data: { siteId: s.id, name, order: i } })
      )
    );
    workstreamsBySite[s.id] = ws.map((w) => ({ id: w.id, name: w.name }));
  }

  // ---- Milestones for every site ----
  for (const s of sites) {
    if (!s.goLiveDate) continue;
    const goLive = s.goLiveDate;
    for (const g of GATES) {
      const planned = new Date(goLive.getTime() + g.offsetDays * 86400000);
      let status: MilestoneStatus = 'PLANNED';
      let actualDate: Date | null = null;
      if (s.code === 'VRN') {
        if (g.gate === 'TG0') {
          status = 'COMPLETED';
          actualDate = new Date('2025-12-05');
        } else if (g.gate === 'TG1') {
          status = 'COMPLETED';
          actualDate = new Date('2026-01-15');
        } else if (g.gate === 'TG2') {
          status = 'COMPLETED';
          actualDate = new Date('2026-03-12');
        } else if (g.gate === 'TG3') {
          status = 'ON_TRACK';
        }
      } else if (s.code === 'TAU') {
        if (g.gate === 'TG0' || g.gate === 'TG1') {
          status = 'COMPLETED';
          actualDate = new Date(planned.getTime());
        } else if (g.gate === 'TG2') {
          status = 'AT_RISK';
        }
      }
      // VRN-specific planned dates per spec
      let plannedDate = planned;
      if (s.code === 'VRN') {
        const map: Record<string, string> = {
          TG0: '2025-12-01',
          TG1: '2026-01-15',
          TG2: '2026-03-10',
          TG3: '2026-05-01',
          TG4: '2026-06-15',
          TG5: '2027-03-01',
          TG6: '2027-03-29',
        };
        plannedDate = new Date(map[g.gate]);
      }
      await prisma.milestone.create({
        data: {
          siteId: s.id,
          gate: g.gate,
          name: g.name,
          plannedDate,
          actualDate,
          status,
          commSent: status === 'COMPLETED',
        },
      });
    }
  }

  // ---- Varnamoo: weekly reports ----
  const vrn = byCode('VRN');
  const vrnWS = workstreamsBySite[vrn.id];
  const findWS = (siteId: string, name: string) =>
    workstreamsBySite[siteId].find((w) => w.name === name)!;

  // Week 1
  const w1 = await prisma.weeklyReport.create({
    data: {
      siteId: vrn.id,
      authorId: pmVrn.id,
      weekStart: daysAgo(14 * 7),
      weekEnd: daysAgo(14 * 7 - 6),
      weekNumber: 1,
      status: 'SUBMITTED' as ReportStatus,
      overallRAG: 'GREEN' as RAGStatus,
      doneThisWeek: '• Project kicked off successfully\n• All teams aligned\n• Initial workshops completed',
      plannedNextWeek: '• Begin design discovery\n• Confirm scope with key users\n• Set up project tooling',
      keyMessage: 'Strong start — all workstreams green and team is engaged.',
    },
  });
  for (const ws of vrnWS) {
    await prisma.workstreamRAG.create({
      data: {
        workstreamId: ws.id,
        reportId: w1.id,
        rag: 'GREEN',
        trend: 'STABLE',
        comment: 'On plan',
      },
    });
  }

  // Week 6
  const w6 = await prisma.weeklyReport.create({
    data: {
      siteId: vrn.id,
      authorId: pmVrn.id,
      weekStart: daysAgo(7 * 7),
      weekEnd: daysAgo(7 * 7 - 6),
      weekNumber: 6,
      status: 'SUBMITTED',
      overallRAG: 'AMBER',
      doneThisWeek: '• Design workshops 60% complete\n• Data assessment kicked off\n• Integration spec drafted',
      plannedNextWeek: '• Complete remaining design workshops\n• Agree data migration approach\n• Sign off integration spec',
      keyMessage: 'Data quality concerns surfacing — under control but tracking carefully.',
    },
  });
  for (const ws of vrnWS) {
    const isData = ws.name === 'Data Migration';
    await prisma.workstreamRAG.create({
      data: {
        workstreamId: ws.id,
        reportId: w6.id,
        rag: isData ? 'AMBER' : 'GREEN',
        trend: 'STABLE',
        comment: isData ? 'Legacy GL accounts have data quality issues — investigating' : 'On plan',
      },
    });
  }

  // Week 12 — most recent
  const w12 = await prisma.weeklyReport.create({
    data: {
      siteId: vrn.id,
      authorId: pmVrn.id,
      weekStart: daysAgo(7),
      weekEnd: daysAgo(1),
      weekNumber: 12,
      status: 'SUBMITTED',
      overallRAG: 'AMBER',
      doneThisWeek: '• Data cleansing sprint 1 complete (40% accounts cleaned)\n• Build phase entered\n• Integration testing kicked off\n• User training plan finalised',
      plannedNextWeek: '• Continue data cleansing sprint 2\n• Resolve Azure environment provisioning\n• Mid-build review\n• Begin key user briefings',
      keyMessage: 'Data Migration is RED due to scope of cleansing required. Azure provisioning issue being escalated.',
    },
  });
  for (const ws of vrnWS) {
    let rag: RAGStatus = 'GREEN';
    let trend: Trend = 'STABLE';
    let comment = 'On plan';
    if (ws.name === 'Data Migration') {
      rag = 'RED';
      trend = 'WORSENING';
      comment = 'Legacy GL data quality worse than expected — sprint 1 only 40% complete';
    } else if (ws.name === 'Infrastructure / IT') {
      rag = 'AMBER';
      trend = 'STABLE';
      comment = 'Azure environment provisioning delayed — escalated to Group IT';
    } else if (ws.name === 'Change Management') {
      rag = 'GREEN';
      trend = 'IMPROVING';
      comment = 'Key users engaged, training plan agreed';
    }
    await prisma.workstreamRAG.create({
      data: { workstreamId: ws.id, reportId: w12.id, rag, trend, comment },
    });
  }

  // Decisions on w12
  await prisma.decision.create({
    data: {
      reportId: w12.id,
      description: 'Approve additional data cleansing sprint (3 weeks, 2 FTE)',
      context: 'Data quality of legacy GL accounts requires more effort than baselined.',
      recommendation: 'Approve sprint 3 to maintain go-live date.',
      neededBy: daysFromNow(7),
      decidedBy: 'Business Sponsor',
      status: 'OPEN',
    },
  });

  // Action items on w12
  await prisma.actionItem.createMany({
    data: [
      { reportId: w12.id, siteId: vrn.id, description: 'Escalate Azure provisioning to Group IT', ownerName: 'Patrick Müller', dueDate: daysFromNow(3), status: 'IN_PROGRESS' },
      { reportId: w12.id, siteId: vrn.id, description: 'Schedule data cleansing sprint 2', ownerName: 'Lars Andersson', dueDate: daysFromNow(5), status: 'OPEN' },
      { reportId: w12.id, siteId: vrn.id, description: 'Confirm key user training dates with Finance', ownerName: 'Astrid Bergman', dueDate: daysFromNow(10), status: 'OPEN' },
    ],
  });

  // ---- Varnamoo: risks ----
  const r1 = await prisma.risk.create({
    data: {
      siteId: vrn.id,
      type: 'RISK' as RiskType,
      title: 'Data quality — legacy GL accounts',
      description: 'Legacy GL data has many duplicates and orphan entries.',
      impact: 'HIGH' as Severity,
      probability: 'MEDIUM' as Severity,
      status: 'AMBER',
      mitigation: 'Data cleansing sprint scheduled weeks 14-16. Owner: Data Migration Lead.',
      ownerName: 'Lars Andersson',
      dueDate: daysFromNow(21),
    },
  });
  const r2 = await prisma.risk.create({
    data: {
      siteId: vrn.id,
      type: 'ISSUE',
      title: 'Azure environment provisioning delay',
      description: 'New Azure subscription approval has been pending with Group IT for 3 weeks.',
      impact: 'HIGH',
      probability: 'HIGH',
      status: 'RED',
      mitigation: 'Escalated to Group IT. Alternative: use temporary sandbox. Owner: SA.',
      ownerName: 'Patrick Müller',
      dueDate: daysFromNow(7),
    },
  });
  await prisma.reportRisk.createMany({
    data: [
      { reportId: w12.id, riskId: r1.id },
      { reportId: w12.id, riskId: r2.id },
    ],
  });
  await prisma.reportRisk.create({ data: { reportId: w6.id, riskId: r1.id } });

  // ---- Varnamoo: communication events ----
  const goLiveVrn = vrn.goLiveDate!;
  const lastMonday = (() => {
    const d = new Date();
    const dow = d.getDay();
    d.setDate(d.getDate() - ((dow + 6) % 7) - 7);
    d.setHours(9, 0, 0, 0);
    return d;
  })();
  await prisma.communicationEvent.createMany({
    data: [
      { siteId: vrn.id, templateCode: 'WSR-001', title: 'Weekly Status Report — Wk 11', dueDate: lastMonday, sentDate: lastMonday, status: 'SENT', authorId: pmVrn.id },
      { siteId: vrn.id, templateCode: 'SC-PRJ', title: 'Project Steering Committee — March', dueDate: daysAgo(28), sentDate: daysAgo(28), status: 'SENT', authorId: pmVrn.id },
      { siteId: vrn.id, templateCode: 'BSB-001', title: 'Business Sponsor Briefing — March', dueDate: daysAgo(28), sentDate: daysAgo(28), status: 'SENT', authorId: pmVrn.id },
      { siteId: vrn.id, templateCode: 'TG-001', title: 'TG1 Kick-off Communication', dueDate: new Date('2026-01-15'), sentDate: new Date('2026-01-15'), status: 'SENT', authorId: pmVrn.id },
      { siteId: vrn.id, templateCode: 'TG-002', title: 'TG2 Design Approved', dueDate: new Date('2026-03-10'), sentDate: new Date('2026-03-10'), status: 'SENT', authorId: pmVrn.id },
      { siteId: vrn.id, templateCode: 'TG-003', title: 'TG3 Build Complete', dueDate: new Date('2026-05-01'), status: 'PLANNED', authorId: pmVrn.id },
      { siteId: vrn.id, templateCode: 'EU-001', title: 'End User Awareness — T-8 weeks', dueDate: new Date(goLiveVrn.getTime() - 8 * 7 * 86400000), status: 'PLANNED', authorId: cmVrn.id },
      { siteId: vrn.id, templateCode: 'GL-001', title: 'Go-Live T-4 weeks', dueDate: new Date(goLiveVrn.getTime() - 4 * 7 * 86400000), status: 'PLANNED', authorId: cmVrn.id },
      { siteId: vrn.id, templateCode: 'WSR-001', title: 'Weekly Status Report — Wk 10 (overdue)', dueDate: daysAgo(14), status: 'OVERDUE', authorId: pmVrn.id },
    ],
  });

  // ---- Varnamoo: stakeholders ----
  await prisma.stakeholder.createMany({
    data: [
      { siteId: vrn.id, name: 'Elena Rossi', role: 'Business Sponsor', organization: 'TIS Varnamoo', email: 'elena.rossi@tis.com', influence: 'HIGH' as InfluenceLevel, interest: 'HIGH' as InfluenceLevel, layer: 'PROJECT' as StakeholderLayer, engagementStrategy: 'Bi-weekly briefings; copy on all SC packs.' },
      { siteId: vrn.id, name: 'Marc Dubois', role: 'Finance BU Manager', organization: 'TIS Varnamoo', email: 'marc.dubois@tis.com', influence: 'HIGH', interest: 'MEDIUM', layer: 'PROJECT', engagementStrategy: 'Monthly BU update + invitation to design reviews.' },
      { siteId: vrn.id, name: 'Anna Karlsson', role: 'Key User (Finance)', organization: 'TIS Varnamoo', email: 'anna.karlsson@tis.com', influence: 'LOW', interest: 'HIGH', layer: 'PROJECT', isKeyUser: true, engagementStrategy: 'Weekly key user meeting; training champion.' },
      { siteId: vrn.id, name: 'Stadean Contact', role: 'EDI Partner Contact', organization: 'Stadean', email: 'support@stadean.com', influence: 'MEDIUM', interest: 'LOW', layer: 'PARTNER', engagementStrategy: 'Vendor performance reviews quarterly.' },
    ],
  });

  // ---- Varnamoo: KPI Q1 2026 ----
  await prisma.kPIEntry.create({
    data: {
      siteId: vrn.id,
      authorId: pmVrn.id,
      quarter: 'Q1 2026',
      scAttendanceRate: 88,
      trainingAttendance: null,
      bsbDeliveryRate: 100,
      glSequenceOnTime: null,
      unnecessaryEscalations: 0,
      satisfactionScore: 3.8,
      commRelatedGLIssues: null,
      notes: 'Solid first quarter. Training KPI not yet measurable.',
    },
  });

  // ---- Taurage: 1 weekly report ----
  const tau = byCode('TAU');
  const tauWS = workstreamsBySite[tau.id];
  const tauReport = await prisma.weeklyReport.create({
    data: {
      siteId: tau.id,
      authorId: pmTau.id,
      weekStart: daysAgo(7),
      weekEnd: daysAgo(1),
      weekNumber: 8,
      status: 'SUBMITTED',
      overallRAG: 'AMBER',
      doneThisWeek: '• Blueprint workshops 70% complete\n• Stakeholder map signed off',
      plannedNextWeek: '• Complete remaining blueprint workshops\n• Begin design phase preparation',
      keyMessage: 'Blueprint workshops running 1 week behind. Recovery plan in place.',
    },
  });
  for (const ws of tauWS) {
    const isPM = ws.name === 'Project Management';
    await prisma.workstreamRAG.create({
      data: {
        workstreamId: ws.id,
        reportId: tauReport.id,
        rag: isPM ? 'AMBER' : 'GREEN',
        trend: 'STABLE',
        comment: isPM ? 'Blueprint workshops running 1 week behind' : 'On plan',
      },
    });
  }

  console.log('Seed complete.');
  console.log(`Users: ${users.length}, Sites: ${sites.length}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
