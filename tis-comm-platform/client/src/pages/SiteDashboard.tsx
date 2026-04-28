import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO, differenceInDays } from 'date-fns';
import { api } from '../services/api';
import { useSite } from '../hooks/useSite';
import RAGPill from '../components/UI/RAGPill';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import TopBar from '../components/Layout/TopBar';
import type { WeeklyReport, CommEvent, Risk, Milestone } from '../types';

import CommCalendar from './CommCalendar';
import WeeklyReportPage from './WeeklyReport/WeeklyReportForm';
import RisksPage from './Risks';
import StakeholdersPage from './Stakeholders';
import MilestonesPage from './Milestones';
import EscalationsPage from './Escalations';
import KPIsPage from './KPIs';

function flag(country: string) {
  const m: Record<string, string> = { SE: '🇸🇪', LT: '🇱🇹', FR: '🇫🇷', IN: '🇮🇳', MX: '🇲🇽' };
  return m[country] || '🏭';
}

const TABS: Array<{ key: string; label: string }> = [
  { key: 'overview', label: 'Overview' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'report', label: 'Weekly Report' },
  { key: 'risks', label: 'Risks' },
  { key: 'stakeholders', label: 'Stakeholders' },
  { key: 'milestones', label: 'Milestones' },
  { key: 'escalations', label: 'Escalations' },
  { key: 'kpis', label: 'KPIs' },
];

export default function SiteDashboard() {
  const { code, tab } = useParams<{ code: string; tab?: string }>();
  const navigate = useNavigate();
  const activeTab = tab || 'overview';
  const siteQ = useSite(code);

  if (siteQ.isLoading) return <LoadingSpinner />;
  if (siteQ.isError || !siteQ.data) {
    return <div className="p-8 text-danger">Site not found or no access.</div>;
  }
  const site = siteQ.data;

  const daysToGoLive = site.goLiveDate
    ? differenceInDays(parseISO(site.goLiveDate), new Date())
    : null;

  return (
    <div>
      <TopBar
        title={`${flag(site.country)} ${site.name}`}
        subtitle={`${site.country} · ${site.currentPhase.replace(/_/g, ' ')} · Go-Live ${
          site.goLiveDate ? format(parseISO(site.goLiveDate), 'd MMM yyyy') : '—'
        }${daysToGoLive != null ? ` (${daysToGoLive} days)` : ''}`}
      />
      <div className="bg-white border-b border-gray-200 px-6">
        <div className="flex flex-wrap gap-1">
          {TABS.map((t) => (
            <NavLink
              key={t.key}
              to={`/sites/${code}/${t.key}`}
              className={({ isActive }) =>
                `px-4 py-2 text-sm font-medium border-b-2 ${
                  isActive || activeTab === t.key
                    ? 'border-prj text-prj'
                    : 'border-transparent text-grey hover:text-dark'
                }`
              }
            >
              {t.label}
            </NavLink>
          ))}
        </div>
      </div>
      <div className="p-6">
        {activeTab === 'overview' && <Overview code={code!} />}
        {activeTab === 'calendar' && <CommCalendar code={code!} />}
        {activeTab === 'report' && <WeeklyReportPage code={code!} />}
        {activeTab === 'risks' && <RisksPage code={code!} />}
        {activeTab === 'stakeholders' && <StakeholdersPage code={code!} />}
        {activeTab === 'milestones' && <MilestonesPage code={code!} />}
        {activeTab === 'escalations' && <EscalationsPage code={code!} />}
        {activeTab === 'kpis' && <KPIsPage code={code!} />}
      </div>
    </div>
  );
}

function Overview({ code }: { code: string }) {
  const siteQ = useSite(code);
  const reportQ = useQuery({
    queryKey: ['report', code, 'latest'],
    queryFn: async () => (await api.get<{ report: WeeklyReport | null }>(`/sites/${code}/reports/latest`)).data.report,
  });
  const eventsQ = useQuery({
    queryKey: ['comm', code],
    queryFn: async () => (await api.get<{ events: CommEvent[] }>(`/sites/${code}/comm-events`)).data.events,
  });
  const risksQ = useQuery({
    queryKey: ['risks', code, 'open'],
    queryFn: async () => (await api.get<{ risks: Risk[] }>(`/sites/${code}/risks?resolved=false`)).data.risks,
  });
  const milestonesQ = useQuery({
    queryKey: ['milestones', code],
    queryFn: async () => (await api.get<{ milestones: Milestone[] }>(`/sites/${code}/milestones`)).data.milestones,
  });

  if (siteQ.isLoading || reportQ.isLoading) return <LoadingSpinner />;
  const site = siteQ.data!;
  const report = reportQ.data;
  const events = eventsQ.data || [];
  const risks = risksQ.data || [];
  const milestones = milestonesQ.data || [];

  const overdue = events.filter((e) => e.status === 'OVERDUE').length;
  const daysToGoLive = site.goLiveDate
    ? differenceInDays(parseISO(site.goLiveDate), new Date())
    : null;

  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const thisWeekEvents = events.filter((e) => {
    const d = parseISO(e.dueDate);
    return d >= weekStart && d < weekEnd;
  });

  const upcomingMilestones = milestones
    .filter((m) => m.status !== 'COMPLETED')
    .slice(0, 3);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Current Phase" value={site.currentPhase.replace(/_/g, ' ')} accent="prj" />
        <StatCard label="Days to Go-Live" value={daysToGoLive != null ? `${daysToGoLive}` : '—'} accent="pgm" />
        <StatCard label="Open Risks" value={risks.length.toString()} accent="amber" />
        <StatCard label="Overdue Comms" value={overdue.toString()} accent="danger" />
      </div>

      <div>
        <h3 className="text-sm font-bold uppercase tracking-wide text-dark mb-3 border-l-4 border-prj pl-2">
          Workstream RAG (latest)
        </h3>
        {!report ? (
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-grey text-sm">
            No weekly report yet for this site.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {report.workstreamRAGs?.map((wsr) => (
              <div key={wsr.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-semibold text-sm">{wsr.workstream?.name}</div>
                  <RAGPill status={wsr.rag} />
                </div>
                <div className="text-xs text-grey">{wsr.trend.replace(/_/g, ' ')}</div>
                <div className="text-xs mt-2">{wsr.comment || <span className="italic text-grey">No comment</span>}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm uppercase tracking-wide">
            This week
          </div>
          <div className="p-4 space-y-3">
            {thisWeekEvents.length === 0 ? (
              <div className="text-grey text-sm">No comms due this week.</div>
            ) : (
              thisWeekEvents.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-sm">
                  <span>{e.templateCode} · {e.title}</span>
                  <span className="text-xs text-grey">{format(parseISO(e.dueDate), 'EEE d MMM')}</span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm uppercase tracking-wide">
            Next milestones
          </div>
          <div className="p-4 space-y-3">
            {upcomingMilestones.length === 0 ? (
              <div className="text-grey text-sm">No upcoming milestones.</div>
            ) : (
              upcomingMilestones.map((m) => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>
                    <span className="font-bold text-gate">{m.gate}</span> · {m.name}
                  </span>
                  <span className="text-xs text-grey">{format(parseISO(m.plannedDate), 'd MMM yyyy')}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: 'prj' | 'pgm' | 'amber' | 'danger' }) {
  const colourMap = { prj: 'text-prj', pgm: 'text-pgm', amber: 'text-amber-text', danger: 'text-danger' };
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 border-l-4 border-l-${accent === 'amber' ? 'amber-text' : accent}`}>
      <div className="text-xs uppercase text-grey tracking-wide">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colourMap[accent]}`}>{value}</div>
    </div>
  );
}
