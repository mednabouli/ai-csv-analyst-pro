# CSV Analyst Pro

## What This Is

A personal AI data analytics tool. Upload a CSV file, ask questions in natural language, and get fast data-backed answers with inline charts (bar, line, pie, scatter) and exportable insights. Built on Next.js 16, Vercel AI SDK, RAG over pgvector, and Stripe for plan management.

## Core Value

Ask a question about a CSV and get a trustworthy answer — with an inline chart when the data calls for it.

## Requirements

### Validated

<!-- Already shipped and working in the codebase. -->

- ✓ User can sign up with email/password and log in — existing
- ✓ User can upload a CSV file and have it parsed, chunked, and embedded — existing
- ✓ User can ask natural language questions about their CSV and get streaming AI answers — existing
- ✓ Multi-provider AI support (OpenAI, Anthropic, Ollama local) behind a single abstraction — existing
- ✓ Session sidebar: list, rename, delete CSV sessions — existing
- ✓ Billing plans (free/starter/pro) with Stripe checkout and portal — existing
- ✓ Edge-level rate limiting via Upstash Redis proxy middleware — existing
- ✓ Password reset flow (forgot password → email link → reset) — existing
- ✓ Observability: Langfuse tracing + Sentry error tracking — existing

### Active

<!-- Current v1.0 scope — building toward these. -->

- [ ] **BUG-01**: Fix garbled UI text in UploadZone ("705 … 014") and DashboardShell header ("b7")
- [ ] **BUG-02**: Fix optimistic upload `sizeBytes: 0` (show real file size immediately after upload)
- [ ] **BUG-03**: Add auto-scroll to bottom when new chat messages arrive or AI streams tokens
- [ ] **BUG-04**: Remove dead code — `ChatPanel` stub and `DashboardClient` (never rendered)
- [ ] **AUTH-01**: Fix fake "Resend verification email" — implement real server action call
- [ ] **AUTH-02**: Add account settings / profile page with account deletion (required by ToS)
- [ ] **CHART-01**: Add charting library (Recharts) and render inline charts from AI-generated chart specs
- [ ] **CHART-02**: AI returns structured chart-spec tool calls (type, columns, title) alongside text answers
- [ ] **CHART-03**: Support all four chart types: bar, line, pie, scatter
- [ ] **EXPORT-01**: Export chat answer + chart as downloadable PNG/clipboard image
- [ ] **EXPORT-02**: Export raw AI answer text as Markdown/TXT download
- [ ] **PERF-01**: Fix `generateEmbeddings` to batch OpenAI `embedMany` calls in ≤2048-chunk groups
- [ ] **SECURITY-01**: Add per-user sliding-window rate limit on `/api/chat` (Upstash, keyed on user ID)

### Out of Scope

- Billing correctness fixes (atomic counters, cron reset) — good enough for personal single-user use
- Multi-file analysis across sessions — single-file focus for v1.0
- Team / collaboration features — personal tool
- Mobile app — web-first
- Drag-and-drop polish beyond native file dialog — low priority UX gap

## Context

**Current state:** The core loop (upload → embed → chat) works end-to-end. Auth, billing, and observability are all wired. The primary gaps before v1.0 are: a handful of visible UI bugs, a broken auth stub (email resend), missing chart rendering, and missing export functionality.

**Tech stack:** Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn/ui, better-auth, Drizzle ORM + Neon (Postgres + pgvector), Upstash Redis, Vercel AI SDK, Stripe.

**Chart approach decision:** AI returns structured `chart_spec` tool-call results (JSON: type, x_column, y_column, title, data subset) rendered by a `<ChartBlock>` Client Component using Recharts.

**Known fragile area:** `DashboardShell.tsx` is a 362-line monolithic Client Component — chart and export work should extract state slices rather than further inflating it.

## Constraints

- **Tech stack**: Next.js 16 App Router only — no Pages Router patterns
- **UI**: shadcn/ui + Tailwind v4 — no additional component libraries
- **Auth**: better-auth — no changes to auth provider
- **Charts**: Recharts — lightweight, well-maintained, RSC-compatible
- **Secrets**: All keys in `.env.local` — never hardcoded

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Recharts for charts | Lightweight, React 19 compatible, no extra deps beyond what shadcn uses | — Pending |
| AI returns chart_spec as tool call | Keeps chart rendering in the UI layer; AI stays stateless | — Pending |
| Skip billing correctness for v1.0 | Personal tool — single user, race conditions irrelevant | — Pending |
| Account settings page as v1 requirement | ToS explicitly promises it; legal compliance gap | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-20 after initialization*
