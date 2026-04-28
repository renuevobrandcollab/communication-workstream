import { ReactNode } from 'react';

export function Field({
  label,
  error,
  children,
  hint,
}: {
  label: string;
  error?: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="block mb-3 text-sm">
      <span className="text-dark font-medium">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && !error && <span className="text-xs text-grey">{hint}</span>}
      {error && <span className="text-xs text-danger">{error}</span>}
    </label>
  );
}

export const inputClass =
  'w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-prj';
