# Project Research Summary


**Project:** CSV Analyst Pro — Chart Rendering + Export Milestone
**Domain:** AI-powered CSV analytics — inline chart generation and PNG/Markdown export
**Researched:** 2026-04-20
**Phase 4 Status:** ✅ Complete (2026-04-21)
**Confidence:** HIGH

---

## Executive Summary


**Phase 4 shipped features:**
- ChartBlock component for bar, line, and pie charts
- Chart type switcher (bar/line/pie) in dashboard
- Chart captions and inline insights
- Copy chart image (SVG) to clipboard
- Accessibility and feedback improvements

CSV Analyst Pro added chart rendering and export to the RAG chat loop. The industry-validated approach for this type of product is structured JSON tool calls: the LLM emits a `chart_spec` tool call with typed fields, and a client-side `<ChartBlock>` component renders it with Recharts. This is the same pattern used by Vanna.ai and chat2plot, and it is the only approach that is secure (no sandboxed execution), reliable (~0% failure with server-side column validation), and compatible with the existing Next.js 16 App Router architecture. Code execution sandboxes (ChatGPT style) are not viable for a Next.js SaaS and should not be considered.

The recommended stack is recharts@^2.15 with the shadcn/ui chart wrapper, html-to-image for PNG export, and native browser Blob API for Markdown export. Despite shadcn recently upgrading to Recharts v3, this milestone must use **recharts@^2.15**: Recharts v3 introduces a `react-redux` peer dependency and breaking API changes (removed `CategoricalChartState`, `activeShape`/`inactiveShape` deprecations) that are not warranted for a v1 personal tool. Version 2.15 is React 19 compatible, released January 2025, and well-tested in the App Router. The Vercel AI SDK is already installed at v4.3.x; the correct client-side part type is `type: 'tool-invocation'` with `toolInvocation.toolName === 'chart_spec'` — not the `type: 'tool-chart_spec'` pattern that appears in some SDK 4.2+ docs.

The two highest-risk areas are (1) DashboardShell migration from `m.content` to `message.parts` iteration — charts will silently never appear without this change — and (2) server-side column name validation before the tool result returns to the client, which prevents silent blank-chart bugs caused by the model hallucinating column names. Both must be addressed before charts ship. The mandatory build order is: `chart_spec` tool definition → `ChartBlock` component → parts renderer migration → all four chart types → message history persistence → PNG export.

---

## Key Findings

### Recommended Stack

The chart rendering stack is minimal and integrates cleanly with existing project dependencies. Recharts is already the underlying engine for the shadcn `chart` component, so no new architectural concept is introduced. html-to-image is the correct PNG export library — it reads computed styles (handling Tailwind v4 CSS custom properties), is Promise-based, and is lighter than html2canvas. Markdown export requires no library: a two-line `Blob` + `URL.createObjectURL` pattern is sufficient.

**Core technologies:**

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| recharts | ^2.15 | Bar, line, pie, scatter rendering | React 19 compatible; stable API; no react-redux dep; v3 breaking changes not warranted for v1 |
| shadcn/ui chart wrapper | latest | ChartContainer, ChartTooltip, ChartLegend | Provides `var(--chart-1..5)` color tokens; matches project component philosophy |
| html-to-image | ^1.11.13 | PNG export of rendered chart DOM node | Reads computed styles; handles Tailwind v4 CSS vars; Promise-based `toPng(ref.current)` API |
| Native Blob API | — | Markdown/TXT export | Zero dependency; `Blob` + `URL.createObjectURL` + `<a download>` covers the use case |
| ai (Vercel AI SDK) | ^4.3.x (already installed) | Streaming tool call delivery | `message.parts` API surfaces tool results inline; already integrated |

**Version conflict to resolve:** `pnpm dlx shadcn@latest add chart` would pull recharts@^3. Instead install recharts@^2.15 directly and pin the recharts peer dep in `package.json` overrides to prevent accidental v3 resolution.

**SSR requirement:** `<ChartBlock>` must be wrapped with `next/dynamic({ ssr: false })` at its import site in DashboardShell. A plain `"use client"` directive is not sufficient — Recharts calls `useLayoutEffect` and `ResizeObserver` which do not exist during SSR, causing hydration mismatches.

### Expected Features

The four chart types (bar, line, pie, scatter) are equally table-stakes. No subset is acceptable for v1. Charts must appear inline in the chat thread below the text answer, not on a separate page. PNG download is also required before v1 ships.

**Must have (table stakes):**
- Bar chart — most common chart type; every competitor has it
- Line chart — standard for time-series; CSV data is frequently time-series
- Pie chart — users ask proportion/percentage questions
- Scatter chart — users ask correlation questions
- Chart inline in chat thread, with title, axis labels, and tooltip
- Chart only appears when data warrants it (AI decides; single scalar answers must not produce a chart)
- Text answer accompanies every chart (chart is additive, not a replacement)
- PNG download via html-to-image

**Should have (differentiators):**
- AI-generated insight caption (add `insight` field to `chart_spec` schema; render as caption below chart) — low complexity, high trust value
- Chart type switcher (bar/line/pie toggle) — client-side re-render from same data, no new AI call; addresses wrong-chart frustration
- Graceful degradation message — friendly fallback when spec is invalid rather than blank render
- Clipboard copy (`navigator.clipboard.write()`) — faster than download for Slack/Notion pastes

**Defer to next milestone (v2+):**
- Markdown/TXT export (EXPORT-02) — straightforward but lower priority than PNG
- Data table toggle (show raw rows behind chart)
- Chart saved to a persistent dashboard
- PDF export (print-to-PDF from browser covers v1)
- Histogram, box plot, heatmap
- Multiple charts per message

### Architecture Approach

The chart spec flows through the Vercel AI SDK's tool-call mechanism. The LLM emits a `chart_spec` tool call during `streamText`; the route's `execute()` is a passthrough that returns the spec unchanged; the AI SDK streams it as a `ToolInvocationUIPart` in `message.parts`; DashboardShell dispatches it to `<ChartBlock>`. Chart data (up to 200 rows) is embedded directly in the tool result — no secondary DB fetch is needed or correct. The `execute()` passthrough is intentional: the LLM has already computed the relevant rows from the RAG context at generation time.

**Major components:**

| Component | Responsibility | Key Constraint |
|-----------|---------------|----------------|
| `/api/chat` route | Define `chart_spec` tool on `streamText`; server-side column validation; `onFinish` persistence of tool results | Tool name must stay stable — client renderer keys on `toolInvocation.toolName` |
| `lib/types/chart.ts` | `ChartSpec` interface shared by route and renderer | Must be defined before `ChartBlock` is built |
| `components/ChartBlock.tsx` | Pure presentational Client Component; renders all four chart types from spec; no data fetching | `"use client"` + `isAnimationActive={false}` + fixed height container; keyed by `toolCallId` |
| DashboardShell (message renderer) | Iterate `message.parts`; dispatch `text` to `<MarkdownMessage>`, `tool-invocation` where `toolName === 'chart_spec'` and `state === 'result'` to `<ChartBlock>` | **Must migrate from `m.content` rendering — this is the single most likely failure point** |
| `onFinish` + `getSessionMessagesAction` | Serialize full message including tool results to DB; reconstruct `toolInvocations` on history load | Without this, charts vanish after page reload |

**Correct SDK 4.3.x part type** (verified from installed `@ai-sdk/ui-utils@1.2.11` source):

```typescript
// type is 'tool-invocation', NOT 'tool-chart_spec'
if (part.type === 'tool-invocation') {
  const inv = part.toolInvocation;
  if (inv.toolName === 'chart_spec' && inv.state === 'result') {
    return <ChartBlock key={i} spec={inv.result as ChartSpec} />;
  }
}
```

**Streaming UX:** While `inv.state` is `'partial-call'` or `'call'`, render a skeleton (`h-48 bg-muted/30 animate-pulse`). Only mount `<ChartBlock>` when `state === 'result'`.

**History persistence:** Serialize tool results in `onFinish` as `JSON.stringify({ text, toolResults })` stored in the `content` column. On load in `getSessionMessagesAction`, detect JSON content and reconstruct `toolInvocations`. This is the simplest v1 approach without a DB migration.

### Critical Pitfalls

1. **Column name hallucination** — The model returns `x_column`/`y_column` values that do not exist in the uploaded CSV. Recharts renders a blank chart with no visible error. **Prevention:** Validate column names server-side in the `execute()` function against the session's stored column list before returning the tool result. Provide exact column headers as a bullet list in the system prompt (not prose). Optionally use `z.enum([...columnNames])` in the Zod schema at request time.

2. **DashboardShell never wired to `message.parts`** — The current renderer reads `m.content`; AI SDK tool results live in `m.parts`, not `m.content`. Charts will silently never appear without migrating to parts-based rendering. **Prevention:** Step 3 in the build order is a hard dependency — do not skip or defer it.

3. **Recharts SSR hydration mismatch** — Importing Recharts without `dynamic({ ssr: false })` causes `useLayoutEffect` warnings and layout shift. A plain `"use client"` directive is not enough. **Prevention:** `const ChartBlock = dynamic(() => import('./ChartBlock'), { ssr: false })` at the DashboardShell import site. Give `<ChartBlock>` a fixed-height container so parent layout is stable before the chart renders.

4. **html-to-image captures unstyled chart** — Tailwind v4 CSS custom properties (`--chart-1`, `--background`, etc.) cascade from the document root. A cloned subtree may not inherit them, producing a white/unstyled PNG. **Prevention:** Set explicit `style` attributes (not only `className`) on the export wrapper element. Use `pixelRatio: window.devicePixelRatio || 2` for retina. Base64-encode fonts if `@font-face` is in use.

5. **Tool result data inflates model context** — Embedding up to 200 rows in every tool result means a five-chart conversation can push 30k+ tokens of chart data into every subsequent request. **Prevention:** Cap data rows at 200 hard. For multi-turn sessions, consider stripping the `data` array from tool results before they re-enter conversation history (keep only spec metadata). Acceptable for v1; must be addressed before multi-user scale.

6. **`onFinish` only saves text, not tool results** — Charts appear during the live session but are missing when the session is reloaded from history. **Prevention:** Detect `toolResults.length > 0` in `onFinish` and serialize the full message state. Must ship before v1.0 is called complete.

---

## Implications for Roadmap

Based on the combined research, the mandatory build order emerges from hard dependency chains. The suggested phases map directly to these dependencies.

### Phase 1: chart_spec Tool + Type Definitions

**Rationale:** Everything else depends on the tool being defined and emitting results. This is the foundation. Nothing can be tested or built without it.
**Delivers:** `chart_spec` tool registered on `streamText` in `/api/chat/route.ts`; `ChartSpec` TypeScript interface in `lib/types/chart.ts`; server-side column name validation logic; system prompt updated with explicit chart-type selection rules.
**Addresses:** Table-stakes chart infrastructure; Pitfall 1 (column hallucination prevention); Pitfall 7 (wrong chart type defaults).
**Avoids:** Building ChartBlock before the contract (schema) is stable.
**Research flag:** Standard pattern — no additional research phase needed.

### Phase 2: ChartBlock Client Component

**Rationale:** Pure presentational component with no external dependencies beyond the spec type from Phase 1. Can be built and tested in isolation with mock data before message list wiring.
**Delivers:** `components/ChartBlock.tsx` rendering bar, line, pie, scatter from a `ChartSpec` prop; `isAnimationActive={false}` on all chart elements; fixed-height container; skeleton state for `state !== 'result'`; graceful error boundary for invalid specs; keyed by `toolCallId`.
**Addresses:** All four table-stakes chart types; graceful degradation; Pitfall 2 (SSR) via `next/dynamic({ ssr: false })`; Pitfall 5 (animation layout shift); Pitfall 8 (re-render cost via React.memo); Pitfall 9 (pie slice cap at 8); Pitfall 10 (scatter point cap at 500); Pitfall 12 (key prop stability).
**Stack:** `pnpm add recharts@^2.15` happens here.
**Research flag:** Standard pattern — no additional research phase needed.

### Phase 3: DashboardShell Parts Renderer Migration

**Rationale:** Cannot wire charts into the UI until both the tool (Phase 1) and ChartBlock (Phase 2) exist. This is the integration step and the highest-risk code change in the milestone.
**Delivers:** DashboardShell message renderer migrated to `message.parts` iteration; `text` parts dispatched to `<MarkdownMessage>`; `tool-invocation` parts where `toolName === 'chart_spec'` and `state === 'result'` dispatched to `<ChartBlock>`; `m.content` fallback preserved for pre-chart history messages; `<MessageList>` extracted as a separate component to avoid inflating DashboardShell further.
**Addresses:** Pitfall 6 (parts API not wired); Pitfall 8 (extracted component reduces re-render surface); Anti-Pattern 4 (message.content for tool results).
**Research flag:** SDK 4.3.x `'tool-invocation'` type confirmed from installed source — no ambiguity, no research phase needed.

### Phase 4: Chart Type Coverage + Prompt Engineering

**Rationale:** Once the render pipeline is wired (Phases 1-3), validate all four chart types end-to-end and tune the system prompt for reliable chart type selection.
**Delivers:** All four chart types verified with real CSV data; `insight` field added to `chart_spec` schema and rendered as caption; system prompt tuned with explicit line/pie/scatter selection rules; chart type switcher button (client-side re-render, no new AI call); pie category cap enforced at 8; scatter point cap enforced at 500.
**Addresses:** Differentiators (insight caption, type switcher); Pitfall 7 (chart type defaults); Pitfall 9 (pie overload); Pitfall 10 (scatter overplot).
**Research flag:** System prompt engineering for chart type selection may need a focused research pass if the project targets open-weight models beyond GPT-4o/Claude.

### Phase 5: History Persistence

**Rationale:** Must complete before v1.0 ships. Charts are missing from reloaded sessions until this is done. Can be deferred past initial rendering but not past launch.
**Delivers:** `onFinish` updated to serialize tool results as `JSON.stringify({ text, toolResults })` in the `content` column; `getSessionMessagesAction` updated with `hydrateMessage()` to reconstruct `toolInvocations` from JSON content; charts appear correctly in reloaded chat sessions.
**Addresses:** Pitfall 5 (anti-pattern: persisting only text); ensures charts survive page reloads.
**Research flag:** Implementation fully specified in ARCHITECTURE.md — no research phase needed.

### Phase 6: PNG Export (EXPORT-01)

**Rationale:** PNG download is table-stakes and must ship in v1. Depends on ChartBlock being stable (Phase 2).
**Delivers:** Export button on each message with a chart; `lib/export.ts` with `toPng(ref.current, { pixelRatio: window.devicePixelRatio || 2, cacheBust: true })`; explicit inline `style` attributes on export wrapper for Tailwind v4 CSS var compatibility; export button gated until animation is complete; clipboard copy via `navigator.clipboard.write()`.
**Addresses:** EXPORT-01 table-stakes; Pitfall 3 (Tailwind CSS vars in export); Pitfall 11 (capture during animation).
**Stack:** `pnpm add html-to-image`.
**Research flag:** html-to-image Tailwind v4 CSS variable behavior should be validated with a manual test before committing to the approach. Fallback: capture the Recharts SVG element directly via `svgElement.outerHTML`.

### Phase 7: Markdown Export (EXPORT-02)

**Rationale:** Lower priority than PNG; simple and fully additive.
**Delivers:** "Export answer" button that downloads the AI text response as a `.md` file; `exportMarkdown(content, filename)` utility using `Blob` + `URL.createObjectURL`; zero new dependencies.
**Addresses:** EXPORT-02 milestone deliverable.
**Research flag:** No research needed — native browser API.

---

### Phase Ordering Rationale

- Phases 1-3 are strictly ordered by hard dependency: tool contract must precede the renderer component, which must precede UI integration wiring.
- Phase 4 follows integration because chart type testing and prompt tuning require the full pipeline to be running.
- Phase 5 (persistence) can technically be parallelized with Phase 4 but is sequenced after to keep focus on working charts before durability.
- Phase 6 depends on Phase 2 (ChartBlock ref must exist) and is otherwise independent of Phases 3-5.
- Phase 7 is fully independent and placed last as it delivers the least value per complexity unit.

### Research Flags

**Needs targeted validation before implementation:**
- **Phase 4 (system prompt / chart type selection):** If the project targets open-weight models (Llama, Gemma, Mistral) in addition to GPT-4o/Claude, chart tool selection reliability drops significantly. Dedicated per-model prompt engineering research recommended.
- **Phase 6 (html-to-image + Tailwind v4):** CSS custom property inheritance in cloned DOM subtrees is an active edge case. Manual validation test recommended before building the full export UI.

**Standard patterns — no research phase needed:**
- **Phase 1:** Vercel AI SDK `tool()` + `streamText` well-documented; column validation pattern is standard.
- **Phase 2:** Recharts 2.15 component API is stable and well-documented.
- **Phase 3:** SDK 4.3.x part types confirmed from installed source.
- **Phase 5:** Persistence pattern fully specified in ARCHITECTURE.md.
- **Phase 7:** Native Blob API is trivial.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Recharts 2.15 + html-to-image confirmed from npm and GitHub. SDK types verified from installed node_modules. Version conflict (STACK.md says v3, ARCHITECTURE.md says v2.15) resolved: use v2.15 due to react-redux dep concern and breaking API changes in v3. |
| Features | HIGH | Table stakes derived from direct competitor analysis (Julius AI, ChatGPT ADA, Vanna.ai, Rows.com). chat2plot provides empirical reliability data for structured JSON approach. |
| Architecture | HIGH | SDK part types verified from installed `@ai-sdk/ui-utils@1.2.11` source. `tool-invocation` type and `toolInvocation.toolName` field confirmed — not inferred from docs. Passthrough `execute()` pattern confirmed. |
| Pitfalls | HIGH | Most pitfalls confirmed against official SDK docs, Recharts GitHub issues, and production experience reports. Column hallucination pitfall has direct analogues in text-to-SQL literature. |

**Overall confidence: HIGH**

### Gaps to Address

- **Recharts v2 vs v3 version conflict:** STACK.md recommends v3 (shadcn-native), ARCHITECTURE.md recommends v2.15 (no react-redux dep). Resolution for this milestone: recharts@^2.15. When installing the shadcn chart wrapper, pin or override the recharts peer dep. Revisit at the next milestone.

- **Context window management for multi-turn chart sessions:** The passthrough `execute()` embeds full data in the tool result, which re-enters conversation history on every turn. Acceptable at 200-row cap for v1. Needs a Redis-cached chart data approach (keyed by `toolCallId`, passed as reference not inline) before the product scales.

- **Model provider for chart tool reliability:** System prompt rules for chart type selection are tuned for GPT-4o/Claude. If the AI provider changes, prompt engineering needs re-validation. Known assumption, not a v1 blocker.

- **`getSessionMessagesAction` long-term approach:** The JSON-in-content approach works for v1. A future DB migration adding a `tool_results JSONB` column would be cleaner. Not blocking for this milestone.

---

## Sources

### Primary (HIGH confidence — directly inspected)

- Installed `@ai-sdk/ui-utils@1.2.11` type definitions — `ToolInvocationUIPart` type, `tool-invocation` literal, state values confirmed
- Installed `ai@4.3.19` index.d.ts — `tool()` helper export, `streamText` tool parameter
- Recharts 3.0 migration guide: https://github.com/recharts/recharts/wiki/3.0-migration-guide
- html-to-image GitHub (v1.11.13, Feb 2025): https://github.com/bubkoo/html-to-image
- GoodData pitfalls of chat UI for data analytics: https://www.gooddata.com/blog/pitfalls-of-chat-user-interfaces-for-data-nalytics/

### Secondary (MEDIUM confidence — current docs, may lag installed version)

- Vercel AI SDK tool calling docs: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling
- Vercel AI SDK chatbot with tool calling: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling
- Vercel AI SDK generative UI cookbook: https://ai-sdk.dev/cookbook/next/render-visual-interface-in-chat
- shadcn chart component: https://ui.shadcn.com/docs/components/radix/chart
- Recharts GitHub — SSR/ResponsiveContainer issue #38
- Recharts GitHub — useLayoutEffect SSR warning #3656
- AI SDK discussion — tool results larger than context window #8193

### Tertiary (LOW confidence — indirect or academic)

- chat2plot reliability data: https://github.com/nyanp/chat2plot
- LLM chart type selection shortcomings: https://towardsdatascience.com/mulitmodal-llms-interpreting-charts-b212f5c0aa1f/
- Function calling instruction engineering: https://arxiv.org/html/2407.04997v1
- Wren AI — reducing hallucinations in text-to-SQL: https://medium.com/wrenai/reducing-hallucinations-in-text-to-sql-building-trust-and-accuracy-in-data-access-176ac636e208

---

*Research completed: 2026-04-20*
*Ready for roadmap: yes*
