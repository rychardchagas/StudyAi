export function CalendarSkeleton() {
  return (
    <div className="flex flex-col h-full animate-pulse p-4 gap-3">
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-16 rounded-lg bg-card" />
        ))}
      </div>
      <div className="flex-1 rounded-xl bg-card" />
    </div>
  );
}

export function DisciplineCardSkeleton() {
  return (
    <div className="bg-card border border-border rounded-xl p-4 animate-pulse">
      <div className="h-4 bg-card2 rounded w-3/4 mb-3" />
      <div className="grid grid-cols-3 gap-2 mb-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-card2 rounded-lg" />
        ))}
      </div>
      <div className="h-1 bg-card2 rounded mb-3" />
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-3 bg-card2 rounded w-full" />
        ))}
      </div>
    </div>
  );
}
