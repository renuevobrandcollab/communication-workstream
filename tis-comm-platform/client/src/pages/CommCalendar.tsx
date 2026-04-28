import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO, startOfWeek, endOfWeek, addWeeks } from 'date-fns';
import { ChevronLeft, ChevronRight, Send, Plus } from 'lucide-react';
import { api } from '../services/api';
import type { CommEvent, CommStatus } from '../types';
import StatusBadge from '../components/UI/StatusBadge';
import LoadingSpinner from '../components/UI/LoadingSpinner';
import Modal, { Drawer } from '../components/UI/Modal';
import { Field, inputClass } from '../components/UI/FormField';

const STATUS_FILTERS: Array<CommStatus | 'ALL'> = [
  'ALL',
  'PLANNED',
  'DUE',
  'IN_PROGRESS',
  'PENDING_APPROVAL',
  'SENT',
  'OVERDUE',
  'SKIPPED',
];

export default function CommCalendar({ code }: { code: string }) {
  const qc = useQueryClient();
  const [weekOffset, setWeekOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [search, setSearch] = useState('');
  const [logEvent, setLogEvent] = useState<CommEvent | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const eventsQ = useQuery({
    queryKey: ['comm', code],
    queryFn: async () => (await api.get<{ events: CommEvent[] }>(`/sites/${code}/comm-events`)).data.events,
  });

  const logSent = useMutation({
    mutationFn: async (input: { id: string; sentDate: string; approvedBy: string; archivedPath: string; notes: string }) => {
      await api.post(`/sites/${code}/comm-events/${input.id}/log-sent`, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm', code] });
      setLogEvent(null);
    },
  });

  const create = useMutation({
    mutationFn: async (input: { templateCode: string; title: string; dueDate: string }) => {
      await api.post(`/sites/${code}/comm-events`, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['comm', code] });
      setShowAdd(false);
    },
  });

  if (eventsQ.isLoading) return <LoadingSpinner />;
  const events = eventsQ.data || [];

  const today = new Date();
  const weekStart = startOfWeek(addWeeks(today, weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const filtered = events.filter((e) => {
    if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
    if (search && !`${e.templateCode} ${e.title}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const thisWeek = events.filter((e) => {
    const d = parseISO(e.dueDate);
    return d >= weekStart && d <= weekEnd;
  });
  const byStatus = thisWeek.reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button className="border rounded px-2 py-1" onClick={() => setWeekOffset(weekOffset - 1)}>
              <ChevronLeft size={16} />
            </button>
            <button className="border rounded px-3 py-1 text-sm" onClick={() => setWeekOffset(0)}>
              Current week
            </button>
            <button className="border rounded px-2 py-1" onClick={() => setWeekOffset(weekOffset + 1)}>
              <ChevronRight size={16} />
            </button>
            <div className="text-sm text-grey ml-2">
              {format(weekStart, 'd MMM')} – {format(weekEnd, 'd MMM yyyy')}
            </div>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <select className={inputClass + ' !w-auto'} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <input
              className={inputClass + ' !w-48'}
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button
              onClick={() => setShowAdd(true)}
              className="bg-prj text-white hover:bg-prj/90 rounded px-3 py-1.5 text-sm flex items-center gap-1"
            >
              <Plus size={14} /> Add
            </button>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left bg-grey-light text-grey uppercase text-xs">
                <th className="px-3 py-2">Code</th>
                <th className="px-3 py-2">Title</th>
                <th className="px-3 py-2">Due</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr key={e.id} className={`border-t border-gray-100 ${e.status === 'OVERDUE' ? 'bg-danger-light' : ''}`}>
                  <td className="px-3 py-2 font-bold">{e.templateCode}</td>
                  <td className="px-3 py-2">{e.title}</td>
                  <td className="px-3 py-2 text-xs text-grey">{format(parseISO(e.dueDate), 'd MMM yyyy')}</td>
                  <td className="px-3 py-2"><StatusBadge status={e.status} /></td>
                  <td className="px-3 py-2">
                    {!['SENT', 'SKIPPED'].includes(e.status) && (
                      <button
                        className="text-xs flex items-center gap-1 text-prj hover:underline"
                        onClick={() => setLogEvent(e)}
                      >
                        <Send size={12} /> Log as sent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="text-center text-grey py-8 text-sm">No communications match.</div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-sm uppercase tracking-wide mb-3">Due this week</h3>
        {Object.keys(byStatus).length === 0 ? (
          <div className="text-grey text-sm">Nothing due this week.</div>
        ) : (
          <ul className="space-y-2 text-sm">
            {Object.entries(byStatus).map(([s, n]) => (
              <li key={s} className="flex items-center justify-between">
                <StatusBadge status={s} />
                <span className="font-bold">{n}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={!!logEvent} title="Log as sent" onClose={() => setLogEvent(null)}>
        {logEvent && (
          <LogSentForm
            event={logEvent}
            onSubmit={(data) => logSent.mutate({ id: logEvent.id, ...data })}
            busy={logSent.isPending}
          />
        )}
      </Modal>

      <Drawer open={showAdd} title="Add communication" onClose={() => setShowAdd(false)}>
        <AddCommForm onSubmit={(d) => create.mutate(d)} busy={create.isPending} />
      </Drawer>
    </div>
  );
}

function LogSentForm({ event, onSubmit, busy }: { event: CommEvent; onSubmit: (d: any) => void; busy: boolean }) {
  const [sentDate, setSentDate] = useState(new Date().toISOString().slice(0, 10));
  const [approvedBy, setApprovedBy] = useState('');
  const [archivedPath, setArchivedPath] = useState('');
  const [notes, setNotes] = useState('');
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ sentDate, approvedBy, archivedPath, notes }); }}>
      <div className="text-sm text-grey mb-3">{event.templateCode} — {event.title}</div>
      <Field label="Sent date">
        <input type="date" className={inputClass} value={sentDate} onChange={(e) => setSentDate(e.target.value)} required />
      </Field>
      <Field label="Approved by">
        <input className={inputClass} value={approvedBy} onChange={(e) => setApprovedBy(e.target.value)} placeholder="Name / role" />
      </Field>
      <Field label="SharePoint archive path">
        <input className={inputClass} value={archivedPath} onChange={(e) => setArchivedPath(e.target.value)} placeholder="https://…" />
      </Field>
      <Field label="Notes">
        <textarea className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
      </Field>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Mark as Sent'}
      </button>
    </form>
  );
}

function AddCommForm({ onSubmit, busy }: { onSubmit: (d: any) => void; busy: boolean }) {
  const [templateCode, setTemplateCode] = useState('WSR-001');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().slice(0, 10));
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ templateCode, title, dueDate }); }}>
      <Field label="Template code">
        <input className={inputClass} value={templateCode} onChange={(e) => setTemplateCode(e.target.value)} required />
      </Field>
      <Field label="Title">
        <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} required />
      </Field>
      <Field label="Due date">
        <input type="date" className={inputClass} value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
      </Field>
      <button type="submit" className="bg-prj text-white rounded px-4 py-2 text-sm w-full" disabled={busy}>
        {busy ? 'Saving…' : 'Add'}
      </button>
    </form>
  );
}
