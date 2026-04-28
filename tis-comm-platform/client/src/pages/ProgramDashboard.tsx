import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format, parseISO } from 'date-fns';
import { ArrowDown, ArrowRight, ArrowUp, AlertTriangle } from 'lucide-react';
import { api } from '../services/api';
import type { ProgramSiteSummary, OverdueEvent, Site } from '../types';
import TopBar from '../components/Layout/TopBar';
import Card from '../components/UI/Card';
import RAGPill from '../components/UI/RAGPill';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis } from 'recharts';

function trendIcon(t: string) {
  if (t === 'IMPROVING') return <ArrowUp size={14} className="inline text-pgm" />;
  if (t === 'WORSENING') return <ArrowDown size={14} className="inline text-danger" />;
  return <ArrowRight size={14} className="inline text-grey" />;
}

function flag(country: string) {
  const m: Record<string, string> = { SE: '🇸🇪', LT: '🇱🇹', FR: '🇫🇷', IN: '🇮🇳', MX: '🇲🇽' };
  return m[country] || '🏭';
}

export default function ProgramDashboard() {
  const navigate = useNavigate();
  const summary = useQuery({
    queryKey: ['program', 'summary'],
    queryFn: async () => (await api.get<{ sites: ProgramSiteSummary[] }>('/program/summary')).data.sites,
  });
  const overdue = useQuery({
    queryKey: ['program', 'overdue'],
    queryFn: async () => (await api.get<{ events: OverdueEvent[] }>('/program/overdue')).data.events,
  });
  const timeline = useQuery({
    queryKey: ['program', 'timeline'],
    queryFn: async () => (await api.get<{ sites: Site[] }>('/program/timeline')).data.sites,
  });

  if (summary.isLoading) return <LoadingSpinner />;
  const sites = summary.data || [];
  const overdueEvents = overdue.data || [];

  const totalActive = sites.filter((s) => s.status !== 'CLOSED').length;
  const greenCount = sites.filter((s) => s.latestRAG === 'GREEN').length;
  const atRiskCount = sites.filter((s) => s.latestRAG === 'AMBER' || s.latestRAG === 'RED').length;

  const timelineData = (timeline.data || [])
    .filter((s) => s.goLiveDate)
    .map((s, i) => ({
      x: parseISO(s.goLiveDate!).getTime(),
      y: i + 1,
      name: s.name,
      code: s.code,
    }));

  return (
    <div>
      <TopBar title="Program Dashboard" subtitle="D365 rollout — all sites" />
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <div className="text-xs uppercase text-grey tracking-wide">Active sites</div>
            <div className="text-3xl font-bold mt-1">{totalActive}</div>
          </Card>
          <Card accent="pgm">
            <div className="text-xs uppercase text-grey tracking-wide">On track (Green)</div>
            <div className="text-3xl font-bold mt-1 text-pgm">{greenCount}</div>
          </Card>
          <Card accent="amber">
            <div className="text-xs uppercase text-grey tracking-wide">At risk (Amber/Red)</div>
            <div className="text-3xl font-bold mt-1 text-amber-text">{atRiskCount}</div>
          </Card>
          <Card accent="danger">
            <div className="text-xs uppercase text-grey tracking-wide">Overdue comms</div>
            <div className="text-3xl font-bold mt-1 text-danger">{overdueEvents.length}</div>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card title="Site RAG status">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-grey-light text-grey uppercase text-xs">
                    <th className="px-3 py-2">Site</th>
                    <th className="px-3 py-2">Country</th>
                    <th className="px-3 py-2">Phase</th>
                    <th className="px-3 py-2">RAG</th>
                    <th className="px-3 py-2">Trend</th>
                    <th className="px-3 py-2">Go-Live</th>
                    <th className="px-3 py-2">Days</th>
                    <th className="px-3 py-2">PM</th>
                  </tr>
                </thead>
                <tbody>
                  {sites.map((s) => (
                    <tr
                      key={s.id}
                      onClick={() => navigate(`/sites/${s.code}`)}
                      className="border-t border-gray-100 cursor-pointer hover:bg-grey-light"
                    >
                      <td className="px-3 py-2 font-medium">{flag(s.country)} {s.name}</td>
                      <td className="px-3 py-2 text-grey">{s.country}</td>
                      <td className="px-3 py-2">
                        <span className="text-xs bg-prj-lighter text-prj px-2 py-0.5 rounded">
                          {s.phase.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-3 py-2"><RAGPill status={s.latestRAG} /></td>
                      <td className="px-3 py-2">{trendIcon(s.trend)}</td>
                      <td className="px-3 py-2 text-grey text-xs">
                        {s.goLiveDate ? format(parseISO(s.goLiveDate), 'd MMM yyyy') : '—'}
                      </td>
                      <td className={`px-3 py-2 text-xs ${
                        s.daysToGoLive != null && s.daysToGoLive < 30 ? 'text-danger font-bold' : s.daysToGoLive != null && s.daysToGoLive < 90 ? 'text-amber-text font-bold' : 'text-grey'
                      }`}>
                        {s.daysToGoLive != null ? `${s.daysToGoLive}d` : '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">{s.pm}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          </div>

          <Card title="Overdue communications" accent="danger">
            {overdueEvents.length === 0 ? (
              <div className="text-grey text-sm">No overdue communications.</div>
            ) : (
              <ul className="space-y-2">
                {overdueEvents.map((e) => (
                  <li
                    key={e.id}
                    className="border border-danger/30 bg-danger-light rounded p-3 text-sm cursor-pointer hover:bg-danger-light/80"
                    onClick={() => navigate(`/sites/${e.siteCode}/calendar`)}
                  >
                    <div className="flex items-start gap-2">
                      <AlertTriangle size={16} className="text-danger mt-0.5" />
                      <div className="flex-1">
                        <div className="font-semibold">{e.siteName} — {e.templateCode}</div>
                        <div className="text-xs text-grey">{e.title}</div>
                        <div className="text-xs text-danger font-medium mt-1">
                          {e.daysOverdue} days overdue · PM: {e.pm}
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Go-live timeline">
          <ResponsiveContainer width="100%" height={Math.max(200, timelineData.length * 40)}>
            <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis
                dataKey="x"
                type="number"
                domain={['auto', 'auto']}
                tickFormatter={(v) => format(new Date(v), 'MMM yy')}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                dataKey="y"
                type="number"
                tickFormatter={(v) => timelineData.find((d) => d.y === v)?.name || ''}
                tick={{ fontSize: 11 }}
                domain={[0, timelineData.length + 1]}
              />
              <ZAxis range={[120]} />
              <Tooltip formatter={(v: any, n: any, p: any) => [format(new Date(p.payload.x), 'd MMM yyyy'), p.payload.name]} />
              <Scatter data={timelineData} fill="#1E4D8C" />
            </ScatterChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </div>
  );
}
