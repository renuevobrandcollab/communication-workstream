import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import { useSite } from '../hooks/useSite';
import type { Milestone, Phase } from '../types';
import StatusBadge from '../components/UI/StatusBadge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal from '../components/UI/Modal';
import { Field, inputClass } from '../components/UI/FormField';

const PHASES: Phase[] = ['ASSESS', 'PREPARE', 'DEMONSTRATE', 'BUILD', 'TEST_AND_TRAIN', 'DEPLOY', 'OPERATE'];

export default function MilestonesPage({ code }: { code: string }) {
  const qc = useQueryClient();
  const siteQ = useSite(code);
  const [completing, setCompleting] = useState<Milestone | null>(null);

  const mQ = useQuery({
    queryKey: ['milestones', code],
    queryFn: async () => (await api.get<{ milestones: Milestone[] }>(`/sites/${code}/milestones`)).data.milestones,
  });

  const complete = useMutation({
    mutationFn: async ({ id, actualDate, notes }: { id: string; actualDate: string; notes: string }) => {
      await api.post(`/sites/${code}/milestones/${id}/complete`, { actualDate, notes });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['milestones', code] });
      qc.invalidateQueries({ queryKey: ['comm', code] });
      setCompleting(null);
    },
  });

  if (mQ.isLoading || siteQ.isLoading) return <LoadingSpinner />;
  const milestones = mQ.data || [];
  const site = siteQ.data!;

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="text-xs uppercase tracking-wide text-grey mb-3">Phase progress</div>
        <div className="flex items-center">
          {PHASES.map((p, i) => (
            <div key={p} className="flex-1 text-center">
              <div className={`mx-auto w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                p === site.currentPhase ? 'bg-prj text-white' : i < PHASES.indexOf(site.currentPhase as Phase) ? 'bg-pgm text-white' : 'bg-grey-light text-grey'
              }`}>
                {i + 1}
              </div>
              <div className={`text-[10px] mt-1 ${p === site.currentPhase ? 'font-bold text-prj' : 'text-grey'}`}>
                {p.replace(/_/g, ' ')}
              </div>
              {i < PHASES.length - 1 && <div className="h-px bg-gray-200 -mt-3 mx-auto"></div>}
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {milestones.map((m) => (
          <div key={m.id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center gap-4">
            <div className="text-2xl font-bold text-gate w-16">{m.gate}</div>
            <div className="flex-1">
              <div className="font-semibold">{m.name}</div>
              <div className="text-xs text-grey mt-1">
                Planned: {format(parseISO(m.plannedDate), 'd MMM yyyy')}
                {m.actualDate && ` · Actual: ${format(parseISO(m.actualDate), 'd MMM yyyy')}`}
              </div>
              {m.notes && <div className="text-xs mt-1 italic">{m.notes}</div>}
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={m.status} />
              {m.commSent && <span className="text-xs bg-pgm-lighter text-pgm px-2 py-0.5 rounded">Comm sent</span>}
              {(m.status === 'PLANNED' || m.status === 'ON_TRACK' || m.status === 'AT_RISK') && (
                <button onClick={() => setCompleting(m)} className="text-xs flex items-center gap-1 text-pgm hover:underline">
                  <CheckCircle size={12} /> Mark complete
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <Modal open={!!completing} title={`Complete ${completing?.gate}`} onClose={() => setCompleting(null)}>
        {completing && (
          <CompleteForm onSubmit={(d) => complete.mutate({ id: completing.id, ...d })} busy={complete.isPending} />
        )}
      </Modal>
    </div>
  );
}

function CompleteForm({ onSubmit, busy }: { onSubmit: (d: { actualDate: string; notes: string }) => void; busy: boolean }) {
  const [actualDate, setActualDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ actualDate, notes }); }}>
      <Field label="Actual completion date">
        <input type="date" className={inputClass} value={actualDate} onChange={(e) => setActualDate(e.target.value)} required />
      </Field>
      <Field label="Notes">
        <textarea className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </Field>
      <button type="submit" className="bg-pgm text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Mark complete & generate gate communication'}
      </button>
    </form>
  );
}
