import type { RAGStatus } from '../../types';

const cls: Record<RAGStatus, string> = {
  GREEN: 'bg-pgm-lighter text-pgm font-bold',
  AMBER: 'bg-amber text-amber-text font-bold',
  RED: 'bg-danger-light text-danger font-bold',
};

export default function RAGPill({ status }: { status: RAGStatus | null | undefined }) {
  if (!status) return <span className="text-grey text-xs">—</span>;
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs ${cls[status]}`}>{status}</span>
  );
}
