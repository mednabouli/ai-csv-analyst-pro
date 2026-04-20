# Domain Pitfalls: Chart Generation for CSV Analytics AI

**Domain:** AI-powered CSV analytics with inline chart rendering and PNG export
**Researched:** 2026-04-20
**Confidence:** HIGH (most findings verified against official docs, SDK source, and confirmed GitHub issues)

---

## Critical Pitfalls

Mistakes that cause rewrites, silent data corruption, or broken user experiences.

---

### Pitfall 1: AI Hallucinates Column Names in chart_spec Tool Calls

**What goes wrong:**
The model returns a `chart_spec` with `x_column` or `y_column` values that do not exist in the uploaded CSV. The chart silently renders empty or throws a runtime error. This is the analogue of the well-documented text-to-SQL problem where models use "description" instead of "creatorDescription" even when the schema is provided.

**Why it happens:**
The system prompt and RAG context give the model column names as plain text. The model may paraphrase, abbreviate, or conflate column names with synonyms it has seen in training. Zod schema validation on the *shape* of the `chart_spec` object (type, x_column, y_column, title) does not validate that the column values actually exist in the CSV — that is application-level validation the SDK cannot perform.

**Consequences:**
- `<ChartBlock>` receives valid JSON that references nonexistent data keys; Recharts renders a blank chart with no visible error.
- Users lose trust in the product. The bug is subtle and hard to reproduce without the exact CSV that caused it.

**Prevention:**
1. After the tool call resolves, server-side: validate `x_column` and `y_column` against the session's stored column list before returning the tool result to the client.
2. If validation fails, return an error tool result with the actual column list so the model can self-correct in a follow-up step (the AI SDK v5 `toModelMessage` pattern supports this).
3. In the system prompt, provide the exact column headers as a bullet list: "The CSV has these exact column names: [...]". Avoid describing them in prose.
4. Use Zod `z.enum([...columnNames])` for the column fields if the column set is known at request time (inject it dynamically).

**Detection / Warning Signs:**
- ChartBlock renders with correct chart type but no visible bars/lines/points.
- Console error: `Cannot read properties of undefined` in Recharts data accessor.
- Tool call response time is very fast (model used training data, not RAG context).

**Phase:** CHART-02 (AI returns structured chart-spec tool calls)

---

### Pitfall 2: Recharts Hydration Mismatch / useLayoutEffect Warning in App Router

**What goes wrong:**
Importing Recharts components (BarChart, LineChart, etc.) into a file that is server-rendered — or forgetting `"use client"` — causes either a React hydration mismatch error or a `useLayoutEffect` warning: "useLayoutEffect does nothing on the server." In streaming contexts, the component may render on the server with zero dimensions, then re-render on the client with different dimensions, causing a visible layout shift.

**Why it happens:**
Recharts uses D3 internally and calls `useLayoutEffect` to measure DOM dimensions. `useLayoutEffect` is a no-op on the server. When `ResponsiveContainer` is used, it uses `ResizeObserver`, which also does not exist on the server. The component's server output (empty/zero-size SVG) does not match the client output (measured dimensions).

**Consequences:**
- React hydration error in development; silent mismatch in production that causes the chart to flash or jump on initial load.
- `ResponsiveContainer` with no explicit dimensions renders nothing on the server, causing a 0-height gap that collapses other elements.

**Prevention:**
1. Wrap `<ChartBlock>` in `next/dynamic` with `{ ssr: false }` at the import site. This is the only fully safe approach.
2. Set explicit `width` and `height` props (or a known pixel value) on `ResponsiveContainer` even if you intend responsive behavior — use CSS to control the outer container dimensions instead.
3. Never import Recharts components in a Server Component or a file without `"use client"`.

```typescript
// ChartBlock.tsx — correct pattern
"use client";
import dynamic from "next/dynamic";
const RechartsBarChart = dynamic(
  () => import("recharts").then((m) => m.BarChart),
  { ssr: false }
);
```

Or more simply: wrap the entire `<ChartBlock>` component itself with `dynamic(..., { ssr: false })` at the call site in `DashboardShell`.

**Detection / Warning Signs:**
- React dev console: "Warning: useLayoutEffect does nothing on the server"
- React dev console: "Hydration failed because the initial UI does not match what was rendered on the server"
- Chart renders with correct data but flashes blank on first load, then snaps to correct size.

**Phase:** CHART-01 (Add charting library and render inline charts)

---

### Pitfall 3: html-to-image Captures Blank or Unstyled Charts (Tailwind v4 + External Fonts)

**What goes wrong:**
`html-to-image` (or `html2canvas`) serializes inline styles from the DOM but does not automatically include external CSS (Tailwind's generated stylesheet) or fonts loaded via `@font-face` / Google Fonts CDN. The exported PNG looks correct in the browser but exports as an unstyled or blank image. Recharts SVG elements themselves export correctly, but the surrounding card shell (bg color, border, typography) is missing.

**Why it happens:**
`html-to-image` clones the DOM node, inlines computed styles, then renders to a canvas. But:
- Fonts referenced by URL (`@font-face src: url(...)`) are fetched from an external origin — the clone cannot access them without CORS headers. If the font CDN does not set `Access-Control-Allow-Origin: *`, the canvas is tainted and `toDataURL()` throws.
- Tailwind v4 uses a single `<style>` injection at the document root. The cloned subtree references CSS custom properties (design tokens), but if those cascade from a parent element not included in the captured subtree, they resolve to their initial values (usually transparent/black).

**Consequences:**
- Exported PNG is a blank white rectangle, or shows unstyled text with wrong colors.
- On retina displays (devicePixelRatio = 2), exported PNG is half the intended resolution if `pixelRatio` option is not set.

**Prevention:**
1. Use `html-to-image` `toPng()` with `pixelRatio: window.devicePixelRatio || 2` to handle retina.
2. Capture the chart element that is self-contained with inline styles, or wrap the export target in a wrapper that explicitly sets background color and font via inline `style` attributes (not only className).
3. For fonts: use `fetchFonts: true` in html-to-image options, or convert the font to a base64 data URL embedded in a `<style>` tag injected into the captured element.
4. Include the CSS custom properties root in the clone scope: capture a wrapper that includes the `style` tag defining `--background`, `--foreground`, etc., or set them inline.
5. Prefer capturing the Recharts SVG element directly via `svgElement.outerHTML` and converting it to a Blob — SVGs are self-contained and have no CORS or font issues.

**Detection / Warning Signs:**
- Exported PNG is white or missing text.
- Browser console: "The canvas has been tainted by cross-origin data."
- PNG appears correct on 1x screen but blurry on retina.

**Phase:** EXPORT-01 (Export chat answer + chart as downloadable PNG)

---

### Pitfall 4: Tool Result Data Exceeds Model Context Window

**What goes wrong:**
The `chart_spec` tool result includes a `data` array (the actual rows to render) passed inline back to the model for multi-turn context. If the user asks about a 50,000-row CSV, and the tool result naively includes all matching rows, the tool result alone can exceed the model's context window (128k tokens for GPT-4o, 200k for Claude). The AI SDK by default re-submits the entire conversation history including all tool results on each turn. Context overflow is silent — the SDK throws a token limit error, or the model truncates context, losing earlier chart data.

**Why it happens:**
The "data in tool result" approach is convenient for single-turn chart rendering. It becomes a liability in multi-turn conversations because every tool result persists in the message history sent on each subsequent request. A five-chart conversation can push 30k+ tokens of chart data into every subsequent request.

**Consequences:**
- Requests fail with "maximum context length exceeded" errors.
- Latency increases dramatically as conversation grows.
- Costs escalate.

**Prevention:**
1. Never include the full data payload in the tool result that goes to the model. Instead: the tool result returned to the model should be a brief confirmation ("chart_spec validated; 47 rows selected for bar chart of Revenue by Region"), while the full data array is passed only to the UI layer via a separate mechanism.
2. In AI SDK v5+, use `toModelMessage` to strip or truncate the data payload from chart tool results before they enter the conversation history.
3. Cap data rows at a fixed limit (e.g., 500 rows max) in the tool handler. Log a warning if the query would produce more. Use aggregation in the RAG layer rather than returning raw rows.
4. Store the chart data in a server-side cache (e.g., the existing Upstash Redis instance) keyed by `toolCallId`, and have the client fetch it separately. Pass only the key in the tool result.

**Detection / Warning Signs:**
- API error: "This model's maximum context length is 128000 tokens. However, your messages resulted in X tokens."
- Response latency grows linearly with number of charts in the session.
- Second or third chart question in a session fails when the first did not.

**Phase:** CHART-02 (AI returns structured chart-spec tool calls)

---

## Moderate Pitfalls

### Pitfall 5: Recharts Entry Animation Causes Layout Shifts in Streaming Message List

**What goes wrong:**
When a new `<ChartBlock>` is appended to the message list while streaming is still in progress, Recharts' default entry animation (bars growing from 0, lines drawing) triggers a layout recalculation in the containing scroll container. The message list jumps or scrolls away from the streaming text. On slow connections, this creates a jarring visual — chart animates in, then auto-scroll fires, then the next streaming token appears.

**Why it happens:**
Recharts uses CSS transitions on SVG element dimensions (width, height). These are layout-affecting properties. When a new message containing a chart is appended to a flex column, the browser first paints the chart at height 0, then transitions it to full height, causing the parent container to reflow. Auto-scroll logic (if keyed to message count) fires before the animation completes, landing at the wrong scroll position.

**Consequences:**
- User is scrolled past the chart before they can see it animate in.
- Layout shift is perceivable and unprofessional.

**Prevention:**
1. Set `isAnimationActive={false}` on all Recharts chart elements inside `<ChartBlock>`. Chart animation is a nice-to-have; smooth streaming UX is a requirement.
2. Give `<ChartBlock>` a fixed height container (e.g., `h-64`) so the parent flex layout knows the chart's dimensions immediately, preventing reflow when the SVG renders.
3. Auto-scroll logic should be triggered by a `ResizeObserver` on the message container, not by message count, so it fires after the chart's container dimensions are stable.

**Detection / Warning Signs:**
- Message list jumps when a chart appears.
- Smooth scroll target overshoots or undershoots after chart render.
- Visible animation that competes with the streaming text effect.

**Phase:** CHART-01 (rendering integration in DashboardShell message list)

---

### Pitfall 6: Message Rendering Breaks When Mixing text Parts and tool Parts

**What goes wrong:**
The current `DashboardShell` renders `m.content` as the raw message string for assistant messages. When the AI SDK returns a message that includes both a text part and a `tool-call` part (the chart spec), `m.content` may be an empty string (the text content is in `m.parts`) or contain the full text but not the tool result. The chart simply never appears in the UI.

**Why it happens:**
Vercel AI SDK v4+ uses a `message.parts` array to represent mixed-content messages. Each part is typed: `text`, `tool-call`, `tool-result`, `step-start`. The `message.content` field is a legacy fallback that does not contain tool-call parts. If rendering code reads only `message.content`, tool invocations are silently dropped.

The current `DashboardShell.tsx` (line 259) passes `m.content` directly to `<MarkdownMessage>` for assistant messages. It has no handling for `message.parts` at all. This will miss every chart spec.

**Consequences:**
- Charts never appear in the UI even though the AI correctly returns chart_spec tool calls.
- No visible error — the text answer renders correctly, but the chart is silently dropped.

**Prevention:**
1. Migrate message rendering in `DashboardShell` to iterate `message.parts` instead of reading `message.content`.
2. Handle each part type: `text` → `<MarkdownMessage>`, `tool-chart_spec` with state `output-available` → `<ChartBlock>`, `tool-chart_spec` with state `input-streaming` → skeleton loader.
3. Preserve `message.content` rendering as a fallback only for messages that predate the chart feature (no parts array).

**Detection / Warning Signs:**
- AI returns `toolInvocations` in SDK debug logs but no chart appears.
- `message.content` is an empty string for assistant messages that contain tool calls.
- Network tab shows the `chart_spec` tool result in the SSE stream, but the UI does not react.

**Phase:** CHART-01 + CHART-02 (tight integration between spec and rendering)

---

### Pitfall 7: Wrong Chart Type Selection — Model Defaults to Bar for Everything

**What goes wrong:**
Without explicit guidance, LLMs default to bar charts for nearly all quantitative questions. Time-series data gets a bar chart instead of a line chart. Part-of-whole data gets a bar chart instead of a pie. Scatter is almost never selected spontaneously. Research confirms that major LLMs (GPT-4o, Claude, Gemini) exhibit "significant shortcomings in practicality and interpretability" when selecting chart types from vague prompts.

**Why it happens:**
Bar charts are the most represented chart type in training data. The model pattern-matches "compare numbers" to bar chart. Without an explicit decision rubric in the system prompt, there is no signal to prefer line or pie.

**Consequences:**
- A "show revenue trend over time" question produces a bar chart (technically valid, but not best practice).
- Users see a bar chart for market share percentages instead of a pie/donut.
- Product looks unsophisticated.

**Prevention:**
1. Add explicit chart type selection rules to the system prompt for the `chart_spec` tool:
   - "Use `line` when x_column is a date/time or sequential period."
   - "Use `pie` when the data represents proportions of a whole (≤8 categories)."
   - "Use `scatter` when comparing two continuous numeric columns with no time dimension."
   - "Use `bar` for categorical comparisons where none of the above apply."
2. In the Zod schema for `chart_spec`, add a `chart_type_rationale` string field to force the model to reason about the choice before committing to it (chain-of-thought in schema form).
3. After chart renders, surface the rationale as a tooltip or footnote so the user can understand the choice.

**Detection / Warning Signs:**
- Every chart the AI generates is type `bar`.
- A date column is used as `x_column` in a bar chart.
- User explicitly asks for a trend and gets a bar chart.

**Phase:** CHART-02 (AI returns structured chart-spec tool calls) — system prompt design

---

### Pitfall 8: DashboardShell Re-Render Cost When Charts Are in the Message List

**What goes wrong:**
`DashboardShell` is a single 362-line Client Component. Every streaming token from `useChat` triggers a re-render of the entire component tree, including all previously rendered `<ChartBlock>` instances. Recharts charts are not cheap to re-render (SVG diffing, D3 layout recalculation). In a conversation with 5 charts, each streamed token causes 5 chart re-renders.

**Why it happens:**
Confirmed by production analysis of the AI SDK `useChat` hook: "On every re-render, new message objects are created." Without `React.memo` boundaries around individual message items (and especially around `<ChartBlock>`), the entire message list re-renders on every token.

**Consequences:**
- Streaming feels janky and slow after several charts have been rendered.
- CPU usage spikes during streaming on low-end hardware.

**Prevention:**
1. Wrap the message item component (the div containing `<MarkdownMessage>` or `<ChartBlock>`) in `React.memo`.
2. Memoize the `messages` array with `useMemo` in `DashboardShell`, or better: extract a `<MessageList>` component that receives stable props.
3. Set `isAnimationActive={false}` on charts (also prevents re-animation on each re-render).
4. This is a secondary reason to extract chart state out of `DashboardShell` (per the known fragile area note in PROJECT.md) rather than inline more logic into it.

**Detection / Warning Signs:**
- React DevTools profiler shows Recharts internals re-rendering 10-20 times per second during streaming.
- Streaming text appears choppy after the first chart is rendered.
- Performance degrades linearly with number of charts in the session.

**Phase:** CHART-01 (performance during streaming integration)

---

## Minor Pitfalls

### Pitfall 9: Pie Chart with Too Many Slices

**What goes wrong:**
The AI selects `pie` for a categorical column that has 20+ unique values. Recharts renders 20 tiny slices that are illegible. Labels overlap. The chart is worse than no chart.

**Prevention:**
Cap pie charts at 8 categories in the tool handler. If the column has more unique values, either switch to bar or aggregate the smallest values into an "Other" bucket. Add this rule to the Zod schema description for `chart_spec`.

**Phase:** CHART-02, CHART-03

---

### Pitfall 10: Scatter Chart Data Points Overplotting

**What goes wrong:**
A scatter chart with 10,000 data points renders 10,000 SVG `<circle>` elements. Recharts does not virtualize SVG. The browser renders slowly, interaction is sluggish, and the chart is visually uninformative.

**Prevention:**
Cap scatter chart data at 500 points. Apply random or systematic sampling in the tool handler. Document the sampling in the chart's subtitle.

**Phase:** CHART-03

---

### Pitfall 11: Export Button Captures Chart Mid-Animation

**What goes wrong:**
If `isAnimationActive` is left on (against recommendation above) and the user clicks Export immediately after a chart appears, `html-to-image` captures the DOM during the animation — bars are partially drawn, creating a broken-looking export.

**Prevention:**
Either disable animations (see Pitfall 5) or gate the Export button to a `ready` state that is set by an `onAnimationEnd` callback from Recharts.

**Phase:** EXPORT-01

---

### Pitfall 12: Missing `key` Prop Causes Chart to Not Update When Data Changes

**What goes wrong:**
When the user asks a follow-up question that changes the chart (same type, different columns), Recharts may not re-render correctly if the `<ChartBlock>` component is reconciled against the previous instance. The old chart data lingers.

**Prevention:**
Always pass a stable, unique `key` to `<ChartBlock>` that is derived from the `toolCallId` of the chart_spec tool invocation. The AI SDK provides `toolCallId` on every tool invocation.

**Phase:** CHART-01

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| CHART-01: Add Recharts | Hydration mismatch with SSR (Pitfall 2) | `dynamic(..., { ssr: false })` on ChartBlock |
| CHART-01: Message list integration | Parts API not wired; charts silently dropped (Pitfall 6) | Migrate from `m.content` to `m.parts` rendering |
| CHART-01: Streaming performance | Chart re-renders on every token (Pitfall 8) | React.memo on message items |
| CHART-02: Tool call schema | Hallucinated column names (Pitfall 1) | Server-side column validation post-tool-call |
| CHART-02: Tool call schema | Wrong chart type defaults (Pitfall 7) | Explicit decision rubric in system prompt |
| CHART-02: Tool result design | Large data in tool result inflates context (Pitfall 4) | Cap rows, strip data from model-facing result |
| CHART-03: Pie/scatter types | Pie overload / scatter overplot (Pitfalls 9, 10) | Row caps and category limits in tool handler |
| EXPORT-01: PNG export | Tailwind styles and fonts missing (Pitfall 3) | Inline styles on export target, base64 fonts |
| EXPORT-01: PNG export | Capture during animation (Pitfall 11) | Disable animation or gate export to onAnimationEnd |

---

## Sources

- Vercel AI SDK Troubleshooting — Tool Calling with Structured Outputs: https://ai-sdk.dev/docs/troubleshooting/tool-calling-with-structured-outputs
- Vercel AI SDK — Chatbot with Tool Calling (message.parts API): https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling
- Vercel AI SDK Discussion — Handling Tool Results Larger Than Context Window: https://github.com/vercel/ai/discussions/8193
- Recharts GitHub Issue — Server Side Rendering / ResponsiveContainer: https://github.com/recharts/recharts/issues/38
- Recharts GitHub Issue — useLayoutEffect SSR Warning: https://github.com/recharts/recharts/issues/3656
- Recharts GitHub Issue — isAnimationActive and real-time data: https://github.com/recharts/recharts/issues/375
- html-to-image GitHub Issue — SVG compatibility with design tools: https://github.com/bubkoo/html-to-image/issues/329
- LogRocket — Export React Components as Images with html2canvas: https://blog.logrocket.com/export-react-components-as-images-html2canvas/
- DEV Community — Vercel AI SDK useChat in Production: https://dev.to/whoffagents/vercel-ai-sdk-usechat-in-production-lessons-from-30-days-of-real-traffic-4gbo
- ACM — Leveraging Prompt Engineering to Facilitate AI-driven Chart Generation: https://dl.acm.org/doi/10.1145/3703187.3703231
- Towards Data Science — LLM Chart Interpretation Shortcomings: https://towardsdatascience.com/mulitmodal-llms-interpreting-charts-b212f5c0aa1f/
- Wren AI — Reducing Hallucinations in Text-to-SQL: https://medium.com/wrenai/reducing-hallucinations-in-text-to-sql-building-trust-and-accuracy-in-data-access-176ac636e208
- Next.js Hydration Error Documentation: https://nextjs.org/docs/messages/react-hydration-error
