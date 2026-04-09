function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function BillingLoading() {
  return (
    <main className="max-w-4xl mx-auto p-8 space-y-10">
      {/* Header */}
      <div className="space-y-2">
        <Sk className="h-8 w-32" />
        <Sk className="h-4 w-64" />
      </div>

      {/* Current plan card */}
      <div className="p-6 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1.5">
            <Sk className="h-4 w-24" />
            <Sk className="h-7 w-20" />
          </div>
          <Sk className="h-9 w-28" />
        </div>
        {/* Usage bars */}
        {[1,2,3].map(i => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <Sk className="h-3.5 w-20" />
              <Sk className="h-3.5 w-16" />
            </div>
            <Sk className="h-2 w-full rounded-full" />
          </div>
        ))}
      </div>

      {/* Plan cards */}
      <div className="grid md:grid-cols-3 gap-4">
        {[1,2,3].map(i => (
          <div key={i} className="p-6 rounded-[var(--radius-card)] border space-y-4">
            <div className="space-y-1.5">
              <Sk className="h-5 w-20" />
              <Sk className="h-8 w-16" />
            </div>
            <div className="space-y-2">
              {[1,2,3,4,5].map(j => <Sk key={j} className="h-3.5 w-full" />)}
            </div>
            <Sk className="h-10 w-full" />
          </div>
        ))}
      </div>
    </main>
  );
}
