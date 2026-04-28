import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { Plus } from 'lucide-react';
import { api } from '../services/api';
import type { KPIEntry, Survey, SurveyResponse, SurveyType } from '../types';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import KPIGaugeChart from '../components/Charts/KPIGaugeChart';
import { Field, inputClass } from '../components/UI/FormField';
import Modal from '../components/UI/Modal';

const QUARTERS = ['Q1 2026', 'Q2 2026', 'Q3 2026', 'Q4 2026'];

interface KPIDef {
  key: keyof KPIEntry;
  name: string;
  target: string;
  type: 'number' | 'pct' | 'bool';
  status: (v: any) => 'GREEN' | 'AMBER' | 'RED' | 'NA';
  color: string;
}

const KPIS: KPIDef[] = [
  {
    key: 'scAttendanceRate',
    name: 'SC attendance rate',
    target: '≥ 80%',
    type: 'pct',
    status: (v: number | null) => (v == null ? 'NA' : v >= 80 ? 'GREEN' : v >= 60 ? 'AMBER' : 'RED'),
    color: '#1E4D8C',
  },
  {
    key: 'trainingAttendance',
    name: 'Training attendance',
    target: '≥ 90%',
    type: 'pct',
    status: (v: number | null) => (v == null ? 'NA' : v >= 90 ? 'GREEN' : v >= 75 ? 'AMBER' : 'RED'),
    color: '#1D7A5F',
  },
  {
    key: 'bsbDeliveryRate',
    name: 'BSB delivery rate',
    target: '100%',
    type: 'pct',
    status: (v: number | null) => (v == null ? 'NA' : v === 100 ? 'GREEN' : v >= 80 ? 'AMBER' : 'RED'),
    color: '#D4860A',
  },
  {
    key: 'glSequenceOnTime',
    name: 'GL sequence on time',
    target: 'Yes',
    type: 'bool',
    status: (v: boolean | null) => (v == null ? 'NA' : v ? 'GREEN' : 'RED'),
    color: '#633806',
  },
  {
    key: 'unnecessaryEscalations',
    name: 'Unnecessary escalations',
    target: '0',
    type: 'number',
    status: (v: number | null) => (v == null ? 'NA' : v === 0 ? 'GREEN' : v === 1 ? 'AMBER' : 'RED'),
    color: '#C8472B',
  },
  {
    key: 'satisfactionScore',
    name: 'Satisfaction score (1–5)',
    target: '≥ 4.0',
    type: 'number',
    status: (v: number | null) => (v == null ? 'NA' : v >= 4 ? 'GREEN' : v >= 3 ? 'AMBER' : 'RED'),
    color: '#6B2D8C',
  },
  {
    key: 'commRelatedGLIssues',
    name: 'Comm-related GL issues',
    target: '0',
    type: 'number',
    status: (v: number | null) => (v == null ? 'NA' : v === 0 ? 'GREEN' : 'RED'),
    color: '#C8472B',
  },
];

function statusClass(s: string) {
  if (s === 'GREEN') return 'bg-pgm-lighter text-pgm';
  if (s === 'AMBER') return 'bg-amber text-amber-text';
  if (s === 'RED') return 'bg-danger-light text-danger';
  return 'bg-grey-light text-grey';
}

export default function KPIsPage({ code }: { code: string }) {
  const [tab, setTab] = useState<'tracker' | 'surveys'>('tracker');
  return (
    <div>
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('tracker')} className={`px-3 py-1.5 rounded text-sm ${tab === 'tracker' ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`}>KPI Tracker</button>
        <button onClick={() => setTab('surveys')} className={`px-3 py-1.5 rounded text-sm ${tab === 'surveys' ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`}>Surveys</button>
      </div>
      {tab === 'tracker' ? <KPITracker code={code} /> : <SurveysTab code={code} />}
    </div>
  );
}

function KPITracker({ code }: { code: string }) {
  const qc = useQueryClient();
  const [quarter, setQuarter] = useState('Q1 2026');

  const kQ = useQuery({
    queryKey: ['kpis', code],
    queryFn: async () => (await api.get<{ kpis: KPIEntry[] }>(`/sites/${code}/kpis`)).data.kpis,
  });

  const upsert = useMutation({
    mutationFn: async (data: any) => api.post(`/sites/${code}/kpis`, { ...data, quarter }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['kpis', code] }),
  });

  if (kQ.isLoading) return <LoadingSpinner />;
  const kpis = kQ.data || [];
  const current = kpis.find((k) => k.quarter === quarter);

  const chartData = QUARTERS.map((q) => {
    const k = kpis.find((x) => x.quarter === q) || ({} as KPIEntry);
    return { ...k, quarter: q };
  });

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div className="flex gap-2">
            {QUARTERS.map((q) => (
              <button key={q} onClick={() => setQuarter(q)} className={`px-3 py-1.5 rounded text-sm ${quarter === q ? 'bg-prj text-white' : 'bg-grey-light text-grey'}`}>{q}</button>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left bg-grey-light text-grey uppercase text-xs">
              <th className="px-3 py-2 w-10">#</th>
              <th className="px-3 py-2">KPI</th>
              <th className="px-3 py-2">Target</th>
              <th className="px-3 py-2">Actual</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {KPIS.map((def, i) => {
              const v = current ? (current as any)[def.key] : null;
              const status = def.status(v);
              return (
                <tr key={def.key} className="border-t border-gray-100">
                  <td className="px-3 py-2 text-grey">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{def.name}</td>
                  <td className="px-3 py-2">{def.target}</td>
                  <td className="px-3 py-2">
                    {def.type === 'bool' ? (
                      <select
                        className={inputClass + ' !w-auto !py-1'}
                        value={v == null ? '' : String(v)}
                        onChange={(e) => upsert.mutate({ ...current, [def.key]: e.target.value === '' ? null : e.target.value === 'true' })}
                      >
                        <option value="">—</option>
                        <option value="true">Yes</option>
                        <option value="false">No</option>
                      </select>
                    ) : (
                      <input
                        type="number"
                        className={inputClass + ' !w-24 !py-1'}
                        value={v == null ? '' : v}
                        onChange={(e) => upsert.mutate({ ...current, [def.key]: e.target.value === '' ? null : Number(e.target.value) })}
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${statusClass(status)}`}>{status}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm uppercase font-bold mb-3 border-l-4 border-prj pl-2">KPI trend</h3>
        <KPIGaugeChart
          data={chartData}
          series={KPIS.filter((k) => k.type !== 'bool').map((k) => ({ key: k.key as string, name: k.name, color: k.color }))}
        />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm uppercase font-bold mb-3 border-l-4 border-prj pl-2">Quarterly review checklist</h3>
        <ul className="space-y-2 text-sm">
          {[
            'Reviewed all 7 KPIs with actuals',
            'Identified root cause for any RED',
            'Agreed actions for next quarter',
            'Confirmed survey responses included',
            'Cross-checked with project SC',
            'Updated program dashboard',
            'Communicated outcome to Business Sponsor',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2">
              <input type="checkbox" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function SurveysTab({ code }: { code: string }) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const sQ = useQuery({
    queryKey: ['surveys', code],
    queryFn: async () => (await api.get<{ surveys: Survey[] }>(`/sites/${code}/surveys`)).data.surveys,
  });
  const create = useMutation({
    mutationFn: async (type: SurveyType) => api.post(`/sites/${code}/surveys`, { type }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['surveys', code] });
      setShowCreate(false);
    },
  });

  if (sQ.isLoading) return <LoadingSpinner />;
  const surveys = sQ.data || [];

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
        <div className="text-sm text-grey">{surveys.length} survey(s)</div>
        <button onClick={() => setShowCreate(true)} className="bg-prj text-white rounded px-3 py-1.5 text-sm flex items-center gap-1"><Plus size={14} /> Create survey</button>
      </div>
      {surveys.map((s) => (
        <SurveyCard key={s.id} survey={s} />
      ))}
      {surveys.length === 0 && <div className="text-center text-grey py-8 text-sm bg-white rounded-lg">No surveys yet.</div>}

      <Modal open={showCreate} title="Create survey" onClose={() => setShowCreate(false)}>
        <CreateSurveyForm onSubmit={(t) => create.mutate(t)} busy={create.isPending} />
      </Modal>
    </div>
  );
}

function SurveyCard({ survey }: { survey: Survey }) {
  const responses: SurveyResponse[] = survey.responses || [];
  const link = `${window.location.origin}/survey/${survey.id}/respond`;
  const avg = (k: 'q1Score' | 'q2Score' | 'q5Score') =>
    responses.length === 0 ? '—' : (responses.reduce((s, r) => s + r[k], 0) / responses.length).toFixed(1);

  const volumes = responses.reduce<Record<string, number>>((acc, r) => {
    acc[r.q4Volume] = (acc[r.q4Volume] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="font-semibold">{survey.type.replace(/_/g, ' ')}</div>
          <div className="text-xs text-grey">Sent {format(parseISO(survey.sentDate), 'd MMM yyyy')} · {responses.length} responses</div>
        </div>
        <a href={link} className="text-xs text-prj hover:underline" target="_blank" rel="noreferrer">{link}</a>
      </div>
      {responses.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-xs text-grey uppercase">Q1 Right time</div>
            <div className="text-lg font-bold">{avg('q1Score')}</div>
          </div>
          <div>
            <div className="text-xs text-grey uppercase">Q2 Clear info</div>
            <div className="text-lg font-bold">{avg('q2Score')}</div>
          </div>
          <div>
            <div className="text-xs text-grey uppercase">Q5 Overall</div>
            <div className="text-lg font-bold">{avg('q5Score')}</div>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs text-grey uppercase mb-1">Q4 Volume</div>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(volumes).map(([k, n]) => (
                <span key={k} className="text-xs bg-grey-light px-2 py-0.5 rounded">{k}: {n}</span>
              ))}
            </div>
          </div>
          <div className="md:col-span-3">
            <div className="text-xs text-grey uppercase mb-1">Q3 Open responses</div>
            <ul className="space-y-1">
              {responses.filter((r) => r.q3Text).map((r) => (
                <li key={r.id} className="text-xs italic border-l-2 border-prj pl-2">{r.q3Text}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateSurveyForm({ onSubmit, busy }: { onSubmit: (t: SurveyType) => void; busy: boolean }) {
  const [type, setType] = useState<SurveyType>('POST_KICKOFF');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(type); }}>
      <Field label="Survey type">
        <select className={inputClass} value={type} onChange={(e) => setType(e.target.value as SurveyType)}>
          <option value="POST_KICKOFF">Post Kick-off</option>
          <option value="POST_UAT">Post UAT</option>
          <option value="T_PLUS_30">T+30 (post Go-Live)</option>
        </select>
      </Field>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>{busy ? 'Creating…' : 'Create survey'}</button>
    </form>
  );
}
