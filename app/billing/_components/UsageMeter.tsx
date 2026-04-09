"use client";

interface Props {
  usage: { uploadsUsed: number; queriesUsed: number; tokensUsed: number };
  plan: { monthlyUploads: number; monthlyQueries: number; name: string };
}

function Meter({ label, used, max }: { label: string; used: number; max: number }) {
  const pct = Math.min(100, Math.round((used / max) * 100));
  const color = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-primary";

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">{used.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-xs text-muted-foreground">{pct}% used this month</p>
    </div>
  );
}

export function UsageMeter({ usage, plan }: Props) {
  return (
    <div className="p-6 rounded-[var(--radius-card)] border shadow-[var(--shadow-card)] space-y-6">
      <h2 className="text-lg font-semibold">{"This month's usage"}</h2>
      <Meter label="CSV Uploads" used={usage.uploadsUsed} max={plan.monthlyUploads} />
      <Meter label="AI Queries" used={usage.queriesUsed} max={plan.monthlyQueries} />
      <p className="text-xs text-muted-foreground pt-2">
        Tokens used: {usage.tokensUsed.toLocaleString()} · Resets on the 1st of each month
      </p>
    </div>
  );
}
