import {
  pgTable, text, timestamp, integer,
  varchar, vector, index, boolean, pgEnum
} from "drizzle-orm/pg-core";

const timestamps = {
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull().$onUpdateFn(() => new Date()),
};

// ─── Enums ─────────────────────────────────────────────────────────────────
export const planEnum = pgEnum("plan_name", ["free", "starter", "pro", "enterprise"]);
export const subStatusEnum = pgEnum("subscription_status", [
  "active", "canceled", "past_due", "trialing", "incomplete",
]);

// ─── CSV Sessions ───────────────────────────────────────────────────────────
export const sessions = pgTable("csv_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: text("user_id").notNull(),
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  columnCount: integer("column_count").notNull().default(0),
  sizeBytes: integer("size_bytes").notNull().default(0),
  columns: text("columns").array(), // nullable for backward compat
  ...timestamps,
});

// ─── CSV Chunks + pgvector ──────────────────────────────────────────────────
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

// ─── Chat Messages ──────────────────────────────────────────────────────────
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

// ─── Plans ──────────────────────────────────────────────────────────────────
export const plans = pgTable("plans", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  name: planEnum("name").notNull().unique(),
  stripePriceId: text("stripe_price_id"),         // null = free
  stripeProductId: text("stripe_product_id"),
  monthlyUploads: integer("monthly_uploads").notNull(),
  monthlyQueries: integer("monthly_queries").notNull(),
  maxFileSizeMb: integer("max_file_size_mb").notNull(),
  maxRowsPerFile: integer("max_rows_per_file").notNull(),
  allowedProviders: text("allowed_providers").array().notNull(),
  ...timestamps,
});

// ─── Subscriptions ──────────────────────────────────────────────────────────
export const subscriptions = pgTable("subscriptions", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull().unique(),
  stripeCustomerId: text("stripe_customer_id").unique(),
  stripeSubscriptionId: text("stripe_subscription_id").unique(),
  planName: planEnum("plan_name").notNull().default("free"),
  status: subStatusEnum("status").notNull().default("active"),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  ...timestamps,
});

// ─── Usage Tracking ─────────────────────────────────────────────────────────
export const usageRecords = pgTable("usage_records", {
  id: integer("id").primaryKey().generatedAlwaysAsIdentity(),
  userId: text("user_id").notNull(),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  uploadsUsed: integer("uploads_used").notNull().default(0),
  queriesUsed: integer("queries_used").notNull().default(0),
  tokensUsed: integer("tokens_used").notNull().default(0),
  ...timestamps,
});
