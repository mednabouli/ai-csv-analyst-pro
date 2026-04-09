"use server";
import { db } from "@/lib/db";
import { sessions, chatMessages, csvChunks } from "@/lib/db/schema";
import { eq, desc, and, lt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import type { Message } from "ai";

export const PAGE_SIZE = 20;

export type SessionRow = {
  id: string;
  fileName: string;
  rowCount: number;
  columnCount: number;
  sizeBytes: number;
  createdAt: Date;
};

export type SessionPage = {
  sessions: SessionRow[];
  hasMore: boolean;
  nextCursor: Date | null;
};

const SESSION_COLS = {
  id:          sessions.id,
  fileName:    sessions.fileName,
  rowCount:    sessions.rowCount,
  columnCount: sessions.columnCount,
  sizeBytes:   sessions.sizeBytes,
  createdAt:   sessions.createdAt,
};

export async function getUserSessionsAction(): Promise<SessionPage> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { sessions: [], hasMore: false, nextCursor: null };

  // Fetch PAGE_SIZE + 1 to detect whether more pages exist
  const rows = await db
    .select(SESSION_COLS)
    .from(sessions)
    .where(eq(sessions.userId, session.user.id))
    .orderBy(desc(sessions.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page    = rows.slice(0, PAGE_SIZE);
  return {
    sessions:   page,
    hasMore,
    nextCursor: hasMore ? page[page.length - 1].createdAt : null,
  };
}

export async function getMoreSessionsAction(cursor: Date): Promise<SessionPage> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { sessions: [], hasMore: false, nextCursor: null };

  const rows = await db
    .select(SESSION_COLS)
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, session.user.id),
        lt(sessions.createdAt, cursor)         // strictly older than cursor
      )
    )
    .orderBy(desc(sessions.createdAt))
    .limit(PAGE_SIZE + 1);

  const hasMore = rows.length > PAGE_SIZE;
  const page    = rows.slice(0, PAGE_SIZE);
  return {
    sessions:   page,
    hasMore,
    nextCursor: hasMore ? page[page.length - 1].createdAt : null,
  };
}

export async function getSessionMessagesAction(sessionId: string): Promise<Message[]> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return [];

  const owned = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, session.user.id)))
    .limit(1);
  if (!owned.length) return [];

  const rows = await db
    .select({ id: chatMessages.id, role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(chatMessages.createdAt);

  return rows.map((r) => ({
    id: r.id,
    role: r.role as "user" | "assistant",
    content: r.content,
  }));
}

export async function renameSessionAction(sessionId: string, name: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;
  const trimmed = name.trim().slice(0, 128);
  if (!trimmed) return;
  await db
    .update(sessions)
    .set({ fileName: trimmed })
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, session.user.id)));
  revalidatePath("/dashboard");
}

export async function deleteSessionAction(sessionId: string): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return;
  await db.delete(chatMessages).where(eq(chatMessages.sessionId, sessionId));
  await db.delete(csvChunks).where(eq(csvChunks.sessionId, sessionId));
  await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, session.user.id)));
  revalidatePath("/dashboard");
}
