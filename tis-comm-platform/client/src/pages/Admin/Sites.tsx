import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus, Edit2 } from 'lucide-react';
import { api } from '../../services/api';
import type { Site, Phase } from '../../types';
import TopBar from '../../components/Layout/TopBar';
import LoadingSpinner from '../../components/UI/LoadingSpinner';
import { Drawer } from '../../components/UI/Modal';
import { Field, inputClass } from '../../components/UI/FormField';

const PHASES: Phase[] = ['ASSESS', 'PREPARE', 'DEMONSTRATE', 'BUILD', 'TEST_AND_TRAIN', 'DEPLOY', 'OPERATE'];

export default function AdminSites() {
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<Site | 'new' | null>(null);

  const sQ = useQuery({
    queryKey: ['sites'],
    queryFn: async () => (await api.get<{ sites: Site[] }>('/sites')).data.sites,
  });

  const save = useMutation({
    mutationFn: async (data: any) => {
      if (data.code && data.id) await api.put(`/sites/${data.code}`, data);
      else await api.post('/sites', data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sites'] });
      setDrawer(null);
    },
  });

  if (sQ.isLoading) return <LoadingSpinner />;
  const sites = sQ.data || [];

  return (
    <div>
      <TopBar
        title="Admin · Sites"
        right={
          <button onClick={() => setDrawer('new')} className="bg-prj text-white rounded px-3 py-1.5 text-sm flex items-center gap-1">
            <Plus size={14} /> Add site
          </button>
        }
      />
      <div className="p-6">
        <div className="bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-grey-light text-grey uppercase text-xs">
                <th className="px-3 py-2">Site</th>
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2">Phase</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Go-Live</th>
                <th className="px-3 py-2">PM</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => {
                const pm = s.users?.find((u) => u.role === 'PROJECT_MANAGER')?.user.name || '—';
                return (
                  <tr key={s.id} className="border-t border-gray-100">
                    <td className="px-3 py-2 font-medium">{s.name}</td>
                    <td className="px-3 py-2">{s.code}</td>
                    <td className="px-3 py-2">{s.country}</td>
                    <td className="px-3 py-2"><span className="text-xs bg-prj-lighter text-prj px-2 py-0.5 rounded">{s.currentPhase.replace(/_/g, ' ')}</span></td>
                    <td className="px-3 py-2 text-xs">{s.status}</td>
                    <td className="px-3 py-2 text-xs text-grey">{s.goLiveDate ? format(parseISO(s.goLiveDate), 'd MMM yyyy') : '—'}</td>
                    <td className="px-3 py-2 text-xs">{pm}</td>
                    <td className="px-3 py-2"><button onClick={() => setDrawer(s)} className="text-prj"><Edit2 size={14} /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <Drawer open={drawer !== null} title={drawer === 'new' ? 'Add site' : 'Edit site'} onClose={() => setDrawer(null)}>
        {drawer && <SiteForm initial={drawer === 'new' ? null : drawer} onSubmit={(d) => save.mutate(d)} busy={save.isPending} />}
      </Drawer>
    </div>
  );
}

function SiteForm({ initial, onSubmit, busy }: { initial: Site | null; onSubmit: (d: any) => void; busy: boolean }) {
  const [name, setName] = useState(initial?.name || '');
  const [code, setCode] = useState(initial?.code || '');
  const [country, setCountry] = useState(initial?.country || '');
  const [currentPhase, setCurrentPhase] = useState<Phase>(initial?.currentPhase || 'ASSESS');
  const [kickoffDate, setKickoffDate] = useState(initial?.kickoffDate?.slice(0, 10) || '');
  const [goLiveDate, setGoLiveDate] = useState(initial?.goLiveDate?.slice(0, 10) || '');

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ id: initial?.id, code, name, country, currentPhase, kickoffDate, goLiveDate }); }}>
      <Field label="Site name"><input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required /></Field>
      <Field label="Code (3-letter)"><input className={inputClass} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={3} required disabled={!!initial} /></Field>
      <Field label="Country (ISO)"><input className={inputClass} value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} maxLength={2} required /></Field>
      <Field label="Current phase">
        <select className={inputClass} value={currentPhase} onChange={(e) => setCurrentPhase(e.target.value as Phase)}>
          {PHASES.map((p) => <option key={p}>{p}</option>)}
        </select>
      </Field>
      <Field label="Kick-off date"><input type="date" className={inputClass} value={kickoffDate} onChange={(e) => setKickoffDate(e.target.value)} /></Field>
      <Field label="Go-live date"><input type="date" className={inputClass} value={goLiveDate} onChange={(e) => setGoLiveDate(e.target.value)} /></Field>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
    </form>
  );
}
