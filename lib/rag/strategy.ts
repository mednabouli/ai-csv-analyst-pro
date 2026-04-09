import { db } from "@/lib/db";
import { csvChunks } from "@/lib/db/schema";
import { eq, asc, desc, gt, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { generateEmbedding } from "./embed";

const LARGE_CTX_PROVIDERS = new Set([
  "gemma26b", "gemma31b", "gemma26b_api", "gemma31b_api",
]);

export async function buildRAGContext(
  sessionId: string,
  query: string,
  provider: string
): Promise<string> {
  const useFullCtx = LARGE_CTX_PROVIDERS.has(provider);

  if (useFullCtx) {
    const allChunks = await db
      .select({ text: csvChunks.chunkText })
      .from(csvChunks)
      .where(eq(csvChunks.sessionId, sessionId))
      .orderBy(asc(csvChunks.chunkIndex));

    const fullText = allChunks.map(c => c.text).join("

");
    if (fullText.length < 800_000) return fullText;
  }

  // pgvector similarity search fallback
  const queryEmbedding = await generateEmbedding(query);
  const similarity = sql<number>`1 - (${cosineDistance(csvChunks.embedding, queryEmbedding)})`;

  const results = await db
    .select({ text: csvChunks.chunkText, similarity })
    .from(csvChunks)
    .where(gt(similarity, 0.4))
    .orderBy(desc(similarity))
    .limit(5);

  return results.map(r => r.text).join("

---

");
}
