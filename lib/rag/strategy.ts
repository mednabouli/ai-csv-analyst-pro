import { db } from "@/lib/db";
import { csvChunks } from "@/lib/db/schema";
import { eq, asc, and, sql } from "drizzle-orm";
import { cosineDistance } from "drizzle-orm";
import { generateEmbedding } from "./embed";

// Models with large enough context windows to receive the full CSV text.
// All others fall back to pgvector similarity search.
const LARGE_CTX_PROVIDERS = new Set([
  "gemma26b", "gemma31b", "gemma26b_api", "gemma31b_api",
]);

// Cosine distance threshold for similarity search.
// distance < 0.6  ≡  similarity > 0.4 (40% semantic match minimum).
const SIMILARITY_THRESHOLD = 0.6;
const TOP_K = 8;

export async function buildRAGContext(
  sessionId: string,
  query: string,
  provider: string
): Promise<string> {
  const useFullCtx = LARGE_CTX_PROVIDERS.has(provider);

  if (useFullCtx) {
    // Full-context path: return all chunks ordered by position.
    // sessionId filter ensures we only read THIS user's session.
    const allChunks = await db
      .select({ text: csvChunks.chunkText })
      .from(csvChunks)
      .where(eq(csvChunks.sessionId, sessionId))  // ← always scoped to session
      .orderBy(asc(csvChunks.chunkIndex));

    const fullText = allChunks.map((c) => c.text).join("\n\n");

    // Stay within typical context window limits (~800k chars ≈ ~600k tokens).
    if (fullText.length < 800_000) return fullText;
    // If the CSV is enormous, fall through to vector search.
  }

  // ── pgvector similarity search fallback ────────────────────────────────────
  const queryEmbedding = await generateEmbedding(query);

  // cosineDistance() returns a SQL expression, NOT a Drizzle column.
  // We cannot pass it to gt() (which expects a column ref).
  // Instead use a raw sql predicate directly on the expression.
  const distanceExpr = cosineDistance(csvChunks.embedding, queryEmbedding);

  const results = await db
    .select({ text: csvChunks.chunkText })
    .from(csvChunks)
    .where(
      and(
        eq(csvChunks.sessionId, sessionId),          // ← security: scope to session
        sql`${distanceExpr} < ${SIMILARITY_THRESHOLD}` // ← fix: sql predicate, not gt()
      )
    )
    .orderBy(distanceExpr)                            // ascending = most similar first
    .limit(TOP_K);

  if (results.length === 0) {
    // No close matches — broaden to TOP_K closest regardless of threshold.
    const fallback = await db
      .select({ text: csvChunks.chunkText })
      .from(csvChunks)
      .where(eq(csvChunks.sessionId, sessionId))
      .orderBy(distanceExpr)
      .limit(TOP_K);
    return fallback.map((r) => r.text).join("\n\n---\n\n");
  }

  return results.map((r) => r.text).join("\n\n---\n\n");
}
