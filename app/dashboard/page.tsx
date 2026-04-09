import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { DashboardShell } from "./_components/DashboardShell";

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");

  const userSessions = await db
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
    .limit(100);

  return <DashboardShell user={session.user} initialSessions={userSessions} />;
}
