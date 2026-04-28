import { ReactNode } from 'react';

export default function Card({
  title,
  children,
  accent,
  action,
}: {
  title?: string;
  children: ReactNode;
  accent?: 'prj' | 'pgm' | 'danger' | 'amber';
  action?: ReactNode;
}) {
  const accentClass = {
    prj: 'border-l-4 border-prj',
    pgm: 'border-l-4 border-pgm',
    danger: 'border-l-4 border-danger',
    amber: 'border-l-4 border-amber-text',
  };
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm ${
        accent ? accentClass[accent] : ''
      }`}
    >
      {(title || action) && (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          {title && <h3 className="font-semibold text-dark text-sm uppercase tracking-wide">{title}</h3>}
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
