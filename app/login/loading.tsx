function Sk({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-muted ${className}`} />;
}

export default function LoginLoading() {
  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-6 p-8 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)]">
        <div className="space-y-2">
          <Sk className="h-7 w-40" />
          <Sk className="h-4 w-56" />
        </div>
        <div className="space-y-4">
          {[1,2].map(i => (
            <div key={i} className="space-y-1.5">
              <Sk className="h-4 w-16" />
              <Sk className="h-10 w-full" />
            </div>
          ))}
          <Sk className="h-10 w-full" />
        </div>
        <div className="space-y-2">
          <Sk className="h-10 w-full" />
          <Sk className="h-10 w-full" />
        </div>
      </div>
    </main>
  );
}
