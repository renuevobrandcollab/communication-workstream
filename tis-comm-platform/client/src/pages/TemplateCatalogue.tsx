import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, Check, X } from 'lucide-react';
import { api } from '../services/api';
import type { Template, CommEvent } from '../types';
import TopBar from '../components/Layout/TopBar';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import { inputClass } from '../components/UI/FormField';

const GROUP_COLOR: Record<string, string> = {
  'Governance & Team': 'text-prj border-prj',
  'Business-Facing': 'text-pgm border-pgm',
  'Gate Communications': 'text-gate border-gate',
  'Go-Live Sequence': 'text-danger border-danger',
  'End User Journey': 'text-eu border-eu',
  'Program': 'text-prj border-prj',
  'Governance & Measurement': 'text-grey border-grey',
};

export default function TemplateCatalogue() {
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [layerFilter, setLayerFilter] = useState('ALL');
  const [siteCode, setSiteCode] = useState('');

  const tQ = useQuery({
    queryKey: ['templates'],
    queryFn: async () => (await api.get<{ templates: Template[] }>('/templates')).data.templates,
  });

  const dueQ = useQuery({
    queryKey: ['templates', 'due', siteCode],
    enabled: !!siteCode,
    queryFn: async () => (await api.get<{ templates: Template[]; events: CommEvent[] }>(`/templates/due?siteCode=${siteCode}`)).data,
  });

  if (tQ.isLoading) return <LoadingSpinner />;
  const templates = tQ.data || [];
  const groups = Array.from(new Set(templates.map((t) => t.group)));

  const filtered = templates.filter((t) => {
    if (groupFilter !== 'ALL' && t.group !== groupFilter) return false;
    if (layerFilter !== 'ALL' && t.layer !== layerFilter) return false;
    if (search && !`${t.code} ${t.name} ${t.owner}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const grouped: Record<string, Template[]> = {};
  filtered.forEach((t) => {
    if (!grouped[t.group]) grouped[t.group] = [];
    grouped[t.group].push(t);
  });

  return (
    <div>
      <TopBar title="Template Catalogue" subtitle="29 communication templates — TIS D365 framework" />
      <div className="p-6 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <div className="text-xs uppercase font-bold text-grey mb-2">What's due this week?</div>
          <div className="flex gap-2">
            <input className={inputClass + ' !w-40'} placeholder="Site code (e.g. VRN)" value={siteCode} onChange={(e) => setSiteCode(e.target.value.toUpperCase())} />
          </div>
          {siteCode && dueQ.data && (
            <div className="mt-3 text-sm">
              {dueQ.data.events.length === 0 ? (
                <div className="text-grey">Nothing due this week for {siteCode}.</div>
              ) : (
                <ul className="space-y-1">
                  {dueQ.data.events.map((e) => (
                    <li key={e.id}><strong>{e.templateCode}</strong> — {e.title}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap gap-3 items-center">
          <input className={inputClass + ' !w-64'} placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className={inputClass + ' !w-auto'} value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)}>
            <option value="ALL">All groups</option>
            {groups.map((g) => <option key={g}>{g}</option>)}
          </select>
          <select className={inputClass + ' !w-auto'} value={layerFilter} onChange={(e) => setLayerFilter(e.target.value)}>
            <option value="ALL">All layers</option>
            <option value="PRJ">PRJ</option>
            <option value="PGM">PGM</option>
          </select>
        </div>

        {Object.entries(grouped).map(([group, items]) => (
          <div key={group}>
            <h2 className={`text-sm uppercase font-bold mb-3 border-l-4 pl-2 ${GROUP_COLOR[group] || 'text-prj border-prj'}`}>{group} ({items.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((t) => <TemplateCard key={t.code} template={t} />)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const [open, setOpen] = useState(false);
  const colour = GROUP_COLOR[template.group] || 'text-prj';
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <div className={`text-xs font-bold ${colour}`}>{template.code}</div>
          <div className="font-semibold mt-0.5">{template.name}</div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="text-[10px] bg-grey-light text-grey px-1.5 py-0.5 rounded">Owner: {template.owner}</span>
            <span className="text-[10px] bg-grey-light text-grey px-1.5 py-0.5 rounded">{template.format.split('—')[0]}</span>
            <span className="text-[10px] bg-prj-lighter text-prj px-1.5 py-0.5 rounded">{template.frequency}</span>
            <span className="text-[10px] bg-grey-light text-grey px-1.5 py-0.5 rounded">{template.layer}</span>
          </div>
        </div>
        <button onClick={() => setOpen(!open)} className="text-grey hover:text-dark">
          {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>
      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs space-y-3">
          <div><strong>Timing:</strong> {template.timing}</div>
          <div><strong>Format:</strong> {template.format}</div>
          <div><strong>Tone:</strong> <em>{template.tone}</em></div>
          <div><strong>Approver:</strong> {template.approver}</div>
          <div><strong>WBS:</strong> {template.wbsRef}</div>
          <div>
            <strong className="text-pgm">Mandatory:</strong>
            <ul className="mt-1 space-y-0.5">
              {template.mandatory.map((m) => (
                <li key={m} className="flex items-start gap-1.5"><Check size={12} className="text-pgm mt-0.5 shrink-0" /><span>{m}</span></li>
              ))}
            </ul>
          </div>
          <div>
            <strong className="text-danger">Forbidden:</strong>
            <ul className="mt-1 space-y-0.5">
              {template.forbidden.map((m) => (
                <li key={m} className="flex items-start gap-1.5"><X size={12} className="text-danger mt-0.5 shrink-0" /><span>{m}</span></li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
