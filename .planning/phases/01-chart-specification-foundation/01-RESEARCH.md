# Phase 1: Chart Specification Foundation - Research

**Researched:** 2026-04-21
**Domain:** Vercel AI SDK v4 tool definitions, Zod dynamic enums, Drizzle ORM query patterns, Recharts v2 installation
**Confidence:** HIGH (all critical claims verified against installed packages or official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Schema accepts all four chart types as a Zod enum: `z.enum(["bar", "line", "pie", "scatter"])`
- **D-02:** All chart types use a unified `x_column` / `y_column` field pair (no discriminated union). Pie charts use `x_column` for the label column and `y_column` for the value column.
- **D-03:** `title` is a **required** `z.string()` — AI always generates a chart title.
- **D-04:** `insight_caption` is an **optional** `z.string().optional()` field — defined now so Phase 4 can render it without a breaking schema change.
- **D-05:** `data` field contains the row payload inline.
- **D-06:** Build a **dynamic Zod enum at request time**: fetch the session's column list, then construct `z.enum([...columnNames])` for `x_column` and `y_column`.
- **D-07:** Column list is fetched from the **`csv_sessions` DB table** (not client-supplied). [SEE CRITICAL FINDING IN ARCHITECTURE SECTION]
- **D-08:** Column validation runs **after the billing check**.
- **D-09:** Invalid column names result in a **hard 400 rejection**: `Response.json({ error: "Invalid column: {name}" }, { status: 400 })`.
- **D-10:** Chart triggered **when the question implies comparison or trend**.
- **D-11:** Explicit chart type selection rules: bar→categories, line→time series, pie→parts of whole (≤6 categories), scatter→two numeric variables.
- **D-12:** System prompt: "Use EXACT column names from the CSV header row. Never paraphrase or infer column names."
- **D-13:** "Always answer the question in text first, then optionally call `chart_spec`."
- **D-14:** Cap at **200 rows**, first 200 by chunk order.
- **D-15:** Each row in `data` array includes **all columns**.
- **D-16:** Row data **embedded inline** in the `chart_spec` tool result.

### Claude's Discretion
- How exactly rows are fetched for the data payload (which Drizzle query, chunk ordering logic).
- Error message copy for the 400 validation response.
- Whether to add an `x_column`/`y_column` column-type check (numeric vs. categorical) beyond name validation.

### Deferred Ideas (OUT OF SCOPE)
- Numeric type validation on x_column/y_column beyond column-name validation.
- Multiple charts per message.
- Histogram, box plot, heatmap chart types.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHART-01 | Install and configure Recharts v2.15 as the charting library | Verified: recharts@2.15.4 exists, React 19 peer dep satisfied. Install command documented. |
| CHART-02 | Define `chart_spec` tool schema with validation and column name checking | Verified: `tool()` helper + `parameters` field (not `inputSchema`) in ai@4.3.x. Dynamic Zod enum pattern documented. |
| VALID-01 | Server-side validation of `x_column`/`y_column` against session's column list | Architecture: columns must be parsed from csv_chunks chunk_text (not csv_sessions). Query pattern documented. |
| VALID-02 | System prompt updated with explicit chart type selection rules | Pattern documented; integrates into existing `system:` string in streamText call. |
| VALID-03 | Cap chart data rows at 200 to prevent context window pollution | Drizzle query for first 200 rows by chunkIndex documented. |
| VALID-04 | Use Zod enum for column names in tool schema at request time | `z.enum([col1, col2] as [string, ...string[]])` pattern documented with edge case guard. |
</phase_requirements>

---

## Summary

Phase 1 establishes the `chart_spec` tool contract in `/api/chat/route.ts`. The primary integration is adding a `tools` option to the existing `streamText` call. The tool has no `execute` function — the AI generates a tool call, and the result is streamed to the client for Phase 2 rendering.

**Critical schema finding:** The `csv_sessions` table stores only `columnCount` (integer). Column names are NOT persisted to the database. They are recoverable from `csv_chunks`: the first chunk (chunkIndex=0) contains `chunkText` whose first line is the CSV header row (comma-separated column names). The plan must include adding a `columns` text array column to `csv_sessions`, or extracting column names from the first chunk at request time. The locked decision D-07 refers to `csv_sessions` as the column source — the planner must decide: migrate the schema to add a `columns` column, or read from `csv_chunks` chunk 0.

**Primary recommendation:** Add a `columns text[]` column to `csv_sessions` (schema migration required as Wave 0 task). This avoids parsing CSV text at query time, is explicit, and aligns with D-07. Alternatively, extract from csv_chunks chunk 0 with a one-line string split — no migration required. Both are viable; the planner should lock one approach.

**Tool field name:** In `ai@4.3.x`, the field is `parameters` (not `inputSchema`). The docs site currently shows `inputSchema` but the installed type definitions confirm `parameters`. Using `inputSchema` will cause a TypeScript type error.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ai` | ^4.3.0 (installed) | streamText, tool() helper, createDataStreamResponse | Already in use; provides typed tool schema registration |
| `zod` | ^3.24.0 (installed) | Tool parameter schema, dynamic enum construction | Already used for env validation; required by Vercel AI SDK |
| `drizzle-orm` | ^0.41.0 (installed) | DB queries for column list and row fetch | Already in use throughout codebase |
| `recharts` | 2.15.4 (to install) | Chart rendering in Phase 2 (installed in Phase 1 per CHART-01) | Decision locked in STATE.md: avoids react-redux dep in v3 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-is` | ^18.3.1 (recharts dep) | React type checking used internally by recharts | Installed automatically as recharts dependency |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| recharts@2.15 | recharts@3.x | v3 requires react-redux as peer dep; locked decision to avoid this |
| `parameters` field | `inputSchema` field | `inputSchema` is docs-site language; installed types use `parameters` |

**Installation (CHART-01):**
```bash
npm install recharts@2.15.4
```

**Version verification:** [VERIFIED: npm registry 2026-04-21]
- `recharts@2.15.4` — published 2025-06-20, peer deps: `react: ^16||^17||^18||^19`, `react-dom: same`
- `ai@4.3.0` — installed, peer deps: `react: ^18||^19`, `zod: ^3.23.8`
- `zod@^3.24.0` — installed, satisfies ai peer dep

## Architecture Patterns

### CRITICAL FINDING: Column Names Are Not in csv_sessions

[VERIFIED: reading `lib/db/schema.ts` and `app/actions/upload.ts`]

The `csv_sessions` table (`sessions` Drizzle object) has these columns:
- `id`, `userId`, `fileName`, `rowCount`, **`columnCount`** (integer), `sizeBytes`, `createdAt`, `updatedAt`

There is no `columns` text array field. The upload action (`app/actions/upload.ts:83-89`) inserts `columnCount: meta.columnCount` but NOT the column names array.

Column names ARE available in `csv_chunks.chunkText`: each chunk is formatted as:
```
col1,col2,col3
row1val1,row1val2,row1val3
row2val1,...
```
The first chunk (chunkIndex=0) starts with the header line. Parsing:
```typescript
const firstChunk = chunkText.split("\n")[0];  // "col1,col2,col3"
const columns = firstChunk.split(",");
```

**Two viable approaches to satisfy D-07:**

**Option A (recommended): Add `columns` column to csv_sessions**
- Add `columns: text("columns").array()` to `sessions` Drizzle table
- Add Drizzle migration (Wave 0 task)
- Populate during upload: `columns: meta.columns`
- Query at request time: `db.select({ columns: sessions.columns }).from(sessions).where(eq(sessions.id, sessionId))`
- Aligns exactly with D-07 intent

**Option B (no migration): Parse from csv_chunks chunk 0**
- Query: `db.select({ chunkText: csvChunks.chunkText }).from(csvChunks).where(and(eq(csvChunks.sessionId, sessionId), eq(csvChunks.chunkIndex, 0))).limit(1)`
- Parse: `chunkText.split("\n")[0].split(",")`
- No schema migration required
- Risk: if CSV column names contain commas (they'd be quoted), naive split breaks. Papa.parse handles quoting but this pattern does not.

**Recommendation for planner to lock:** Option A avoids brittle text parsing. The migration is a one-liner. The upload action already has `meta.columns` in scope.

### Recommended Project Structure for Phase 1 Changes

```
app/api/chat/
└── route.ts              # Modified: add tool schema, column fetch, system prompt update

lib/
├── chart-spec.ts         # NEW: chart_spec Zod schema definition (importable by Phase 2)
└── db/
    └── schema.ts         # Modified (Option A): add columns text[] to sessions table

drizzle/
└── XXXX_add_sessions_columns.sql  # NEW (Option A): migration adding columns column
```

### Pattern 1: Vercel AI SDK v4 Tool Registration

[VERIFIED: reading `node_modules/ai/dist/index.d.ts` lines 904-962]

The field name is `parameters`, NOT `inputSchema`. The docs site uses `inputSchema` but the installed type definition for `ai@4.3.x` uses `parameters`.

```typescript
// Source: node_modules/ai/dist/index.d.ts:904-928
import { tool, streamText } from "ai";
import { z } from "zod";

const chartSpecTool = tool({
  description: "Generate a chart specification from the CSV data.",
  parameters: z.object({
    type: z.enum(["bar", "line", "pie", "scatter"]),
    x_column: z.string(),     // replaced with dynamic enum at request time
    y_column: z.string(),     // replaced with dynamic enum at request time
    title: z.string(),
    insight_caption: z.string().optional(),
    data: z.array(z.record(z.string(), z.unknown())),
  }),
  // No execute function — this is a client-side tool.
  // The AI generates the tool call; Phase 2 renders it.
});

// In streamText:
const result = streamText({
  model,
  system: `...`,
  messages,
  tools: {
    chart_spec: chartSpecTool,
  },
  maxSteps: 1,  // prevent multi-step tool loops for this use case
});
```

**No `execute` function = client-side tool.** When `execute` is absent, the tool call is included in the stream as a `tool-call` part but the server does not run any code. The client receives the arguments and renders the chart. This is the correct pattern for Phase 1: the AI outputs the spec, Phase 2 renders it.

### Pattern 2: Dynamic Zod Enum for Column Validation (VALID-04)

[VERIFIED: zod@3.24.0 installed; pattern from CONTEXT.md specifics + Zod docs]

```typescript
// Guard: empty column list would throw at z.enum([]) — at least 1 element required
if (columns.length === 0) {
  return Response.json({ error: "Session has no columns" }, { status: 400 });
}

const columnEnum = z.enum(columns as [string, ...string[]]);
// columns must be cast because z.enum requires a non-empty tuple type

const chartSpecSchema = z.object({
  type: z.enum(["bar", "line", "pie", "scatter"]),
  x_column: columnEnum,
  y_column: columnEnum,
  title: z.string(),
  insight_caption: z.string().optional(),
  data: z.array(z.record(z.string(), z.unknown())),
});
```

**Important:** This schema is constructed per-request. It cannot be a module-level constant because it depends on the session's column list. The `tool()` call with this schema must be inside the POST handler, after the column fetch.

**The `as [string, ...string[]]` cast** is required because TypeScript infers `string[]` for a runtime array, but `z.enum()` requires a tuple with at least one element. This cast is safe because the length guard precedes it.

### Pattern 3: Fetching First 200 Rows for Data Payload (VALID-03)

[VERIFIED: reading `lib/rag/strategy.ts` for existing Drizzle patterns]

Each `csv_chunks` record covers 50 rows (chunkSize=50 in `chunkRows`). 200 rows = first 4 chunks (chunkIndex 0, 1, 2, 3).

```typescript
import { asc, eq } from "drizzle-orm";
import { csvChunks } from "@/lib/db/schema";

// Fetch first 4 chunks (covers up to 200 rows at 50 rows/chunk)
const chunks = await db
  .select({ chunkText: csvChunks.chunkText })
  .from(csvChunks)
  .where(eq(csvChunks.sessionId, sessionId))
  .orderBy(asc(csvChunks.chunkIndex))
  .limit(4);

// Parse rows from chunk text (each chunk: "header\nrow1\nrow2...")
// The header line appears at the top of chunk 0 only.
function parseRowsFromChunks(chunks: { chunkText: string }[]): Record<string, string>[] {
  const rows: Record<string, string>[] = [];
  let headers: string[] = [];
  
  for (let ci = 0; ci < chunks.length; ci++) {
    const lines = chunks[ci].chunkText.split("\n");
    if (ci === 0) {
      headers = lines[0].split(",");
    }
    const dataLines = ci === 0 ? lines.slice(1) : lines;
    for (const line of dataLines) {
      if (!line.trim()) continue;
      const values = line.split(",");
      const row: Record<string, string> = {};
      headers.forEach((h, i) => { row[h] = values[i] ?? ""; });
      rows.push(row);
    }
  }
  return rows.slice(0, 200); // hard cap
}
```

**Note:** This naive split approach works for simple CSVs but breaks on quoted fields containing commas. If data quality requires robustness, run PapaParse on the concatenated chunk text instead. For Phase 1, the simple approach is acceptable; document the limitation.

**Better approach:** Use PapaParse on concatenated text to handle quoted commas correctly:
```typescript
import Papa from "papaparse";

const combinedText = chunks.map((c, i) => {
  const lines = c.chunkText.split("\n");
  return i === 0 ? c.chunkText : lines.slice(1).join("\n");
}).join("\n");

const parsed = Papa.parse<Record<string, unknown>>(combinedText, { header: true, skipEmptyLines: true });
const rows = parsed.data.slice(0, 200);
```

### Pattern 4: System Prompt Injection with Column List (VALID-02)

[VERIFIED: reading existing system prompt at `app/api/chat/route.ts:82-87`]

The existing system prompt is a template literal in the `streamText` call. Extend it to include chart rules and the column list:

```typescript
const columnList = columns.join(", ");

system: `You are an expert data analyst. Answer questions about the uploaded CSV data clearly.
Cite specific numbers, column names, and row values when relevant.
If a question cannot be answered from the data, say so explicitly.

## Chart Rules
Call the \`chart_spec\` tool when the user's question implies comparison, trend, distribution, or
relationship between values. Do NOT call it for simple lookups returning a single number.

Chart type selection:
- bar: comparing values across categories or groups
- line: time series or ordered sequences (x_column should be a date or ordered field)
- pie: parts of a whole (use ONLY when ≤6 distinct categories; otherwise use bar)
- scatter: relationship between two numeric variables

CRITICAL: Use EXACT column names from the CSV header. Available columns: ${columnList}.
Never paraphrase, translate, or infer column names. If the column is "Product Name" use "Product Name" exactly.

Always answer the question in text first. Then, optionally call \`chart_spec\` to provide a visualization.
Never return a tool call without a text answer.
The chart data is a sample capped at 200 rows.

CSV DATA:
${context}`,
```

### Anti-Patterns to Avoid

- **Using `inputSchema` instead of `parameters`:** The docs site shows `inputSchema` but `ai@4.3.x` types require `parameters`. TypeScript will reject `inputSchema` with a type error.
- **Module-level tool constant with dynamic schema:** The `chart_spec` tool must be constructed inside the POST handler after fetching `columns`. A module-level constant would use a static schema without column validation.
- **Fetching column names from the request body:** D-07 locks column names to come from the DB (or DB-derived chunks), not from the client. Client-supplied column names are untrusted.
- **No empty-column guard:** `z.enum([])` throws at runtime with `"at least 1 value required"`. Always guard before construction.
- **Relying on `csv_sessions.columnCount`:** This is an integer (count), not the names. Column names are elsewhere.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Schema validation | Custom type-checking for tool args | `zod` + `tool()` helper | Vercel AI SDK validates tool args against `parameters` schema before invoking execute; Zod handles edge cases |
| CSV parsing for row extraction | Manual string splitting with commas | `papaparse` (already installed) | Quoted fields, escaped commas, multi-line fields all break naive splits |
| Tool type inference | Manual TypeScript generics | `tool()` helper auto-infers from Zod schema | The helper narrows the `execute` args type automatically |

**Key insight:** Zod + the `tool()` helper is the entire validation layer. The SDK validates incoming tool call arguments against the schema before the result reaches any application code.

## Common Pitfalls

### Pitfall 1: `inputSchema` vs `parameters` Field Name
**What goes wrong:** `tool({ inputSchema: z.object({...}) })` produces a TypeScript error: `Object literal may only specify known properties`.
**Why it happens:** The official docs site (ai-sdk.dev) documents `inputSchema` but the installed `ai@4.3.x` type definition uses `parameters`. The docs site may be documenting a future version or an unreleased change.
**How to avoid:** Use `parameters` in all tool definitions. Confirmed in `node_modules/ai/dist/index.d.ts:910`.
**Warning signs:** TypeScript error on the `tool()` call mentioning unknown property.

### Pitfall 2: Static Tool Schema Breaks Column Validation
**What goes wrong:** Defining `chart_spec` as a module-level constant means the `parameters` schema uses a static `z.string()` for `x_column`/`y_column` instead of the dynamic enum. The AI can hallucinate any column name.
**Why it happens:** Developers often define tool configs at module level for performance.
**How to avoid:** Build the `tool()` object inside the POST handler, after fetching column names from the DB (or chunks). The performance cost is negligible (one Zod schema construction per request).
**Warning signs:** Column names pass validation even when they don't exist in the session.

### Pitfall 3: `z.enum()` Requires a Non-Empty Tuple
**What goes wrong:** `z.enum(columns as [string, ...string[]])` throws at runtime if `columns` is empty.
**Why it happens:** `z.enum([])` is invalid — Zod requires at least one member.
**How to avoid:** Guard before construction: `if (columns.length === 0) return Response.json(...)`.
**Warning signs:** Runtime exception `ZodError: at least 1 value required` on first request to a session.

### Pitfall 4: Column Names Not in csv_sessions
**What goes wrong:** Query `SELECT * FROM csv_sessions WHERE id = ?` returns no `columns` field — the schema has only `columnCount` (integer).
**Why it happens:** Upload action stores `columnCount` but not the names array.
**How to avoid:** Either (A) add a `columns text[]` column via migration, or (B) parse from `csv_chunks` chunk 0. Do not query `csv_sessions.columns` without migrating first.
**Warning signs:** TypeScript error accessing `.columns` on the Drizzle select result type.

### Pitfall 5: `maxSteps` Not Set Causes Infinite Tool Loop
**What goes wrong:** With `tools` registered and no `maxSteps`, if the AI keeps calling `chart_spec` in a loop, `streamText` will continue until token limit.
**Why it happens:** Default `maxSteps` is 1 in `streamText` but it is worth setting explicitly for clarity.
**How to avoid:** Set `maxSteps: 1` in the `streamText` call (one LLM step, AI can call tools, no auto-continuation).
**Warning signs:** Stream never finishes, `onFinish` never fires.

### Pitfall 6: Recharts v2 `react-is` Peer Dep Warning
**What goes wrong:** `recharts@2.15.4` depends on `react-is@^18.3.1` but npm may warn about version mismatch with React 19.
**Why it happens:** `react-is` latest is 19.x; recharts pins `^18.3.1`. React 19 and react-is@19 are compatible.
**How to avoid:** Install with `--legacy-peer-deps` if npm warns, or install `react-is@^18.3.1` explicitly. In practice React 19 does not break recharts v2.
**Warning signs:** npm install peer dep warning mentioning react-is.

## Code Examples

### Complete Tool Definition (inline in POST handler)

```typescript
// Source: verified against node_modules/ai/dist/index.d.ts:904-962
import { tool, streamText } from "ai";
import { z } from "zod";

// Inside POST handler, after billing check and column fetch:

if (!columns || columns.length === 0) {
  return Response.json({ error: "Session column list is empty" }, { status: 400 });
}

const columnEnum = z.enum(columns as [string, ...string[]]);

const chartSpecTool = tool({
  description:
    "Generate a chart specification to visualize CSV data. " +
    "Call this when the question implies comparison, trend, distribution, or relationship.",
  parameters: z.object({
    type: z.enum(["bar", "line", "pie", "scatter"]),
    x_column: columnEnum,
    y_column: columnEnum,
    title: z.string().describe("A concise chart title"),
    insight_caption: z.string().optional().describe("One-sentence insight from the data"),
    data: z.array(z.record(z.string(), z.unknown())).describe("Up to 200 rows, all columns"),
  }),
  // No execute — client-side tool; Phase 2 renders this
});
```

### Drizzle Query: First 200 Rows from csv_chunks

```typescript
// Source: verified pattern from lib/rag/strategy.ts (uses same table/imports)
import { asc, eq } from "drizzle-orm";
import { csvChunks } from "@/lib/db/schema";
import Papa from "papaparse";

const rawChunks = await db
  .select({ chunkText: csvChunks.chunkText })
  .from(csvChunks)
  .where(eq(csvChunks.sessionId, sessionId))
  .orderBy(asc(csvChunks.chunkIndex))
  .limit(4);  // 4 chunks × 50 rows = 200 rows max

// Reconstruct CSV text: chunk 0 has header, subsequent chunks do not
const firstChunkLines = rawChunks[0]?.chunkText.split("\n") ?? [];
const header = firstChunkLines[0] ?? "";
const bodyLines = rawChunks.flatMap((c, i) => {
  const lines = c.chunkText.split("\n");
  return i === 0 ? lines.slice(1) : lines;
}).filter(Boolean);

const csvText = [header, ...bodyLines].join("\n");
const parsed = Papa.parse<Record<string, unknown>>(csvText, { header: true, skipEmptyLines: true });
const rowData = parsed.data.slice(0, 200);
```

### Drizzle Schema Addition (Option A)

```typescript
// Addition to lib/db/schema.ts — sessions table
export const sessions = pgTable("csv_sessions", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: text("user_id").notNull(),
  fileName: text("file_name").notNull(),
  rowCount: integer("row_count").notNull().default(0),
  columnCount: integer("column_count").notNull().default(0),
  columns: text("columns").array(),          // NEW — nullable for backward compat
  sizeBytes: integer("size_bytes").notNull().default(0),
  ...timestamps,
});
```

```typescript
// Addition to app/actions/upload.ts — inside db.transaction:
await tx.insert(sessions).values({
  id: sessionId,
  userId: session.user.id,
  fileName: file.name,
  rowCount: meta.rowCount,
  columnCount: meta.columnCount,
  columns: meta.columns,        // NEW
  sizeBytes: file.size,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `parameters` field in `tool()` | Docs now show `inputSchema` | ai-sdk.dev docs (unknown date) | Use `parameters` in installed code; docs may be ahead of release |
| recharts v2 (stable) | recharts v3 adds react-redux dep | recharts@3.0.0-alpha | Locked decision: use v2 to avoid peer dep |
| Single-step tool calls | Multi-step with `maxSteps` | AI SDK v3+ | Phase 1: set `maxSteps: 1`; future phases may increase |

**Deprecated/outdated:**
- `CoreTool` type: deprecated alias for `Tool` — use `Tool` directly if needed
- `CoreToolChoice`: deprecated alias for `ToolChoice`

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Chunk text format is always `header\nrow1\nrow2...` with header only in chunk 0 | Architecture / Code Examples | If chunkRows is ever called with a different format, column parsing breaks. Low risk — chunkRows is a single implementation. |
| A2 | `maxSteps` defaults to 1 for streamText (no infinite loop by default) | Pitfalls | If default is higher, AI could loop on tool calls. Mitigated by setting explicitly. |
| A3 | Recharts `react-is@^18.3.1` dep does not conflict with React 19 at runtime | Standard Stack | If react-is@18 and React 19 have runtime incompatibilities, charts would fail. npm view shows latest react-is is 19.2.5; recharts pins ^18 which resolves to 18.3.1. Low risk. |

## Open Questions

1. **Column names source: migration vs. chunk parsing?**
   - What we know: csv_sessions has no `columns` field; chunks have the header in chunk 0 text.
   - What's unclear: Which approach the planner prefers (schema migration vs. no migration).
   - Recommendation: Option A (schema migration). Document in Wave 0. The planner should lock this.

2. **`inputSchema` vs `parameters`: will this diverge in a future ai release?**
   - What we know: Installed `ai@4.3.0` uses `parameters`. Docs site shows `inputSchema`.
   - What's unclear: Whether a future 4.x minor will rename the field.
   - Recommendation: Use `parameters` now; pin to `^4.3.0` to avoid surprise breaks.

3. **Should `data` payload rows be pre-serialized (strings only) or typed (numbers as numbers)?**
   - What we know: `z.record(z.string(), z.unknown())` allows mixed types. Recharts expects numbers for numeric axes.
   - What's unclear: Whether leaving values as typed from PapaParse (numbers/booleans/strings) is better than stringifying everything.
   - Recommendation: Keep native types from PapaParse (`dynamicTyping: true` already in use). Recharts handles mixed types better than forced strings.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| recharts | CHART-01 | Not installed | — | None — must install |
| ai (streamText, tool) | CHART-02 | Installed | 4.3.x | — |
| zod | VALID-04 | Installed | ^3.24.0 | — |
| drizzle-orm | VALID-01, VALID-03 | Installed | ^0.41.0 | — |
| papaparse | Row extraction | Installed | ^5.4.0 | Simple string split (limited) |
| drizzle-kit | Wave 0 migration (Option A) | Installed (dev) | ^0.30.0 | — |

**Missing dependencies with no fallback:**
- `recharts@2.15.4` — must be installed as part of CHART-01. Command: `npm install recharts@2.15.4`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.1.x |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm run test:coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHART-01 | recharts installs without peer dep errors | smoke (install) | `npm install recharts@2.15.4` (check exit code) | N/A |
| CHART-02 | chart_spec schema rejects unknown chart types | unit | `vitest run lib/__tests__/chart-spec.test.ts` | Wave 0 |
| VALID-01 | Invalid column name returns 400 | unit | `vitest run lib/__tests__/chart-spec.test.ts` | Wave 0 |
| VALID-02 | System prompt contains chart type rules | unit | `vitest run lib/__tests__/chart-spec.test.ts` | Wave 0 |
| VALID-03 | Row data capped at 200 | unit | `vitest run lib/__tests__/chart-spec.test.ts` | Wave 0 |
| VALID-04 | Dynamic Zod enum rejects hallucinated column | unit | `vitest run lib/__tests__/chart-spec.test.ts` | Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm run test:coverage`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `lib/__tests__/chart-spec.test.ts` — unit tests for schema validation, dynamic enum, 200-row cap, system prompt
- [ ] `lib/__tests__/vitest.setup.ts` — already exists; may need `streamText` mock added if route tests are included

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes (existing) | better-auth session check already in POST handler |
| V4 Access Control | yes | sessionId must belong to authenticated user — verify `sessions.userId === session.user.id` |
| V5 Input Validation | yes | Zod schema on tool parameters; dynamic enum rejects any column not in DB-sourced list |
| V6 Cryptography | no | No crypto operations in this phase |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Insecure Direct Object Reference (IDOR) on sessionId | Elevation of Privilege | Verify `sessions.userId === session.user.id` when fetching columns. If missing, user A can query user B's columns. |
| Tool call argument injection | Tampering | Zod `parameters` schema validates all tool args server-side before any code runs. Dynamic enum prevents column name injection. |
| Column list from client body | Tampering | D-07 locks column source to DB, not client. Never read `x_column`/`y_column` validation list from the request body. |
| Context window DoS via large data payload | Denial of Service | 200-row hard cap (VALID-03). Data is inline in tool result — without cap, malicious large CSVs could inflate token costs. |

**IDOR check (critical, currently missing in route):** The existing `/api/chat/route.ts` does NOT verify that the `sessionId` in the request body belongs to the authenticated user. The RAG query is scoped by `sessionId` (line 65), but there is no check that `session.userId === sessions.userId`. Phase 1 must add this check when fetching the column list from `csv_sessions`. Example:

```typescript
const sessionRow = await db
  .select({ columns: sessions.columns, userId: sessions.userId })
  .from(sessions)
  .where(eq(sessions.id, sessionId))
  .limit(1);

if (!sessionRow[0]) return Response.json({ error: "Session not found" }, { status: 404 });
if (sessionRow[0].userId !== session.user.id) return Response.json({ error: "Forbidden" }, { status: 403 });
```

## Sources

### Primary (HIGH confidence)
- `node_modules/ai/dist/index.d.ts:904-962` — Tool type definition; confirms `parameters` field name
- `lib/db/schema.ts` — Confirmed: no `columns` field in csv_sessions
- `app/actions/upload.ts` — Confirmed: upload does not persist column names array
- `lib/rag/chunk.ts` — Confirmed: chunk text format is `header\nrow1\nrow2...`
- `lib/rag/strategy.ts` — Verified: existing Drizzle query pattern for csv_chunks with orderBy(asc(chunkIndex))
- `package.json` — Confirmed: ai@^4.3.0, zod@^3.24.0, drizzle-orm@^0.41.0, papaparse@^5.4.0 all installed

### Secondary (MEDIUM confidence)
- npm registry `recharts@2.15.4` — published 2025-06-20, peer deps `react ^16||^17||^18||^19` [VERIFIED: npm view]
- `ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling` — docs show `inputSchema`; contradicted by installed types; treat as MEDIUM until next release

### Tertiary (LOW confidence)
- `maxSteps` default behavior described in type docs commentary [ASSUMED: default is 1 for streamText, set explicitly to be safe]

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified against npm registry and installed node_modules
- Architecture: HIGH — critical column-name finding verified by reading schema.ts and upload.ts directly
- Tool API: HIGH — verified against installed type definitions (not docs site)
- Pitfalls: HIGH — most derive from direct code inspection, not assumption
- Row parsing: MEDIUM — logic is correct but naive string split has edge case with quoted commas; PapaParse alternative provided

**Research date:** 2026-04-21
**Valid until:** 2026-05-21 (ai package minor updates could change field names)
