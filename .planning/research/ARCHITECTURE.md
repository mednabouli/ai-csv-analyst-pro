# Architecture Patterns: AI Chart Spec Flow

**Domain:** Streaming AI chat with inline chart rendering
**Researched:** 2026-04-20
**Installed SDK:** `ai@4.3.19`, `@ai-sdk/react@1.2.12`

---

## Recommended Architecture

The chart spec flows through the Vercel AI SDK's tool-call mechanism. The LLM emits a `chart_spec` tool call as a structured JSON payload alongside its text response. The route executes the tool on the server, embeds the result in the stream, and `useChat` surfaces it as a `tool-invocation` part that `DashboardShell` renders via a `<ChartBlock>` client component.

```
User question
     │
     ▼
/api/chat route
 streamText({ tools: { chart_spec } })
 ┌─ text delta stream ──────────────────────┐
 │  "Sales peaked in Q3..."                  │  ← streamed immediately
 ├─ tool-call chunk ─────────────────────────┤
 │  chart_spec({ type, x, y, title, data })  │  ← LLM decides to call tool
 ├─ tool-result chunk ───────────────────────┤
 │  execute() returns same JSON (passthrough)│  ← server executes, result streams
 └───────────────────────────────────────────┘
     │
     ▼ (mergeIntoDataStream)
useChat messages array
 message.parts = [
   { type: 'text',             text: "Sales peaked in Q3..." },
   { type: 'tool-invocation',  toolInvocation: {
       state: 'result',
       toolName: 'chart_spec',
       result: { type: 'bar', x_column: 'month', y_column: 'sales',
                 title: 'Monthly Sales', data: [...] }
   }}
 ]
     │
     ▼
DashboardShell message renderer
 m.parts.map(part => {
   'text'             → <MarkdownMessage>
   'tool-invocation'  → <ChartBlock spec={part.toolInvocation.result} />
 })
     │
     ▼
<ChartBlock> ("use client")
 Recharts BarChart / LineChart / PieChart / ScatterChart
```

---

## Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| `/api/chat` route | Define `chart_spec` tool, call `streamText` with tools, execute tool server-side, stream result | `useChat` via AI SDK data stream protocol |
| `chart_spec` tool | Accept `{ type, x_column, y_column, title, data }`, return it verbatim as result | Called by LLM inside `streamText` |
| `DashboardShell` | Iterate `message.parts`, dispatch to `<MarkdownMessage>` or `<ChartBlock>` | `useChat` messages state |
| `<ChartBlock>` | Render Recharts component from spec; "use client" | Receives `ChartSpec` prop, no external calls |
| DB persistence layer | Save tool results as serialised JSON in `chatMessages.content` | `onFinish` callback inside route |

---

## Data Flow Detail

### How `tool-call` / `tool-result` work in SDK 4.3.x

The `tool()` helper is exported from `"ai"`. Tools are registered on `streamText` as a `tools` record. When the LLM decides a chart is warranted, it emits a tool-call chunk; the SDK validates the args against the Zod `inputSchema`, calls `execute()` server-side, and streams the result back — all within a single HTTP response. The client receives it as a `ToolInvocationUIPart` in the `parts` array.

**Exact part type in SDK 4.3.x** (confirmed from installed `@ai-sdk/ui-utils@1.2.11`):

```typescript
// SDK 4.3.x type — NOT the "tool-TOOLNAME" pattern from docs for SDK 4.2+ new API
type ToolInvocationUIPart = {
  type: 'tool-invocation';      // literal string, single unified type
  toolInvocation: ToolInvocation;
};

type ToolInvocation =
  | { state: 'partial-call'; toolName: string; toolCallId: string; args: ... }
  | { state: 'call';         toolName: string; toolCallId: string; args: ... }
  | { state: 'result';       toolName: string; toolCallId: string; args: ...; result: unknown };
```

`toolInvocations` on `Message` is deprecated in favour of `parts` but still present for backward compatibility.

### Where chart data lives

Data is **embedded inside the tool result**, not fetched separately. The `execute()` function receives the column names and pulls the relevant rows from the RAG context that was already assembled for the request. No secondary fetch is required.

Rationale:
- The RAG context is already in memory at call time.
- A second DB query to re-fetch CSV rows adds latency and complexity.
- Chart data subset (up to ~200 rows) fits comfortably inside the tool result JSON.
- The tool result is persisted alongside the message, so history loads correctly.

### Text + chart in the same message

The LLM produces both in one generation step. `streamText` streams text deltas first, then emits the tool call and result. `useChat` accumulates them into a single message with a `parts` array:

```
parts[0] = { type: 'text',            text: "Sales peaked in Q3, as shown below." }
parts[1] = { type: 'tool-invocation', toolInvocation: { state: 'result', ... } }
```

The renderer iterates `parts` in order, so text always appears above the chart (matching natural reading order). During streaming, `state` transitions `partial-call` → `call` → `result`; `<ChartBlock>` should only mount when `state === 'result'`.

### Chart data location in the tool

```typescript
// Route: chart_spec tool definition
const chartSpecTool = tool({
  description:
    "Call this tool whenever the user's question is best answered with a chart. " +
    "Embed only the rows needed for the chart (max 200). " +
    "Prefer this over describing data in text when trends, comparisons, or distributions are asked about.",
  inputSchema: z.object({
    type:     z.enum(["bar", "line", "pie", "scatter"]),
    x_column: z.string().describe("Column name for the X axis or category"),
    y_column: z.string().describe("Column name for the Y axis or value"),
    title:    z.string().describe("Short chart title"),
    data:     z.array(z.record(z.union([z.string(), z.number(), z.null()])))
                .max(200)
                .describe("Array of row objects — include only columns needed for the chart"),
  }),
  execute: async (spec) => spec,   // passthrough — LLM-generated spec IS the result
});
```

The `execute` is a passthrough because the LLM already computed the data from the RAG context in its generation. No server-side transformation is needed.

### `onFinish` persistence change

The current `onFinish` saves `text` only. With tools, tool results must also be persisted so that `getSessionMessagesAction` can reconstruct them on history load.

**Problem:** `getSessionMessagesAction` currently returns `Message[]` with only `{ id, role, content }`. Tool results live in `content` only if serialised there.

**Simplest approach for a personal single-user tool:** Serialise the full message (including tool results) as a JSON string in the `content` column. On load, detect if `content` starts with `{` and parse it back into a `Message` with `parts`.

**Better approach (preferred):** Store `content` as the text portion and `toolResults` as a separate JSONB column. Reconstruct `Message.toolInvocations` on load.

For v1.0 (personal tool, no migration budget), use the simple JSON-in-content approach with a type discriminator:

```typescript
// In onFinish, after tools:
const persistedContent = toolResults.length > 0
  ? JSON.stringify({ text, toolResults })
  : text;
await db.insert(chatMessages).values({ ..., content: persistedContent });
```

On load in `getSessionMessagesAction`, reconstruct:

```typescript
function hydrateMessage(row: { id: number; role: string; content: string }): Message {
  try {
    const parsed = JSON.parse(row.content);
    if (parsed.toolResults) {
      return {
        id: String(row.id),
        role: row.role as "user" | "assistant",
        content: parsed.text ?? "",
        toolInvocations: parsed.toolResults.map((r: ToolResult) => ({
          state: "result",
          toolName: r.toolName,
          toolCallId: r.toolCallId,
          args: r.args,
          result: r.result,
        })),
      };
    }
  } catch { /* not JSON, fall through */ }
  return { id: String(row.id), role: row.role as "user" | "assistant", content: row.content };
}
```

---

## Patterns to Follow

### Pattern 1: Parts-based message rendering

**What:** Iterate `message.parts` instead of rendering `message.content` directly.
**When:** Any time a message may contain tool results (i.e., after CHART-02 ships).

```typescript
// DashboardShell — replace current message renderer
{messages.map((m) => (
  <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
    {/* ... avatar ... */}
    <div className="max-w-[85%] ...">
      {m.role === "assistant"
        ? (m.parts ?? [{ type: "text", text: m.content }]).map((part, i) => {
            if (part.type === "text") {
              return <MarkdownMessage key={i} content={part.text} />;
            }
            if (part.type === "tool-invocation") {
              const inv = part.toolInvocation;
              if (inv.toolName === "chart_spec" && inv.state === "result") {
                return <ChartBlock key={i} spec={inv.result as ChartSpec} />;
              }
              return null;
            }
            return null;
          })
        : <p className="whitespace-pre-wrap">{m.content}</p>
      }
    </div>
  </div>
))}
```

The `?? [{ type: "text", text: m.content }]` fallback handles history messages loaded from DB that have no `parts` array yet.

### Pattern 2: System prompt tool invocation instructions

**What:** Explicit, constrained instructions that tell the model exactly when to call the tool.
**When:** System prompt for the chart route.

```
You are an expert data analyst. Answer questions about the uploaded CSV data clearly.
Cite specific numbers, column names, and row values when relevant.
If a question cannot be answered from the data, say so explicitly.

CHART TOOL RULES:
- Call chart_spec when the question asks about trends, comparisons, distributions,
  or any pattern that is clearer in a chart than in text.
- Call chart_spec for: "show me", "plot", "chart", "visualise", "compare", "over time".
- Do NOT call chart_spec for: single scalar answers, boolean questions, lists of
  column names, or questions with fewer than 3 data points.
- Always write a brief text explanation BEFORE calling chart_spec. Never call the
  tool without accompanying text.
- Include only the columns required for the chart in the data array.
- Limit data to the 200 most relevant rows if the dataset is larger.

CSV DATA:
${context}
```

**Why explicit rules matter:** Open-weight models (Gemma, Llama) are significantly less reliable at tool selection than GPT-4o/Claude. Without explicit "call when / do not call when" rules, they either call the tool for every response or never call it. Confirmed pattern from the function calling literature.

### Pattern 3: ChartBlock as a pure presentational Client Component

**What:** `<ChartBlock spec={ChartSpec} />` receives a fully-typed spec and renders the appropriate Recharts chart. No data fetching, no side effects.
**When:** Always — keeps chart rendering predictable and testable.

```typescript
// components/ChartBlock.tsx
"use client";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
         ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
         Tooltip, ResponsiveContainer } from "recharts";

export interface ChartSpec {
  type:     "bar" | "line" | "pie" | "scatter";
  x_column: string;
  y_column: string;
  title:    string;
  data:     Record<string, string | number | null>[];
}

export function ChartBlock({ spec }: { spec: ChartSpec }) {
  // Dispatch to sub-renderers by type
}
```

### Pattern 4: Streaming UX — chart appears after text finishes

**What:** Only render `<ChartBlock>` when `toolInvocation.state === 'result'`. While `state` is `'partial-call'` or `'call'`, render a skeleton.
**When:** During streaming.

```typescript
if (inv.state !== "result") {
  return (
    <div key={i} className="h-48 bg-muted/30 rounded-xl animate-pulse mt-3" />
  );
}
return <ChartBlock key={i} spec={inv.result as ChartSpec} />;
```

This avoids a blank jump when the LLM finishes text and begins the tool call, and does not block text streaming (text arrives and renders first).

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Parsing chart specs from markdown/text

**What:** Detecting JSON inside the AI's text response with regex or string matching.
**Why bad:** Fragile, breaks when the model changes formatting, impossible to type-check, fails silently in production.
**Instead:** Use the `tools` mechanism. The SDK validates args against the Zod schema before `execute()` is called — no parsing, no regex.

### Anti-Pattern 2: Fetching chart data from the DB in ChartBlock

**What:** `<ChartBlock>` makes a `fetch("/api/csv-data?sessionId=...")` call to re-fetch raw rows.
**Why bad:** Adds a round-trip that delays chart render; requires a new API route; creates a data lifecycle mismatch (chart data version tied to query time, not current CSV version).
**Instead:** Embed the relevant data rows in the tool result at generation time.

### Anti-Pattern 3: Mutating DashboardShell to add more state

**What:** Adding `chartVisible`, `chartData`, etc. to the already 360-line `DashboardShell`.
**Why bad:** The component is already flagged as a known fragile area in PROJECT.md. Further inflation makes future extraction harder.
**Instead:** Extract a `MessageList` component that owns the parts rendering loop. `DashboardShell` passes `messages` down, `MessageList` handles part dispatch.

### Anti-Pattern 4: Using `message.content` for tool results

**What:** Rendering `m.content` as markdown and hoping the model embeds chart JSON in it.
**Why bad:** `message.content` for assistant messages with tool calls is often empty string in SDK 4.x. Tool data lives in `toolInvocations` / `parts`, not `content`.
**Instead:** Use `message.parts` as the primary render source.

### Anti-Pattern 5: Persisting only `text` in onFinish when tools fire

**What:** Saving only `text` from `onFinish` as before.
**Why bad:** On history load, chart tool results are lost. Users see only text, no charts for past conversations.
**Instead:** Detect `toolResults.length > 0` in `onFinish` and serialise the full message state.

---

## Scalability Considerations

| Concern | At 1 user (v1.0) | At 1K users | At 10K users |
|---------|------------------|-------------|--------------|
| Chart data in tool result (≤200 rows) | Negligible — fits in stream buffer | Fine — ~50KB per tool result | Monitor DB storage for chat_messages; consider S3 for large results |
| Tool call latency | < 5ms (passthrough execute) | Same | Same |
| Model tool reliability | Acceptable with explicit prompt | May need per-model prompt tuning | Consider separate tool-tuned model for chart calls |
| Recharts bundle size | ~150KB gzipped, lazy-load ChartBlock | Code-split with `next/dynamic` | Same |

---

## Build Order Implications

The following sequence is mandatory due to hard dependencies:

**Step 1: Route — add `chart_spec` tool to `streamText`**
Everything depends on the tool being defined and emitting results into the stream.
File: `app/api/chat/route.ts`

**Step 2: Type definitions — `ChartSpec` interface**
`ChartBlock` and the message renderer both need this type. Extract to `lib/types/chart.ts`.

**Step 3: `ChartBlock` component — Recharts rendering**
Can be built and tested in isolation before wiring the message list.
File: `components/ChartBlock.tsx` (or `app/dashboard/_components/ChartBlock.tsx`)
Requires: `npm install recharts` (not yet in package.json).

**Step 4: Message renderer — parts-based rendering in `DashboardShell`**
Depends on Step 1 (parts now exist) and Step 3 (ChartBlock exists).
Change: replace `m.content` rendering with `m.parts.map(...)` dispatch.

**Step 5: History persistence — update `onFinish` and `getSessionMessagesAction`**
Can be deferred past initial chart rendering, but must ship before v1.0 is considered complete. Charts will be missing from history loads until this is done.

**Recharts version:** Use `recharts@^2.15` (React 19 compatible, released Jan 2025, well-tested). Avoid `recharts@3.x` for this project — the migration guide requires peer deps of `react-redux` and introduces breaking API changes that are not warranted for a personal tool. Recharts 2.15 works with `"use client"` Client Components in Next.js App Router.

---

## Sources

- Installed SDK types: `node_modules/.pnpm/@ai-sdk+ui-utils@1.2.11_zod@3.25.76/node_modules/@ai-sdk/ui-utils/dist/index.d.ts` (HIGH confidence — inspected directly)
- Installed SDK tool export: `node_modules/ai/dist/index.d.ts` lines 955–960, 4692 (HIGH confidence)
- Vercel AI SDK tool-call documentation: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling (MEDIUM confidence — current docs describe SDK 4.2+ API which differs slightly from 4.3.x installed)
- AI SDK chatbot tool usage guide: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling (MEDIUM confidence)
- Message persistence discussion: https://github.com/vercel/ai/discussions/4845 (MEDIUM confidence)
- Recharts React 19 issue: https://github.com/recharts/recharts/issues/4558 (MEDIUM confidence)
- Recharts 3.x migration guide: https://github.com/recharts/recharts/wiki/3.0-migration-guide (HIGH confidence)
- Function calling instruction engineering: https://arxiv.org/html/2407.04997v1 (LOW confidence — academic, 2024)
