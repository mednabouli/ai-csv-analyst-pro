import { Suspense } from "react";
import { use } from "react";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";
import { DashboardClient } from "./_components/DashboardClient";

async function getRecentSessions(userId: string) {
  return db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt)).limit(10);
}

function RecentSessions({ promise }: { promise: ReturnType<typeof getRecentSessions> }) {
  const data = use(promise);
  if (data.length === 0) return <p className="text-sm text-muted-foreground">No sessions yet.</p>;
  return (
    <ul className="space-y-2">
      {data.map(s => (
        <li key={s.id} className="text-sm p-2 rounded hover:bg-muted cursor-pointer transition-colors">
          <p className="font-medium truncate">{s.fileName}</p>
          <p className="text-xs text-muted-foreground">{s.rowCount.toLocaleString()} rows</p>
        </li>
      ))}
    </ul>
  );
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const sessionsPromise = getRecentSessions(session.user.id);

  return (
    <main className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-72 border-r flex flex-col p-4 gap-4">
        <div className="flex items-center justify-between">
          <h1 className="font-bold text-lg">CSV Analyst Pro</h1>
        </div>
        <div className="flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Recent Sessions</p>
          <Suspense fallback={<div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-10 rounded bg-muted animate-pulse" />)}</div>}>
            <RecentSessions promise={sessionsPromise} />
          </Suspense>
        </div>
        <div className="border-t pt-3">
          <p className="text-sm font-medium truncate">{session.user.email}</p>
          <a href="/api/auth/signout" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Sign out</a>
        </div>
      </aside>
      {/* Main content — client component handles upload + chat state */}
      <DashboardClient />
    </main>
  );
}
