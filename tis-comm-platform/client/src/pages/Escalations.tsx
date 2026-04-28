import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { api } from '../services/api';
import type { Escalation, EscalationStatus } from '../types';
import StatusBadge from '../components/UI/StatusBadge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { Drawer } from '../components/UI/Modal';
import { Field, inputClass } from '../components/UI/FormField';

export default function EscalationsPage({ code }: { code: string }) {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [resolving, setResolving] = useState<Escalation | null>(null);

  const eQ = useQuery({
    queryKey: ['escalations', code],
    queryFn: async () => (await api.get<{ escalations: Escalation[] }>(`/sites/${code}/escalations`)).data.escalations,
  });

  const create = useMutation({
    mutationFn: async (d: any) => api.post(`/sites/${code}/escalations`, d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalations', code] });
      setShowForm(false);
    },
  });
  const update = useMutation({
    mutationFn: async ({ id, ...rest }: any) => api.put(`/sites/${code}/escalations/${id}`, rest),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['escalations', code] });
      setResolving(null);
    },
  });

  if (eQ.isLoading) return <LoadingSpinner />;
  const escalations = eQ.data || [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div className="text-sm text-grey">{escalations.length} escalation(s)</div>
        <button onClick={() => setShowForm(true)} className="bg-prj text-white hover:bg-prj/90 rounded px-3 py-1.5 text-sm flex items-center gap-1">
          <Plus size={14} /> Raise escalation
        </button>
      </div>

      <div className="space-y-2">
        {escalations.map((e) => (
          <div key={e.id} className="bg-white border border-gray-200 rounded-lg">
            <button onClick={() => setExpanded(expanded === e.id ? null : e.id)} className="w-full flex items-center gap-3 p-3 text-left">
              {expanded === e.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
              <div className="flex-1">
                <div className="font-semibold text-sm">{e.title}</div>
                <div className="text-xs text-grey">Raised by {e.raisedBy?.name || '—'} · Decision needed by {format(parseISO(e.decisionNeededBy), 'd MMM yyyy')}</div>
              </div>
              <StatusBadge status={e.status} />
            </button>
            {expanded === e.id && (
              <div className="border-t border-gray-100 p-4 text-sm space-y-2">
                <div><strong>Issue:</strong> {e.issueSummary}</div>
                <div><strong>Impact:</strong> {e.impact}</div>
                <div><strong>Options:</strong> {e.options}</div>
                <div><strong>Recommendation:</strong> {e.recommendation}</div>
                <div><strong>Decision from:</strong> {e.decisionNeededFrom}</div>
                {e.resolution && <div><strong>Resolution:</strong> {e.resolution}</div>}
                <div className="flex gap-2 pt-2">
                  {e.status === 'OPEN' && (
                    <button onClick={() => update.mutate({ id: e.id, status: 'ACKNOWLEDGED' })} className="text-xs bg-amber text-amber-text px-2 py-1 rounded">Acknowledge</button>
                  )}
                  {e.status !== 'RESOLVED' && e.status !== 'CLOSED' && (
                    <button onClick={() => setResolving(e)} className="text-xs bg-pgm text-white px-2 py-1 rounded">Add resolution</button>
                  )}
                  {e.status === 'RESOLVED' && (
                    <button onClick={() => update.mutate({ id: e.id, status: 'CLOSED' })} className="text-xs bg-grey-light text-grey px-2 py-1 rounded">Close</button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
        {escalations.length === 0 && <div className="text-center text-grey py-8 text-sm bg-white rounded-lg">No escalations.</div>}
      </div>

      <Drawer open={showForm} title="Raise escalation" onClose={() => setShowForm(false)}>
        <EscalationForm onSubmit={(d) => create.mutate(d)} busy={create.isPending} />
      </Drawer>

      <Drawer open={!!resolving} title="Add resolution" onClose={() => setResolving(null)}>
        {resolving && (
          <ResolveForm onSubmit={(resolution) => update.mutate({ id: resolving.id, resolution, status: 'RESOLVED' })} busy={update.isPending} />
        )}
      </Drawer>
    </div>
  );
}

function EscalationForm({ onSubmit, busy }: { onSubmit: (d: any) => void; busy: boolean }) {
  const [title, setTitle] = useState('');
  const [issueSummary, setIssueSummary] = useState('');
  const [impact, setImpact] = useState('');
  const [options, setOptions] = useState('');
  const [recommendation, setRecommendation] = useState('');
  const [decisionNeededBy, setDecisionNeededBy] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [decisionNeededFrom, setDecisionNeededFrom] = useState('');

  const summaryLeft = 300 - issueSummary.length;

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ title, issueSummary, impact, options, recommendation, decisionNeededBy, decisionNeededFrom }); }}>
      <Field label="Title"><input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required /></Field>
      <Field label="Issue summary (2 sentences max)" hint={`${summaryLeft} chars left`}>
        <textarea className={inputClass} maxLength={300} value={issueSummary} onChange={(e) => setIssueSummary(e.target.value)} rows={3} required />
      </Field>
      <Field label="Impact"><textarea className={inputClass} value={impact} onChange={(e) => setImpact(e.target.value)} rows={2} required /></Field>
      <Field label="Options" hint="List the options you considered"><textarea className={inputClass} value={options} onChange={(e) => setOptions(e.target.value)} rows={3} required /></Field>
      <Field label="Recommendation"><textarea className={inputClass} value={recommendation} onChange={(e) => setRecommendation(e.target.value)} rows={2} required /></Field>
      <Field label="Decision needed by"><input type="date" className={inputClass} value={decisionNeededBy} onChange={(e) => setDecisionNeededBy(e.target.value)} required /></Field>
      <Field label="Decision needed from"><input className={inputClass} value={decisionNeededFrom} onChange={(e) => setDecisionNeededFrom(e.target.value)} placeholder="Role / name" required /></Field>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>{busy ? 'Saving…' : 'Submit escalation'}</button>
    </form>
  );
}

function ResolveForm({ onSubmit, busy }: { onSubmit: (r: string) => void; busy: boolean }) {
  const [resolution, setResolution] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(resolution); }}>
      <Field label="Resolution"><textarea className={inputClass} value={resolution} onChange={(e) => setResolution(e.target.value)} rows={5} required /></Field>
      <button type="submit" className="bg-pgm text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>{busy ? 'Saving…' : 'Resolve'}</button>
    </form>
  );
}
