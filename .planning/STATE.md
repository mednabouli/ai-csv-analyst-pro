# Project State

## Project Reference
- **Core value**: Ask a question about a CSV and get a trustworthy answer — with an inline chart when the data calls for it.
- **Current focus**: Chart Rendering + Export Milestone (v1.0)

## Current Position
- **Milestone**: v1.0 Chart Rendering + Export
- **Phase**: 1. Chart Specification Foundation
- **Plan**: TBD (planning in progress)
- **Status**: Not started
- **Progress bar**: [##########] 0%

## Performance Metrics
- **Phase completion rate**: 0%
- **Plans completed vs planned**: 0/0
- **Blocked time**: 0 minutes
- **Interceptor efficiency**: N/A

## Accumulated Context

### Decisions
- Use recharts@^2.15 (not v3) to avoid react-redux peer dependency and breaking changes
- Chart spec flows through Vercel AI SDK tool-call mechanism with server-side column validation
- PNG export via html-to-image, Markdown export via native Blob API
- Charts appear inline in chat thread below text answers

### Todos
- [ ] Define chart_spec tool schema with validation
- [ ] Install and configure Recharts v2.15
- [ ] Build ChartBlock Client Component
- [ ] Migrate DashboardShell to message.parts iteration
- [ ] Implement chart type switcher
- [ ] Add insight caption to chart_spec
- [ ] Implement PNG export with html-to-image
- [ ] Implement Markdown export
- [ ] Ensure chart persistence after page reload
- [ ] Fix garbled UI text in UploadZone and DashboardShell header
- [ ] Fix optimistic upload sizeBytes display
- [ ] Add auto-scroll for new chat messages
- [ ] Remove dead code (ChatPanel stub, DashboardClient)
- [ ] Fix fake "Resend verification email" auth stub
- [ ] Add account settings/profile page with deletion
- [ ] Batch OpenAI embedMany calls in ≤2048-chunk groups
- [ ] Add per-user sliding-window rate limit on /api/chat

### izen
(no entries yet)

**.: Session Continuity**
- **Last phase**: None (fresh initialization)
- **Last plan**: None
- **Last command**: /gsd-new-project orchestrator
- **Recommendation**: Begin with `/gsd-plan-phase 1` to decompose Phase 1 into executable plans