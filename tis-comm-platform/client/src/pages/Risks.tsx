import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus, CheckCircle } from 'lucide-react';
import { api } from '../services/api';
import type { Risk, RiskType, Severity, RAGStatus } from '../types';
import RAGPill from '../components/UI/RAGPill';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal, { Drawer } from '../components/UI/Modal';
import { Field, inputClass } from '../components/UI/FormField';

export default function RisksPage({ code }: { code: string }) {
  const qc = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [drawer, setDrawer] = useState<Risk | 'new' | null>(null);
  const [resolveTarget, setResolveTarget] = useState<Risk | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | RiskType>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | RAGStatus>('ALL');

  const risksQ = useQuery({
    queryKey: ['risks', code, showResolved],
    queryFn: async () => {
      const params = showResolved ? '' : '?resolved=false';
      return (await api.get<{ risks: Risk[] }>(`/sites/${code}/risks${params}`)).data.risks;
    },
  });

  const save = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) await api.put(`/sites/${code}/risks/${data.id}`, data);
      else await api.post(`/sites/${code}/risks`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks', code] });
      setDrawer(null);
    },
  });

  const resolve = useMutation({
    mutationFn: async ({ id, resolution }: { id: string; resolution: string }) => {
      await api.post(`/sites/${code}/risks/${id}/resolve`, { resolution });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['risks', code] });
      setResolveTarget(null);
    },
  });

  if (risksQ.isLoading) return <LoadingSpinner />;
  const risks = (risksQ.data || []).filter((r) => {
    if (filterType !== 'ALL' && r.type !== filterType) return false;
    if (filterStatus !== 'ALL' && r.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <select className={inputClass + ' !w-auto'} value={filterType} onChange={(e) => setFilterType(e.target.value as any)}>
            <option value="ALL">All types</option>
            <option value="RISK">Risks</option>
            <option value="ISSUE">Issues</option>
          </select>
          <select className={inputClass + ' !w-auto'} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)}>
            <option value="ALL">All RAG</option>
            <option value="GREEN">Green</option>
            <option value="AMBER">Amber</option>
            <option value="RED">Red</option>
          </select>
          <label className="text-sm flex items-center gap-1 ml-2">
            <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} />
            Show resolved
          </label>
        </div>
        <button onClick={() => setDrawer('new')} className="bg-prj text-white hover:bg-prj/90 rounded px-3 py-1.5 text-sm flex items-center gap-1">
          <Plus size={14} /> Add risk / issue
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-grey-light text-grey uppercase text-xs">
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Title</th>
              <th className="px-3 py-2">Impact</th>
              <th className="px-3 py-2">Probability</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Owner</th>
              <th className="px-3 py-2">Due</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id} className={`border-t border-gray-100 ${r.resolved ? 'opacity-50' : ''}`}>
                <td className="px-3 py-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${r.type === 'ISSUE' ? 'bg-danger-light text-danger' : 'bg-prj-lighter text-prj'}`}>{r.type}</span>
                </td>
                <td className="px-3 py-2 font-medium cursor-pointer hover:underline" onClick={() => setDrawer(r)}>{r.title}</td>
                <td className="px-3 py-2">{r.impact}</td>
                <td className="px-3 py-2">{r.probability}</td>
                <td className="px-3 py-2"><RAGPill status={r.status} /></td>
                <td className="px-3 py-2 text-xs">{r.ownerName}</td>
                <td className="px-3 py-2 text-xs text-grey">{r.dueDate ? format(parseISO(r.dueDate), 'd MMM yyyy') : '—'}</td>
                <td className="px-3 py-2">
                  {!r.resolved && (
                    <button className="text-xs flex items-center gap-1 text-pgm hover:underline" onClick={() => setResolveTarget(r)}>
                      <CheckCircle size={12} /> Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {risks.length === 0 && <div className="text-center text-grey py-8 text-sm">No risks or issues.</div>}
      </div>

      <Drawer open={drawer !== null} title={drawer === 'new' ? 'Add risk / issue' : 'Edit risk / issue'} onClose={() => setDrawer(null)}>
        {drawer && (
          <RiskForm
            initial={drawer === 'new' ? null : drawer}
            onSubmit={(d) => save.mutate(d)}
            busy={save.isPending}
          />
        )}
      </Drawer>

      <Modal open={!!resolveTarget} title="Resolve risk" onClose={() => setResolveTarget(null)}>
        {resolveTarget && (
          <ResolveForm
            onSubmit={(resolution) => resolve.mutate({ id: resolveTarget.id, resolution })}
            busy={resolve.isPending}
          />
        )}
      </Modal>
    </div>
  );
}

function RiskForm({ initial, onSubmit, busy }: { initial: Risk | null; onSubmit: (d: any) => void; busy: boolean }) {
  const [type, setType] = useState<RiskType>(initial?.type || 'RISK');
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [impact, setImpact] = useState<Severity>(initial?.impact || 'MEDIUM');
  const [probability, setProbability] = useState<Severity>(initial?.probability || 'MEDIUM');
  const [status, setStatus] = useState<RAGStatus>(initial?.status || 'AMBER');
  const [mitigation, setMitigation] = useState(initial?.mitigation || '');
  const [ownerName, setOwnerName] = useState(initial?.ownerName || '');
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.slice(0, 10) : '');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ id: initial?.id, type, title, description, impact, probability, status, mitigation, ownerName, dueDate: dueDate || null }); }}>
      <Field label="Type">
        <div className="flex gap-2">
          {(['RISK', 'ISSUE'] as RiskType[]).map((t) => (
            <button key={t} type="button" className={`px-3 py-1.5 rounded text-sm ${type === t ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`} onClick={() => setType(t)}>{t}</button>
          ))}
        </div>
      </Field>
      <Field label="Title">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="Description">
        <textarea className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      </Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Impact">
          <select className={inputClass} value={impact} onChange={(e) => setImpact(e.target.value as Severity)}>
            <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select>
        </Field>
        <Field label="Probability">
          <select className={inputClass} value={probability} onChange={(e) => setProbability(e.target.value as Severity)}>
            <option>HIGH</option><option>MEDIUM</option><option>LOW</option>
          </select>
        </Field>
        <Field label="RAG">
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value as RAGStatus)}>
            <option>GREEN</option><option>AMBER</option><option>RED</option>
          </select>
        </Field>
      </div>
      <Field label="Mitigation">
        <textarea className={inputClass} value={mitigation} onChange={(e) => setMitigation(e.target.value)} rows={2} />
      </Field>
      <Field label="Owner">
        <input className={inputClass} value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
      </Field>
      <Field label="Due date">
        <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
      </Field>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Save'}
      </button>
    </form>
  );
}

function ResolveForm({ onSubmit, busy }: { onSubmit: (resolution: string) => void; busy: boolean }) {
  const [resolution, setResolution] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(resolution); }}>
      <Field label="Resolution note">
        <textarea className={inputClass} value={resolution} onChange={(e) => setResolution(e.target.value)} rows={4} required />
      </Field>
      <button type="submit" className="bg-pgm text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>
        {busy ? 'Resolving…' : 'Resolve'}
      </button>
    </form>
  );
}
