import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, endOfWeek } from 'date-fns';
import { Save, Send, Plus } from 'lucide-react';
import { api } from '../../services/api';
import type { WeeklyReport, RAGStatus, Trend, ActionStatus, Workstream } from '../../types';
import { useSite } from '../../hooks/useSite';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import RAGPill from '../../components/UI/RAGPill';
import { Field, inputClass } from '../../components/UI/FormField';
import WeeklyReportView from './WeeklyReportView';

export default function WeeklyReportPage({ code }: { code: string }) {
  const [view, setView] = useState<'form' | 'view'>('view');
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('view')} className={`px-3 py-1.5 rounded text-sm ${view === 'view' ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`}>Report View</button>
        <button onClick={() => setView('form')} className={`px-3 py-1.5 rounded text-sm ${view === 'form' ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`}>Entry Form</button>
      </div>
      {view === 'view' ? <WeeklyReportView code={code} /> : <ReportForm code={code} />}
    </div>
  );
}

function ReportForm({ code }: { code: string }) {
  const qc = useQueryClient();
  const siteQ = useSite(code);
  const reportQ = useQuery({
    queryKey: ['report', code, 'latest'],
    queryFn: async () => (await api.get<{ report: WeeklyReport | null }>(`/sites/${code}/reports/latest`)).data.report,
  });

  const [activeReport, setActiveReport] = useState<WeeklyReport | null>(null);
  const [overallRAG, setOverallRAG] = useState<RAGStatus>('GREEN');
  const [doneThisWeek, setDoneThisWeek] = useState('');
  const [plannedNextWeek, setPlannedNextWeek] = useState('');
  const [keyMessage, setKeyMessage] = useState('');
  const [wsRAGs, setWsRAGs] = useState<Array<{ id?: string; workstreamId: string; rag: RAGStatus; trend: Trend; comment: string; name?: string }>>([]);
  const [actions, setActions] = useState<Array<{ id?: string; description: string; ownerName: string; dueDate: string; status: ActionStatus }>>([]);
  const [decisions, setDecisions] = useState<Array<{ id?: string; description: string; context: string; recommendation: string; neededBy: string; decidedBy: string; status: string }>>([]);

  const createOrUseExisting = useMutation({
    mutationFn: async () => {
      const today = new Date();
      const ws = startOfWeek(today, { weekStartsOn: 1 });
      const we = endOfWeek(today, { weekStartsOn: 1 });
      // Reuse latest if it's this week
      if (reportQ.data && format(parseISO(reportQ.data.weekStart), 'yyyy-MM-dd') === format(ws, 'yyyy-MM-dd')) {
        return reportQ.data;
      }
      const { data } = await api.post(`/sites/${code}/reports`, {
        weekStart: ws.toISOString(),
        weekEnd: we.toISOString(),
        weekNumber: Math.ceil((today.getTime() - new Date(today.getFullYear(), 0, 1).getTime()) / (7 * 86400000)),
        overallRAG: 'GREEN',
      });
      return data.report as WeeklyReport;
    },
    onSuccess: async (r) => {
      const { data } = await api.get<{ report: WeeklyReport }>(`/sites/${code}/reports/${r.id}`);
      hydrate(data.report);
    },
  });

  function hydrate(r: WeeklyReport) {
    setActiveReport(r);
    setOverallRAG(r.overallRAG);
    setDoneThisWeek(r.doneThisWeek);
    setPlannedNextWeek(r.plannedNextWeek);
    setKeyMessage(r.keyMessage);
    setWsRAGs((r.workstreamRAGs || []).map((w) => ({
      id: w.id,
      workstreamId: w.workstreamId,
      rag: w.rag,
      trend: w.trend,
      comment: w.comment,
      name: w.workstream?.name,
    })));
    setActions((r.actions || []).map((a) => ({
      id: a.id,
      description: a.description,
      ownerName: a.ownerName,
      dueDate: a.dueDate.slice(0, 10),
      status: a.status,
    })));
    setDecisions((r.decisions || []).map((d) => ({
      id: d.id,
      description: d.description,
      context: d.context,
      recommendation: d.recommendation,
      neededBy: d.neededBy.slice(0, 10),
      decidedBy: d.decidedBy,
      status: d.status,
    })));
  }

  // Auto-load if a report exists
  useEffect(() => {
    if (reportQ.data && !activeReport) {
      hydrate(reportQ.data);
    }
  }, [reportQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!activeReport) throw new Error('No report');
      const { data } = await api.put(`/sites/${code}/reports/${activeReport.id}`, {
        overallRAG, doneThisWeek, plannedNextWeek, keyMessage,
        workstreamRAGs: wsRAGs,
        actions, decisions,
      });
      return data.report as WeeklyReport;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['report', code] });
      hydrate(r);
    },
  });

  const submit = useMutation({
    mutationFn: async () => {
      await save.mutateAsync();
      if (activeReport) await api.post(`/sites/${code}/reports/${activeReport.id}/submit`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['report', code] }),
  });

  if (siteQ.isLoading || reportQ.isLoading) return <LoadingSpinner />;
  const site = siteQ.data!;

  if (!activeReport) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg p-6 text-center">
        <p className="text-grey mb-3">No active report for this week.</p>
        <button onClick={() => createOrUseExisting.mutate()} className="bg-prj text-white rounded px-4 py-2 text-sm">
          {createOrUseExisting.isPending ? 'Creating…' : 'Start new weekly report'}
        </button>
      </div>
    );
  }

  const charsLeft = 200 - keyMessage.length;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs text-grey">Week of</div>
        <div className="font-semibold">{format(parseISO(activeReport.weekStart), 'd MMM')} – {format(parseISO(activeReport.weekEnd), 'd MMM yyyy')}</div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs uppercase font-bold text-grey mb-3">Overall RAG</div>
        <div className="flex gap-3">
          {(['GREEN', 'AMBER', 'RED'] as RAGStatus[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setOverallRAG(r)}
              className={`flex-1 py-3 rounded font-bold text-sm ${
                overallRAG === r
                  ? r === 'GREEN' ? 'bg-pgm text-white' : r === 'AMBER' ? 'bg-amber-text text-white' : 'bg-danger text-white'
                  : 'bg-grey-light text-grey'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm uppercase font-bold mb-3 border-l-4 border-prj pl-2">Workstreams</h3>
        <div className="space-y-2">
          {wsRAGs.map((w, i) => (
            <div key={w.workstreamId} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center text-sm">
              <div className="md:col-span-3 font-medium">{w.name}</div>
              <select className={inputClass + ' md:col-span-2'} value={w.rag} onChange={(e) => setWsRAGs(wsRAGs.map((x, ix) => ix === i ? { ...x, rag: e.target.value as RAGStatus } : x))}>
                <option>GREEN</option><option>AMBER</option><option>RED</option>
              </select>
              <select className={inputClass + ' md:col-span-2'} value={w.trend} onChange={(e) => setWsRAGs(wsRAGs.map((x, ix) => ix === i ? { ...x, trend: e.target.value as Trend } : x))}>
                <option>IMPROVING</option><option>STABLE</option><option>WORSENING</option>
              </select>
              <input className={inputClass + ' md:col-span-5'} placeholder="Comment" value={w.comment} onChange={(e) => setWsRAGs(wsRAGs.map((x, ix) => ix === i ? { ...x, comment: e.target.value } : x))} />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <Field label="Done this week">
            <textarea className={inputClass} rows={6} value={doneThisWeek} onChange={(e) => setDoneThisWeek(e.target.value)} placeholder="What was completed this week? Be specific." />
          </Field>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <Field label="Planned next week">
            <textarea className={inputClass} rows={6} value={plannedNextWeek} onChange={(e) => setPlannedNextWeek(e.target.value)} placeholder="What's planned for next week?" />
          </Field>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <Field label="Key message" hint={`${charsLeft} chars left`}>
          <input className={inputClass} maxLength={200} value={keyMessage} onChange={(e) => setKeyMessage(e.target.value)} placeholder="One sentence executive summary" />
        </Field>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm uppercase font-bold border-l-4 border-prj pl-2">Decisions needed</h3>
          <button onClick={() => setDecisions([...decisions, { description: '', context: '', recommendation: '', neededBy: new Date().toISOString().slice(0, 10), decidedBy: '', status: 'OPEN' }])} className="text-xs flex items-center gap-1 text-prj"><Plus size={12} /> Add</button>
        </div>
        <div className="space-y-3">
          {decisions.map((d, i) => (
            <div key={i} className="border border-gray-200 rounded p-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <input className={inputClass} placeholder="Description" value={d.description} onChange={(e) => setDecisions(decisions.map((x, ix) => ix === i ? { ...x, description: e.target.value } : x))} />
              <input type="date" className={inputClass} value={d.neededBy} onChange={(e) => setDecisions(decisions.map((x, ix) => ix === i ? { ...x, neededBy: e.target.value } : x))} />
              <input className={inputClass} placeholder="Context" value={d.context} onChange={(e) => setDecisions(decisions.map((x, ix) => ix === i ? { ...x, context: e.target.value } : x))} />
              <input className={inputClass} placeholder="Recommendation" value={d.recommendation} onChange={(e) => setDecisions(decisions.map((x, ix) => ix === i ? { ...x, recommendation: e.target.value } : x))} />
              <input className={inputClass} placeholder="Decided by" value={d.decidedBy} onChange={(e) => setDecisions(decisions.map((x, ix) => ix === i ? { ...x, decidedBy: e.target.value } : x))} />
              <select className={inputClass} value={d.status} onChange={(e) => setDecisions(decisions.map((x, ix) => ix === i ? { ...x, status: e.target.value } : x))}>
                <option>OPEN</option><option>DECIDED</option><option>DEFERRED</option>
              </select>
            </div>
          ))}
          {decisions.length === 0 && <div className="text-grey text-sm">No decisions needed.</div>}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm uppercase font-bold border-l-4 border-prj pl-2">Actions</h3>
          <button onClick={() => setActions([...actions, { description: '', ownerName: '', dueDate: new Date().toISOString().slice(0, 10), status: 'OPEN' }])} className="text-xs flex items-center gap-1 text-prj"><Plus size={12} /> Add</button>
        </div>
        <div className="space-y-2">
          {actions.map((a, i) => (
            <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 text-sm">
              <input className={inputClass + ' md:col-span-5'} placeholder="Description" value={a.description} onChange={(e) => setActions(actions.map((x, ix) => ix === i ? { ...x, description: e.target.value } : x))} />
              <input className={inputClass + ' md:col-span-3'} placeholder="Owner" value={a.ownerName} onChange={(e) => setActions(actions.map((x, ix) => ix === i ? { ...x, ownerName: e.target.value } : x))} />
              <input type="date" className={inputClass + ' md:col-span-2'} value={a.dueDate} onChange={(e) => setActions(actions.map((x, ix) => ix === i ? { ...x, dueDate: e.target.value } : x))} />
              <select className={inputClass + ' md:col-span-2'} value={a.status} onChange={(e) => setActions(actions.map((x, ix) => ix === i ? { ...x, status: e.target.value as ActionStatus } : x))}>
                <option>OPEN</option><option>IN_PROGRESS</option><option>DONE</option><option>OVERDUE</option>
              </select>
            </div>
          ))}
          {actions.length === 0 && <div className="text-grey text-sm">No actions.</div>}
        </div>
      </div>

      <div className="flex gap-3 sticky bottom-4">
        <button onClick={() => save.mutate()} disabled={save.isPending} className="bg-grey text-white rounded px-4 py-2 text-sm flex items-center gap-1"><Save size={14} /> {save.isPending ? 'Saving…' : 'Save Draft'}</button>
        <button onClick={() => submit.mutate()} disabled={submit.isPending} className="bg-prj text-white rounded px-4 py-2 text-sm flex items-center gap-1"><Send size={14} /> {submit.isPending ? 'Submitting…' : 'Submit'}</button>
      </div>
    </div>
  );
}
