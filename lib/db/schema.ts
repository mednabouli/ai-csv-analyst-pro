import {
  pgTable, text, timestamp, integer,
  varchar, vector, index
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdateFn(() => new Date()),
};

export const sessions = pgTable("csv_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: text("user_id").notNull(),
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  columnCount: integer("column_count").notNull().default(0),
  sizeBytes: integer("size_bytes").notNull().default(0),
  ...timestamps,
});

export const csvChunks = pgTable("csv_chunks", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: varchar("session_id", { length: 36 })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  chunkText: text("chunk_text").notNull(),
  chunkIndex: integer("chunk_index").notNull(),
  embedding: vector("embedding", { dimensions: 1536 }),
  ...timestamps,
}, (t) => [
  index("embedding_hnsw_idx").using("hnsw", t.embedding.op("vector_cosine_ops")),
]);

export const chatMessages = pgTable("chat_messages", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  sessionId: varchar("session_id", { length: 36 })
    .notNull()
    .references(() => sessions.id, { onDelete: "cascade" }),
  role: text("role", { enum: ["user", "assistant"] }).notNull(),
  content: text("content").notNull(),
  modelUsed: text("model_used"),
  tokensUsed: integer("tokens_used"),
  ...timestamps,
});
