import { ReactNode } from 'react';

export default function TopBar({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-4">
      <div>
        <h1 className="text-xl font-bold text-dark">{title}</h1>
        {subtitle && <div className="text-sm text-grey">{subtitle}</div>}
      </div>
      {right && <div className="flex items-center gap-3">{right}</div>}
    </div>
  );
}
