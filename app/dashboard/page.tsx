import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "./_components/DashboardShell";
import { PAGE_SIZE } from "@/app/actions/sessions";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const rows = await db
    .select({
      id:          sessions.id,
      fileName:    sessions.fileName,
      rowCount:    sessions.rowCount,
      columnCount: sessions.columnCount,
      sizeBytes:   sessions.sizeBytes,
      createdAt:   sessions.createdAt,
    })
    .from(sessions)
    .where(eq(sessions.userId, session.user.id))
    .orderBy(desc(sessions.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasMore    = rows.length > PAGE_SIZE;
  const page       = rows.slice(0, PAGE_SIZE);
  const nextCursor = hasMore ? page[page.length - 1].createdAt : null;

  return (
    <DashboardShell
      user={session.user}
      initialSessions={page}
      initialHasMore={hasMore}
      initialNextCursor={nextCursor}
    />
  );
}
