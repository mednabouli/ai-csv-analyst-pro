function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

function SidebarSkeleton() {
  return (
    <aside className="hidden md:flex flex-col w-64 border-r bg-background shrink-0 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <Sk className="h-5 w-20" />
        <Sk className="h-6 w-6 rounded-lg" />
      </div>
      {/* New button */}
      <div className="px-3 py-2">
        <Sk className="h-9 w-full" />
      </div>
      {/* Session groups */}
      <div className="flex-1 px-2 space-y-4 pt-2">
        {[["Today", 2], ["Yesterday", 3], ["This week", 4]].map(([label, count]) => (
          <div key={label as string}>
            <Sk className="h-3 w-16 mx-2 mb-2" />
            <div className="space-y-1">
              {Array.from({ length: count as number }).map((_, i) => (
                <div key={i} className="flex items-center gap-2 px-2 py-2">
                  <Sk className="h-4 w-4 shrink-0" />
                  <div className="flex-1 space-y-1">
                    <Sk className="h-3.5 w-full" />
                    <Sk className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function MainSkeleton() {
  return (
    <main className="flex-1 flex flex-col min-w-0">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Sk className="h-5 w-5" />
          <Sk className="h-5 w-40" />
        </div>
        <div className="flex gap-2">
          <Sk className="h-8 w-32 rounded" />
          <Sk className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      {/* Upload zone placeholder */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-4">
          <div className="text-center space-y-2">
            <Sk className="h-7 w-48 mx-auto" />
            <Sk className="h-4 w-36 mx-auto" />
          </div>
          <div className="p-12 border-2 border-dashed rounded-[var(--radius-card)] flex flex-col items-center gap-4">
            <Sk className="h-10 w-10 rounded-full" />
            <Sk className="h-4 w-36" />
            <Sk className="h-3.5 w-48" />
          </div>
        </div>
      </div>
    </main>
  );
}

export default function DashboardLoading() {
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <SidebarSkeleton />
      <MainSkeleton />
    </div>
  );
}
