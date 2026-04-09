"use server";
import { db } from "@/lib/db";
import { sessions, csvChunks } from "@/lib/db/schema";
import { parseCSV, chunkRows } from "@/lib/rag/chunk";
import { generateEmbeddings } from "@/lib/rag/embed";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { v4 as uuid } from "uuid";
import { checkUploadLimit, incrementUsage } from "@/lib/billing";

export type UploadState = {
  sessionId?: string;
  fileName?: string;
  rowCount?: number;
  error?: string;
  upgradeRequired?: boolean;
} | null;

export async function uploadCSVAction(_prev: UploadState, formData: FormData): Promise<UploadState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { error: "Not authenticated" };

  const file = formData.get("file") as File;
  if (!file?.name) return { error: "No file provided" };
  if (!file.name.endsWith(".csv")) return { error: "Only .csv files are accepted" };

  const fileSizeMb = file.size / (1024 * 1024);
  const bytes = Buffer.from(await file.arrayBuffer());

  let parsed;
  try { parsed = parseCSV(bytes); }
  catch { return { error: "Failed to parse CSV. Ensure it is valid UTF-8 with headers." }; }

  const { data, meta } = parsed;
  if (data.length === 0) return { error: "CSV file is empty" };

  // Billing check
  const limitCheck = await checkUploadLimit(session.user.id, fileSizeMb, meta.rowCount);
  if (!limitCheck.allowed) {
    return { error: limitCheck.reason, upgradeRequired: true };
  }

  const chunks = chunkRows(data, meta.columns, 50);
  const embeddings = await generateEmbeddings(chunks.map(c => c.text));
  const sessionId = uuid();

  await db.transaction(async (tx) => {
    await tx.insert(sessions).values({
      id: sessionId,
      userId: session.user.id,
      fileName: file.name,
      rowCount: meta.rowCount,
      columnCount: meta.columnCount,
      sizeBytes: file.size,
    });
    await tx.insert(csvChunks).values(
      chunks.map((chunk, i) => ({
        sessionId,
        chunkText: chunk.text,
        chunkIndex: i,
        embedding: embeddings[i],
      }))
    );
  });

  await incrementUsage(session.user.id, "upload");

  return { sessionId, fileName: file.name, rowCount: meta.rowCount };
}
