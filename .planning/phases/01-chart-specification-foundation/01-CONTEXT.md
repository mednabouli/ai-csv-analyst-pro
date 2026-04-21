# Phase 1: Chart Specification Foundation - Context

**Gathered:** 2026-04-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Define the `chart_spec` tool contract in `/api/chat/route.ts`: Zod schema, dynamic column-name validation against the session's DB column list, updated system prompt with chart type selection rules, and a 200-row data cap. No rendering in this phase — Phase 1 establishes what the AI returns; Phase 2 renders it.

</domain>

<decisions>
## Implementation Decisions

### chart_spec Tool Schema
- **D-01:** Schema accepts all four chart types as a Zod enum: `z.enum(["bar", "line", "pie", "scatter"])`
- **D-02:** All chart types use a unified `x_column` / `y_column` field pair (no discriminated union). Pie charts use `x_column` for the label column and `y_column` for the value column.
- **D-03:** `title` is a **required** `z.string()` — AI always generates a chart title.
- **D-04:** `insight_caption` is an **optional** `z.string().optional()` field — defined now so Phase 4 can render it without a breaking schema change.
- **D-05:** `data` field contains the row payload inline (see Row Cap decisions below).

### Column Validation (VALID-01, VALID-04)
- **D-06:** Build a **dynamic Zod enum at request time**: fetch the session's column list from `csv_sessions` table, then construct `z.enum([...columnNames])` for `x_column` and `y_column`. This is the VALID-04 optional requirement — implement it in Phase 1.
- **D-07:** Column list is fetched from the **`csv_sessions` DB table** (not client-supplied). The column names stored during upload are the source of truth.
- **D-08:** Column validation runs **after the billing check** — maintains the existing flow order in `/api/chat/route.ts` and avoids a DB query for over-limit users.
- **D-09:** Invalid column names result in a **hard 400 rejection** — return `Response.json({ error: "Invalid column: {name}" }, { status: 400 })`. No soft fallback to text-only response.

### System Prompt Rules (VALID-02)
- **D-10:** Chart is triggered **when the question implies comparison or trend** — not for simple factual lookups (single value, count, plain summary).
- **D-11:** Explicit chart type selection rules in the system prompt:
  - `bar` → comparing categories or groups
  - `line` → time series or ordered sequences
  - `pie` → parts of a whole (use only when ≤6 categories; otherwise use bar)
  - `scatter` → relationship between two numeric variables
- **D-12:** System prompt must explicitly state: **"Use EXACT column names from the CSV header row. Never paraphrase or infer column names."** This is critical because column validation is strict.
- **D-13:** **Chart supplements text, never replaces it.** System prompt: "Always answer the question in text first, then optionally call `chart_spec` to provide a visualization. Never return a tool call without a text answer."

### Row Cap and Data Shape (VALID-03)
- **D-14:** Cap at **200 rows**. When the session has more than 200 rows, use the **first 200 rows by chunk order** (deterministic, correct for time-series data). AI is told in the system prompt that the data is a capped sample.
- **D-15:** Each row in the `data` array includes **all columns** (not just x/y). This lets the Phase 4 chart type switcher re-use the same data without fetching new rows.
- **D-16:** Row data is **embedded inline in the `chart_spec` tool result** — no separate API fetch from ChartBlock. Data lives in message history, which enables Phase 5 persistence.

### Claude's Discretion
- How exactly rows are fetched for the data payload (which Drizzle query, chunk ordering logic).
- Error message copy for the 400 validation response.
- Whether to add an `x_column`/`y_column` column-type check (numeric vs. categorical) beyond name validation — infer from requirements if needed.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Chat Route (primary integration point)
- `app/api/chat/route.ts` — Full chat streaming route; tool schema and validation must be woven into the existing POST handler flow

### Database Schema (column list source)
- `lib/db/schema.ts` — `csv_sessions` table definition; `columnCount` field and any column-list storage pattern

### RAG Strategy (context for where data rows come from)
- `lib/rag/strategy.ts` — `buildRAGContext`; chunk ordering used for first-200-rows selection

### LLM Provider Map
- `lib/llm.ts` — `PROVIDERS` and `PROVIDER_META`; system prompt injected here applies to all providers

### Project Constraints
- `CLAUDE.md` — Engineering rules (App Router only, no extra component libraries, Vercel AI SDK patterns)

### Requirements
- `.planning/REQUIREMENTS.md` — CHART-01, CHART-02, VALID-01, VALID-02, VALID-03, VALID-04 acceptance criteria

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `app/api/chat/route.ts`: Existing POST handler with auth, billing, RAG, and streaming flow — tool schema slots in between RAG and `streamText` call
- `lib/db/schema.ts`: `csv_sessions` table with `columnCount` — need to verify how column names are stored (likely in a `columns` JSON field or similar)
- `lib/billing.ts` `checkQueryLimit`: Already runs before stream; column fetch + validation goes after this

### Established Patterns
- Zod is already used for env validation (`lib/env.ts`) — consistent choice for tool schema
- Vercel AI SDK `streamText` already in use; tool registration uses the `tools` option
- Hard error responses follow `Response.json({ error: "..." }, { status: NNN })` pattern throughout the API route
- `withTrace` / `createSpan` for Langfuse observability — new validation step should create a span

### Integration Points
- `/api/chat/route.ts` POST handler: tool schema added to `streamText({ tools: { chart_spec: { ... } } })`
- `csv_sessions` table: fetch row by `sessionId` to get the column list before `streamText`
- `lib/rag/strategy.ts` or directly via Drizzle: fetch first 200 rows for the data payload (needs new query)

</code_context>

<specifics>
## Specific Ideas

- Use `z.enum([...columns] as [string, ...string[]])` to satisfy Zod's requirement that enums have at least one value; guard against empty column lists.
- The system prompt column-name instruction should include the actual column names from the session: "Available columns: {columns.join(', ')}. Use EXACT names."
- Row data payload type in the schema: `z.array(z.record(z.string(), z.unknown()))` — flexible enough for any CSV shape.

</specifics>

<deferred>
## Deferred Ideas

- Numeric type validation on x_column/y_column (checking that the referenced column contains numbers for scatter/line) — beyond column-name validation, deferred unless VALID-04 implementation naturally extends to it
- Multiple charts per message — explicitly out of scope per REQUIREMENTS.md
- Histogram, box plot, heatmap chart types — deferred to v2+

</deferred>

---

*Phase: 01-chart-specification-foundation*
*Context gathered: 2026-04-21*
