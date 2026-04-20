# Technology Stack

**Project:** CSV Analyst Pro — Chart Rendering + Export Milestone
**Researched:** 2026-04-20
**Scope:** Adding inline chart rendering and PNG/Markdown export to an existing Next.js 16 / React 19 AI chat application

---

## Recommended Stack

### Charting Library

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Recharts | ^3.x (latest: 3.8.1) | Inline chart rendering (bar, line, pie, scatter) | React 19 compatible; shadcn/ui's own `chart` component wraps Recharts v3; SVG-based so no canvas taint issues at render time; 24K+ GitHub stars; tree-shakeable; zero opinion on layout (works inside any flex/grid container) |
| shadcn/ui `chart` | latest (`pnpm dlx shadcn@latest add chart`) | ChartContainer, ChartTooltip, ChartLegend wrappers | Already in project's component philosophy; provides Tailwind v4 CSS variable color tokens (`var(--chart-1)` through `var(--chart-5)`); handles ResponsiveContainer boilerplate |

**Recharts v3 vs v2 decision:** shadcn upgraded to Recharts v3 in PR #8486. The project should use v3 from the start to avoid a second migration. The breaking changes (removed `CategoricalChartState`, renamed internal props) only matter if you were using undocumented internals — a new implementation is clean.

**React 19 peer dep note:** Recharts v3 lists React 16.8+ as minimum. A `react-is` version override may be needed in `package.json` `overrides` field to silence peer dep warnings with React 19. Functionally it works without the override; the override only silences npm install warnings.

**SSR note:** Recharts uses `window` and `ResizeObserver` internally. It must live in a Client Component (`"use client"`). Use `dynamic(() => import('./ChartBlock'), { ssr: false })` at the page level only if you need to avoid SSR entirely — but since charts are only rendered inside `useChat` message streams (which are already client-side), a plain `"use client"` directive on `<ChartBlock>` is sufficient. No `ssr: false` dynamic import needed.

### PNG Export Library

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| html-to-image | ^1.11.13 (released 2025-02-14) | Export a rendered `<ChartBlock>` DOM node as PNG | Modern fork of dom-to-image; Promise-based `toPng(ref.current)` API; smaller bundle than html2canvas; returns data URL directly — no canvas manipulation needed; actively maintained (v1.11.13, Feb 2025) |

**Why not html2canvas:** html2canvas re-renders the DOM by parsing CSS rules, which is heavy (2.6M weekly downloads but large bundle). It also has ongoing quirks with CSS custom properties and Tailwind utility classes. html-to-image uses SVG `<foreignObject>` serialization which respects computed styles directly and handles Tailwind v4 correctly.

**Why not recharts-to-png:** This library wraps html2canvas and adds a `useGenerateImage` hook, but it's a single-maintainer project. Using html-to-image directly is simpler, has fewer abstraction layers, and works on any DOM node — not just Recharts elements. Given EXPORT-01 also needs to capture the text answer alongside the chart, a generic DOM-capture approach is preferable.

**Known limitation:** If the chart container includes a cross-origin `<img>` (e.g., user avatars loaded from S3 without CORS headers), the canvas will be tainted and export will fail. For this project, chart containers contain only SVG from Recharts + Tailwind-styled text — no cross-origin images. No taint risk.

**Implementation pattern:**
```typescript
import { toPng } from 'html-to-image';

const handleExport = async () => {
  if (!chartRef.current) return;
  const dataUrl = await toPng(chartRef.current, { cacheBust: true });
  const link = document.createElement('a');
  link.download = `${title}.png`;
  link.href = dataUrl;
  link.click();
};
```

### Markdown / TXT Export

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native browser APIs only | — | Export AI answer text as `.md` download | No library needed. `Blob` + `URL.createObjectURL` + programmatic `<a download>` click is a two-line pattern. Zero bundle cost. Works in all modern browsers. |

**Implementation pattern:**
```typescript
const exportMarkdown = (content: string, filename: string) => {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};
```

This belongs in a `"use client"` utility (e.g., `lib/export.ts`) called from message action buttons. No Route Handler or API needed — purely client-side.

### Vercel AI SDK Tool-Call → Chart Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel AI SDK `ai` | ^4.3.0 (project's existing version) | Streaming chat + tool call delivery | Already installed. `message.parts` API (introduced in AI SDK 4.2) carries tool results inline in the stream |

**Tool result rendering pattern (AI SDK 4.x):**

The project uses AI SDK 4.3.x. The correct API is `message.parts` iteration — not the older `message.toolInvocations` array. Each part with `part.type === 'tool-chart_spec'` carries the structured chart spec when `part.state === 'output-available'`.

```typescript
// In ChatMessage.tsx (Client Component)
{message.parts.map((part, i) => {
  if (part.type === 'tool-chart_spec' && part.state === 'output-available') {
    return <ChartBlock key={i} spec={part.output} />;
  }
  if (part.type === 'text') {
    return <MarkdownMessage key={i} content={part.text} />;
  }
  return null;
})}
```

**State lifecycle for tool parts:**
- `input-available` — AI has emitted the tool call JSON (show skeleton/spinner)
- `output-available` — Server-side `execute()` returned the chart spec (render `<ChartBlock>`)
- `output-error` — Execution failed (show fallback text)

**Tool definition on the server:**
```typescript
tools: {
  chart_spec: tool({
    description: 'Return a chart specification for inline rendering',
    parameters: z.object({
      type: z.enum(['bar', 'line', 'pie', 'scatter']),
      title: z.string(),
      x_column: z.string(),
      y_column: z.string(),
      data: z.array(z.record(z.unknown())).max(200),
    }),
    execute: async (spec) => spec, // pass-through; data selection already done in RAG
  }),
}
```

**Important:** The tool name `chart_spec` maps to part type `tool-chart_spec`. Keep the tool name stable — changing it requires updating the client renderer.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Charts | Recharts v3 + shadcn chart | Tremor | Tremor's npm package (`@tremor/react`) has React 19 compatibility issues (depends on `@headlessui/react` v1.x); also adds a full component library on top of what shadcn already provides |
| Charts | Recharts v3 + shadcn chart | Victory | Larger bundle; D3-heavy; no shadcn integration; targets React Native cross-platform — unnecessary complexity for a web-only tool |
| Charts | Recharts v3 + shadcn chart | Chart.js (react-chartjs-2) | Canvas-based (not SVG); Canvas elements are harder to style with Tailwind CSS variables; taint risks if any external image is embedded; no native shadcn integration |
| PNG Export | html-to-image | recharts-to-png | Single-maintainer wrapper; html2canvas base has Tailwind/CSS-var quirks; html-to-image is lower level and more flexible for capturing text+chart together |
| PNG Export | html-to-image | html2canvas directly | Heavier bundle; slower DOM re-parsing; html-to-image is its modern replacement for React apps |
| Markdown Export | Native Blob API | file-saver library | No benefit for a single text-file download pattern; adds a dependency unnecessarily |
| Markdown Export | Native Blob API | Server Route Handler | Adds network round-trip and server complexity for content that's already on the client |

---

## Installation

```bash
# Add Recharts and shadcn chart wrapper
pnpm dlx shadcn@latest add chart
# (this installs recharts@^3 automatically via shadcn)

# Add PNG export
pnpm add html-to-image

# React 19 peer dep silence (optional — functional without it)
# Add to package.json "overrides": { "react-is": "^19.0.0" }
```

No additional dependencies needed for Markdown export.

---

## Version Compatibility Matrix

| Library | Version | React 19 | Next.js 16 | Tailwind v4 | Notes |
|---------|---------|-----------|------------|-------------|-------|
| recharts | 3.8.1 | Yes (react-is override for clean install) | Yes (Client Component only) | Yes (CSS vars via shadcn) | shadcn chart wraps it |
| html-to-image | 1.11.13 | Yes (no React peer dep) | Yes (browser-only, "use client") | Yes (reads computed styles) | Last updated Feb 2025 |
| ai (Vercel) | 4.3.x | Yes | Yes | — | Already installed |

---

## Sources

- Recharts npm: https://www.npmjs.com/package/recharts (v3.8.1, last published ~1 month before research date)
- Recharts 3.0 migration guide: https://github.com/recharts/recharts/wiki/3.0-migration-guide
- shadcn chart component (Recharts v3): https://ui.shadcn.com/docs/components/radix/chart
- shadcn Recharts v3 upgrade PR: https://github.com/shadcn-ui/ui/pull/8486
- Tremor React 19 issue: https://github.com/tremorlabs/tremor-npm/issues/1072
- html-to-image GitHub: https://github.com/bubkoo/html-to-image (v1.11.13, Feb 14 2025)
- html-to-image vs html2canvas comparison: https://betterprogramming.pub/heres-why-i-m-replacing-html2canvas-with-html-to-image-in-our-react-app-d8da0b85eadf
- recharts-to-png GitHub: https://github.com/brammitch/recharts-to-png
- AI SDK Generative UI docs: https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces
- AI SDK chatbot tool calling: https://ai-sdk.dev/docs/ai-sdk-ui/chatbot-with-tool-calling
- Vercel AI SDK render visual interface cookbook: https://ai-sdk.dev/cookbook/next/render-visual-interface-in-chat
- Recharts SSR / window undefined fix pattern: https://dev.to/devin-rosario/stop-window-is-not-defined-in-nextjs-2025-394j
