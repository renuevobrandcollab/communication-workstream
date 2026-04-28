import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Archive } from 'lucide-react';
import { api } from '../services/api';
import type { Stakeholder, InfluenceLevel, StakeholderLayer } from '../types';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { Drawer } from '../components/UI/Modal';
import { Field, inputClass } from '../components/UI/FormField';

export default function StakeholdersPage({ code }: { code: string }) {
  const qc = useQueryClient();
  const [view, setView] = useState<'matrix' | 'list'>('matrix');
  const [drawer, setDrawer] = useState<Stakeholder | 'new' | null>(null);

  const sQ = useQuery({
    queryKey: ['stakeholders', code],
    queryFn: async () => (await api.get<{ stakeholders: Stakeholder[] }>(`/sites/${code}/stakeholders`)).data.stakeholders,
  });

  const save = useMutation({
    mutationFn: async (data: any) => {
      if (data.id) await api.put(`/sites/${code}/stakeholders/${data.id}`, data);
      else await api.post(`/sites/${code}/stakeholders`, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['stakeholders', code] });
      setDrawer(null);
    },
  });

  const archive = useMutation({
    mutationFn: async (id: string) => api.delete(`/sites/${code}/stakeholders/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['stakeholders', code] }),
  });

  if (sQ.isLoading) return <LoadingSpinner />;
  const stakeholders = sQ.data || [];

  return (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setView('matrix')} className={`px-3 py-1.5 rounded text-sm ${view === 'matrix' ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`}>Matrix</button>
          <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded text-sm ${view === 'list' ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`}>List</button>
        </div>
        <button onClick={() => setDrawer('new')} className="bg-prj text-white hover:bg-prj/90 rounded px-3 py-1.5 text-sm flex items-center gap-1">
          <Plus size={14} /> Add stakeholder
        </button>
      </div>

      {view === 'matrix' ? (
        <Matrix stakeholders={stakeholders} onClick={(s) => setDrawer(s)} />
      ) : (
        <ListView stakeholders={stakeholders} onEdit={(s) => setDrawer(s)} onArchive={(id) => archive.mutate(id)} />
      )}

      <Drawer open={drawer !== null} title={drawer === 'new' ? 'Add stakeholder' : 'Edit stakeholder'} onClose={() => setDrawer(null)}>
        {drawer && (
          <StakeholderForm initial={drawer === 'new' ? null : drawer} onSubmit={(d) => save.mutate(d)} busy={save.isPending} />
        )}
      </Drawer>
    </div>
  );
}

function Matrix({ stakeholders, onClick }: { stakeholders: Stakeholder[]; onClick: (s: Stakeholder) => void }) {
  // Power = influence (Y), Interest (X)
  const quadrant = (s: Stakeholder) => {
    const high = (l: string) => l === 'HIGH';
    if (high(s.influence) && high(s.interest)) return 'closely';
    if (high(s.influence) && !high(s.interest)) return 'satisfied';
    if (!high(s.influence) && high(s.interest)) return 'informed';
    return 'monitor';
  };
  const cellClass = 'border border-gray-200 p-3 min-h-[140px] relative';
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="grid grid-cols-[60px_1fr_1fr] gap-2">
        <div></div>
        <div className="text-xs text-center text-grey font-semibold uppercase">Low interest</div>
        <div className="text-xs text-center text-grey font-semibold uppercase">High interest</div>

        <div className="flex items-center justify-center text-xs text-grey font-semibold uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>High power</div>
        <div className={cellClass}>
          <div className="text-xs font-semibold text-amber-text mb-2">Keep Satisfied</div>
          {stakeholders.filter((s) => quadrant(s) === 'satisfied').map((s) => (
            <Dot key={s.id} s={s} onClick={() => onClick(s)} />
          ))}
        </div>
        <div className={cellClass + ' bg-pgm-lighter/30'}>
          <div className="text-xs font-semibold text-pgm mb-2">Manage Closely</div>
          {stakeholders.filter((s) => quadrant(s) === 'closely').map((s) => (
            <Dot key={s.id} s={s} onClick={() => onClick(s)} />
          ))}
        </div>

        <div className="flex items-center justify-center text-xs text-grey font-semibold uppercase rotate-180" style={{ writingMode: 'vertical-rl' }}>Low power</div>
        <div className={cellClass}>
          <div className="text-xs font-semibold text-grey mb-2">Monitor</div>
          {stakeholders.filter((s) => quadrant(s) === 'monitor').map((s) => (
            <Dot key={s.id} s={s} onClick={() => onClick(s)} />
          ))}
        </div>
        <div className={cellClass}>
          <div className="text-xs font-semibold text-prj mb-2">Keep Informed</div>
          {stakeholders.filter((s) => quadrant(s) === 'informed').map((s) => (
            <Dot key={s.id} s={s} onClick={() => onClick(s)} />
          ))}
        </div>
      </div>
    </div>
  );
}

function Dot({ s, onClick }: { s: Stakeholder; onClick: () => void }) {
  return (
    <button onClick={onClick} className="block w-full text-left text-xs bg-white border border-prj rounded px-2 py-1 mb-1.5 hover:bg-prj-lighter">
      <span className="font-medium">{s.name}</span>
      <span className="text-grey block">{s.role}</span>
    </button>
  );
}

function ListView({ stakeholders, onEdit, onArchive }: { stakeholders: Stakeholder[]; onEdit: (s: Stakeholder) => void; onArchive: (id: string) => void }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left bg-grey-light text-grey uppercase text-xs">
            <th className="px-3 py-2">Name</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Org</th>
            <th className="px-3 py-2">Email</th>
            <th className="px-3 py-2">Layer</th>
            <th className="px-3 py-2">Key user</th>
            <th className="px-3 py-2">Influence</th>
            <th className="px-3 py-2">Interest</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {stakeholders.map((s) => (
            <tr key={s.id} className="border-t border-gray-100">
              <td className="px-3 py-2 font-medium">{s.name}</td>
              <td className="px-3 py-2">{s.role}</td>
              <td className="px-3 py-2 text-grey">{s.organization || '—'}</td>
              <td className="px-3 py-2 text-grey">{s.email || '—'}</td>
              <td className="px-3 py-2"><span className="text-xs bg-prj-lighter text-prj px-2 py-0.5 rounded">{s.layer}</span></td>
              <td className="px-3 py-2">{s.isKeyUser && <span className="text-xs bg-pgm-lighter text-pgm px-2 py-0.5 rounded">Key user</span>}</td>
              <td className="px-3 py-2">{s.influence}</td>
              <td className="px-3 py-2">{s.interest}</td>
              <td className="px-3 py-2 flex gap-1">
                <button onClick={() => onEdit(s)} className="text-prj hover:underline"><Edit2 size={14} /></button>
                <button onClick={() => onArchive(s.id)} className="text-danger hover:underline"><Archive size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {stakeholders.length === 0 && <div className="text-center text-grey py-8 text-sm">No stakeholders.</div>}
    </div>
  );
}

function StakeholderForm({ initial, onSubmit, busy }: { initial: Stakeholder | null; onSubmit: (d: any) => void; busy: boolean }) {
  const [name, setName] = useState(initial?.name || '');
  const [role, setRole] = useState(initial?.role || '');
  const [organization, setOrganization] = useState(initial?.organization || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [influence, setInfluence] = useState<InfluenceLevel>(initial?.influence || 'MEDIUM');
  const [interest, setInterest] = useState<InfluenceLevel>(initial?.interest || 'MEDIUM');
  const [layer, setLayer] = useState<StakeholderLayer>(initial?.layer || 'PROJECT');
  const [isKeyUser, setIsKeyUser] = useState(initial?.isKeyUser || false);
  const [engagementStrategy, setEngagementStrategy] = useState(initial?.engagementStrategy || '');
  const [keyMessages, setKeyMessages] = useState(initial?.keyMessages || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ id: initial?.id, name, role, organization, email, phone, influence, interest, layer, isKeyUser, engagementStrategy, keyMessages }); }}>
      <Field label="Name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <Field label="Role"><input className={inputClass} value={role} onChange={(e) => setRole(e.target.value)} required /></Field>
      <Field label="Organization"><input className={inputClass} value={organization} onChange={(e) => setOrganization(e.target.value)} /></Field>
      <Field label="Email"><input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
      <Field label="Phone"><input className={inputClass} value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
      <div className="grid grid-cols-3 gap-2">
        <Field label="Influence"><select className={inputClass} value={influence} onChange={(e) => setInfluence(e.target.value as InfluenceLevel)}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
        <Field label="Interest"><select className={inputClass} value={interest} onChange={(e) => setInterest(e.target.value as InfluenceLevel)}><option>HIGH</option><option>MEDIUM</option><option>LOW</option></select></Field>
        <Field label="Layer"><select className={inputClass} value={layer} onChange={(e) => setLayer(e.target.value as StakeholderLayer)}><option>PROJECT</option><option>PROGRAM</option><option>PARTNER</option></select></Field>
      </div>
      <label className="block mb-3 text-sm">
        <input type="checkbox" className="mr-2" checked={isKeyUser} onChange={(e) => setIsKeyUser(e.target.checked)} />
        Is Key User
      </label>
      <Field label="Engagement strategy"><textarea className={inputClass} value={engagementStrategy} onChange={(e) => setEngagementStrategy(e.target.value)} rows={2} /></Field>
      <Field label="Key messages"><textarea className={inputClass} value={keyMessages} onChange={(e) => setKeyMessages(e.target.value)} rows={2} /></Field>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
