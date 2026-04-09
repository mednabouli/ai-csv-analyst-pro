import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock DB with controllable chunk data ─────────────────────────────────────
const mockChunks: Array<{ chunkText: string; chunkIndex: number }> = [];

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => Promise.resolve(mockChunks.map(c => ({ text: c.chunkText })))),
          limit: vi.fn(() => Promise.resolve(mockChunks.slice(0, 5).map(c => ({ text: c.chunkText, similarity: 0.9 })))),
        })),
      })),
    })),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  csvChunks: { sessionId: "sessionId", chunkText: "chunkText", chunkIndex: "chunkIndex", embedding: "embedding" },
}));

vi.mock("@/lib/rag/embed", () => ({
  generateEmbedding: vi.fn(() => Promise.resolve(new Array(1536).fill(0.1))),
}));

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    cosineDistance: vi.fn(() => "cosine_distance_expr"),
  };
});

// ─────────────────────────────────────────────────────────────────────────────

describe("buildRAGContext", () => {
  beforeEach(() => {
    mockChunks.length = 0;
    for (let i = 0; i < 10; i++) {
      mockChunks.push({ chunkText: `chunk-${i} data`, chunkIndex: i });
    }
  });

  it("returns a non-empty string for large-context providers", async () => {
    const { buildRAGContext } = await import("@/lib/rag/strategy");
    const ctx = await buildRAGContext("session-1", "what is the average price?", "gemma26b");
    expect(typeof ctx).toBe("string");
    expect(ctx.length).toBeGreaterThan(0);
  });

  it("returns a non-empty string for non-large-context providers", async () => {
    const { buildRAGContext } = await import("@/lib/rag/strategy");
    const ctx = await buildRAGContext("session-1", "what is the average price?", "claude");
    expect(typeof ctx).toBe("string");
    expect(ctx.length).toBeGreaterThan(0);
  });

  it("joins chunks with separator for large-context path", async () => {
    const { buildRAGContext } = await import("@/lib/rag/strategy");
    const ctx = await buildRAGContext("session-2", "query", "gemma31b");
    expect(ctx).toContain("chunk-0 data");
  });
});
