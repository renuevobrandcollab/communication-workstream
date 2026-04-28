export default function LoadingSpinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center py-8 text-grey text-sm">
      <div className="animate-spin rounded-full h-5 w-5 border-2 border-prj border-t-transparent mr-2"></div>
      {label || 'Loading…'}
    </div>
  );
}
