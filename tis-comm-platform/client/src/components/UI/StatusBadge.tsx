import type { CommStatus, MilestoneStatus, EscalationStatus, ActionStatus, ReportStatus } from '../../types';

type Any = CommStatus | MilestoneStatus | EscalationStatus | ActionStatus | ReportStatus | string;

const map: Record<string, string> = {
  PLANNED: 'bg-gray-100 text-gray-600',
  DUE: 'bg-amber text-amber-text',
  IN_PROGRESS: 'bg-prj-lighter text-prj',
  PENDING_APPROVAL: 'bg-amber text-amber-text',
  SENT: 'bg-pgm-lighter text-pgm',
  OVERDUE: 'bg-danger-light text-danger',
  SKIPPED: 'bg-gray-100 text-gray-500 line-through',

  ON_TRACK: 'bg-pgm-lighter text-pgm',
  AT_RISK: 'bg-amber text-amber-text',
  COMPLETED: 'bg-dark text-white',
  DELAYED: 'bg-danger-light text-danger',

  OPEN: 'bg-danger-light text-danger',
  ACKNOWLEDGED: 'bg-amber text-amber-text',
  RESOLVED: 'bg-pgm-lighter text-pgm',
  CLOSED: 'bg-gray-100 text-gray-600',

  DONE: 'bg-pgm-lighter text-pgm',

  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-prj-lighter text-prj',
  APPROVED: 'bg-pgm-lighter text-pgm',
};

export default function StatusBadge({ status }: { status: Any }) {
  const cls = map[status] ?? 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
