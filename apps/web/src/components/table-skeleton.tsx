export function TableSkeleton({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="animate-pulse space-y-2 rounded-xl border border-slate-200 bg-white p-4">
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-3">
          {Array.from({ length: cols }).map((__, colIndex) => (
            <div key={colIndex} className="h-8 flex-1 rounded bg-slate-200" />
          ))}
        </div>
      ))}
    </div>
  );
}
