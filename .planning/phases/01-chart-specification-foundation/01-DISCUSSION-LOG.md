# Phase 1: Chart Specification Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-21
**Phase:** 01-Chart Specification Foundation
**Areas discussed:** chart_spec schema fields, Column validation strategy, System prompt design, Row cap and data shape

---

## chart_spec schema fields

| Option | Description | Selected |
|--------|-------------|----------|
| bar \| line \| pie \| scatter | All four types defined in Phase 1 | ✓ |
| bar only for Phase 1 | Start minimal, add later | |

**User's choice:** All four chart types in Phase 1 schema

---

| Option | Description | Selected |
|--------|-------------|----------|
| Include insight_caption as optional field | z.string().optional() — schema complete from day 1 | ✓ |
| Defer to Phase 4 | Skip now, update schema in Phase 4 | |

**User's choice:** Include as optional field in Phase 1

---

| Option | Description | Selected |
|--------|-------------|----------|
| Unified x_column / y_column | Same fields for all chart types | ✓ |
| Discriminated union per chart type | Separate schema per type | |

**User's choice:** Unified schema — all types use x_column / y_column

---

| Option | Description | Selected |
|--------|-------------|----------|
| title required string | AI always generates a title | ✓ |
| title optional string | AI can omit title | |

**User's choice:** Required string

---

## Column validation strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Hard reject — 400 error | Server validates, returns error on bad column | ✓ |
| Soft fallback — text only | Strip chart_spec, return text answer | |

**User's choice:** Hard reject with 400

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fetch from csv_sessions DB | Source of truth from upload step | ✓ |
| Client passes column list | Client sends columns in POST body | |

**User's choice:** DB fetch from csv_sessions table

---

| Option | Description | Selected |
|--------|-------------|----------|
| Dynamic Zod enum at request time | z.enum([...columnNames]) — strongest validation | ✓ |
| Runtime string check only | Manual array.includes() check | |

**User's choice:** Dynamic Zod enum (VALID-04 implemented in Phase 1)

---

| Option | Description | Selected |
|--------|-------------|----------|
| After billing check | Existing flow order maintained | ✓ |
| Before billing check | Column validation first | |

**User's choice:** After billing check

---

## System prompt design

| Option | Description | Selected |
|--------|-------------|----------|
| When question implies comparison or trend | Context-aware charting | ✓ |
| Always chart when numeric columns exist | Default to charts | |
| Only when user explicitly asks | Never self-initiate | |

**User's choice:** Chart when question implies comparison or trend

---

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit rules per chart type | bar=categories, line=time, pie=parts-of-whole (≤6), scatter=two numerics | ✓ |
| Loose guidance only | "Pick the most appropriate type" | |

**User's choice:** Explicit rules per chart type

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — explicit column name instruction | "Use EXACT column names from CSV header" | ✓ |
| No explicit instruction | Rely on Zod enum to catch bad names | |

**User's choice:** Yes — explicit instruction in system prompt

---

| Option | Description | Selected |
|--------|-------------|----------|
| Chart supplements text, never replaces it | Always text first, chart optional | ✓ |
| Chart can stand alone | AI may return only tool call | |

**User's choice:** Text + chart — chart never replaces text answer

---

## Row cap and data shape

| Option | Description | Selected |
|--------|-------------|----------|
| First 200 rows by chunk order | Deterministic, good for time-series | ✓ |
| Top 200 RAG-relevant rows | Semantic but non-deterministic | |
| Random sample 200 rows | Statistical but non-reproducible | |

**User's choice:** First 200 rows by chunk order

---

| Option | Description | Selected |
|--------|-------------|----------|
| All columns in each row | Full row, ChartBlock picks what it needs | ✓ |
| Only x_column and y_column values | Minimal payload | |

**User's choice:** All columns — enables Phase 4 chart type switcher

---

| Option | Description | Selected |
|--------|-------------|----------|
| Inline in chart_spec tool result | No extra fetch, persists with message history | ✓ |
| ChartBlock fetches from DB | Extra API round-trip, new endpoint needed | |

**User's choice:** Inline in chart_spec tool result

---

## Claude's Discretion

- Exact Drizzle query for fetching first 200 rows
- Error message copy for 400 validation responses
- Whether to add column-type (numeric/categorical) validation beyond name validation

## Deferred Ideas

- Multiple charts per message — explicitly out of scope
- Numeric type validation on columns — deferred
- Histogram, box plot, heatmap chart types — deferred to v2+
