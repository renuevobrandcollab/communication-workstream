import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Printer } from 'lucide-react';
import { api } from '../../services/api';
import type { WeeklyReport } from '../../types';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import RAGPill from '../../components/UI/RAGPill';
import StatusBadge from '../../components/UI/StatusBadge';

export default function WeeklyReportView({ code }: { code: string }) {
  const reportsQ = useQuery({
    queryKey: ['reports', code, 'list'],
    queryFn: async () => (await api.get<{ reports: WeeklyReport[] }>(`/sites/${code}/reports`)).data.reports,
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const reportQ = useQuery({
    queryKey: ['reports', code, selectedId],
    enabled: !!selectedId,
    queryFn: async () => (await api.get<{ report: WeeklyReport }>(`/sites/${code}/reports/${selectedId}`)).data.report,
  });

  if (reportsQ.isLoading) return <LoadingSpinner />;
  const reports = reportsQ.data || [];
  const currentId = selectedId || reports[0]?.id;
  const report = (selectedId && reportQ.data) || (reports[0] && !selectedId ? reports[0] : null);

  // Need full report for view
  const fullQ = useQuery({
    queryKey: ['reports', code, currentId, 'full'],
    enabled: !!currentId,
    queryFn: async () => (await api.get<{ report: WeeklyReport }>(`/sites/${code}/reports/${currentId}`)).data.report,
  });
  const r = fullQ.data || report;

  if (!r) {
    return <div className="bg-white border border-gray-200 rounded-lg p-6 text-center text-grey">No reports yet.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex items-center justify-between gap-3 no-print">
        <div className="flex items-center gap-2">
          <span className="text-xs text-grey">View:</span>
          <select className="border border-gray-300 rounded px-2 py-1 text-sm" value={currentId} onChange={(e) => setSelectedId(e.target.value)}>
            {reports.map((rep) => (
              <option key={rep.id} value={rep.id}>
                Wk {rep.weekNumber} — {format(parseISO(rep.weekStart), 'd MMM yyyy')}
              </option>
            ))}
          </select>
        </div>
        <button onClick={() => window.print()} className="text-sm flex items-center gap-1 border border-gray-300 rounded px-3 py-1 hover:bg-grey-light">
          <Printer size={14} /> Export
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold">Weekly Status Report — Week {r.weekNumber}</h2>
            <div className="text-sm text-grey">{format(parseISO(r.weekStart), 'd MMM')} – {format(parseISO(r.weekEnd), 'd MMM yyyy')} · by {r.author?.name}</div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={r.status} />
            <div className={`text-2xl font-bold px-4 py-2 rounded ${r.overallRAG === 'GREEN' ? 'bg-pgm text-white' : r.overallRAG === 'AMBER' ? 'bg-amber-text text-white' : 'bg-danger text-white'}`}>
              {r.overallRAG}
            </div>
          </div>
        </div>

        {r.keyMessage && (
          <div className="bg-prj-lighter border-l-4 border-prj p-3 rounded mb-4">
            <strong>Key message:</strong> {r.keyMessage}
          </div>
        )}

        <h3 className="text-sm uppercase font-bold mt-4 mb-2 border-l-4 border-prj pl-2">Workstreams</h3>
        <table className="w-full text-sm border border-gray-200 mb-4">
          <thead>
            <tr className="bg-grey-light text-xs uppercase text-grey">
              <th className="px-3 py-2 text-left">Workstream</th>
              <th className="px-3 py-2">RAG</th>
              <th className="px-3 py-2">Trend</th>
              <th className="px-3 py-2 text-left">Comment</th>
            </tr>
          </thead>
          <tbody>
            {(r.workstreamRAGs || []).map((w) => (
              <tr key={w.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{w.workstream?.name}</td>
                <td className="px-3 py-2 text-center"><RAGPill status={w.rag} /></td>
                <td className="px-3 py-2 text-center text-xs">{w.trend}</td>
                <td className="px-3 py-2 text-xs">{w.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <h3 className="text-sm uppercase font-bold mb-2 border-l-4 border-pgm pl-2">Done this week</h3>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-grey-light p-3 rounded">{r.doneThisWeek || '—'}</pre>
          </div>
          <div>
            <h3 className="text-sm uppercase font-bold mb-2 border-l-4 border-prj pl-2">Planned next week</h3>
            <pre className="text-sm whitespace-pre-wrap font-sans bg-grey-light p-3 rounded">{r.plannedNextWeek || '—'}</pre>
          </div>
        </div>

        {(r.decisions || []).length > 0 && (
          <>
            <h3 className="text-sm uppercase font-bold mt-4 mb-2 border-l-4 border-amber-text pl-2">Decisions needed</h3>
            <table className="w-full text-sm border border-gray-200 mb-4">
              <thead>
                <tr className="bg-grey-light text-xs uppercase text-grey">
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Recommendation</th>
                  <th className="px-3 py-2">Needed by</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {r.decisions!.map((d) => (
                  <tr key={d.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{d.description}</td>
                    <td className="px-3 py-2 text-xs">{d.recommendation}</td>
                    <td className="px-3 py-2 text-xs text-center">{format(parseISO(d.neededBy), 'd MMM')}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {(r.actions || []).length > 0 && (
          <>
            <h3 className="text-sm uppercase font-bold mt-4 mb-2 border-l-4 border-prj pl-2">Action items</h3>
            <table className="w-full text-sm border border-gray-200 mb-4">
              <thead>
                <tr className="bg-grey-light text-xs uppercase text-grey">
                  <th className="px-3 py-2 text-left">Description</th>
                  <th className="px-3 py-2 text-left">Owner</th>
                  <th className="px-3 py-2">Due</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {r.actions!.map((a) => (
                  <tr key={a.id} className="border-t border-gray-100">
                    <td className="px-3 py-2">{a.description}</td>
                    <td className="px-3 py-2">{a.ownerName}</td>
                    <td className="px-3 py-2 text-xs text-center">{format(parseISO(a.dueDate), 'd MMM')}</td>
                    <td className="px-3 py-2 text-center"><StatusBadge status={a.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {(r.risks || []).length > 0 && (
          <>
            <h3 className="text-sm uppercase font-bold mt-4 mb-2 border-l-4 border-danger pl-2">Risks linked</h3>
            <ul className="text-sm space-y-1">
              {r.risks!.map((rr) => (
                <li key={rr.risk.id}>
                  <RAGPill status={rr.risk.status} /> <strong>{rr.risk.type}:</strong> {rr.risk.title}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
