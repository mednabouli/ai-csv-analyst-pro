# v1 Requirements

## Chart Rendering + Export Milestone

### Validated

(None yet — ship to validate)

### Active

#### Chart Infrastructure
- [ ] **CHART-01**: Install and configure Recharts v2.15 as the charting library
- [ ] **CHART-02**: Define `chart_spec` tool schema with validation and column name checking
- [ ] **CHART-03**: Build `ChartBlock` Client Component to render bar, line, pie, scatter charts
- [ ] **CHART-04**: Migrate `DashboardShell` message renderer to `message.parts` iteration
- [ ] **CHART-05**: Add chart type switcher (client-side re-render from same spec)
- [ ] **CHART-06**: Add insight caption field to `chart_spec` and render below chart
- [ ] **CHART-07**: Implement graceful degradation for invalid specs (friendly message, not blank)

#### Chart Types (Table Stakes)
- [ ] **CHART-BAR**: Render vertical bar charts with axis labels and tooltips
- [ ] **CHART-LINE**: Render line charts with smooth curves and point tooltips
- [ ] **CHART-PIE**: Render pie/donut charts with percentage labels and hover tooltips
- [ ] **CHART-SCATTER**: Render scatter plots with point tooltips and trend lines

#### Export Functionality
- [ ] **EXPORT-01**: Add PNG download button for chart + answer using html-to-image
- [ ] **EXPORT-02**: Add Markdown/TXT download button for AI answer text
- [ ] **EXPORT-03**: Ensure export works with Tailwind v4 CSS variables (explicit inline styles)
- [ ] **EXPORT-04**: Add clipboard copy button for chart PNG and answer text

#### History & Persistence
- [ ] **PERSIST-01**: Update `onFinish` to serialize full message state including tool results
- [ ] **PERSIST-02**: Update `getSessionMessagesAction` to reconstruct tool invocations from JSON
- [ ] **PERSIST-03**: Ensure charts persist correctly after page reload and session restore

#### Anti-Hallucination & Validation
- [ ] **VALID-01**: Server-side validation of `x_column`/`y_column` against session's column list
- [ ] **VALID-02**: System prompt updated with explicit chart type selection rules
- [ ] **VALID-03**: Cap chart data rows at 200 to prevent context window pollution
- [ ] **VALID-04**: Optional: use Zod enum for column names in tool schema at request time

#### UX / Polish
- [ ] **UX-01**: Show skeleton loader during chart generation (`state === 'partial-call'`)
- [ ] **UX-02**: Key chart components by `toolCallId` for stable React reconciliation
- [ ] **UX-03**: Extract `MessageList` component to reduce `DashboardShell` re-render surface
- [ ] **UX-04**: Ensure chart container has fixed height to prevent layout shift

### Out of Scope

- Python sandbox execution (ChatGPT style) — security risk, not viable for Next.js SaaS
- PDF export — lower priority than PNG; browser print-to-PDF covers v1
- Multiple charts per message — adds complexity not needed for v1 personal tool
- Histogram, box plot, heatmap charts — long-tail chart types, defer to v2+
- Chart saved to persistent dashboard — requires auth/db work, defer to v2+
- Data table toggle (show raw rows behind chart) — nice-to-have, not table stakes
- SVG export — technically valid but users don't actually use it; PNG is sufficient
- Team collaboration features — personal tool for v1
- Mobile app — web-first approach

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CHART-01 | Phase 1 | Pending |
| CHART-02 | Phase 1 | Pending |
| CHART-03 | Phase 2 | Pending |
| CHART-04 | Phase 3 | Pending |
| CHART-05 | Phase 4 | Pending |
| CHART-06 | Phase 4 | Pending |
| CHART-07 | Phase 2 | Pending |
| CHART-BAR | Phase 2 | Pending |
| CHART-LINE | Phase 2 | Pending |
| CHART-PIE | Phase 2 | Pending |
| CHART-SCATTER | Phase 2 | Pending |
| EXPORT-01 | Phase 6 | Pending |
| EXPORT-02 | Phase 6 | Pending |
| EXPORT-03 | Phase 6 | Pending |
| EXPORT-04 | Phase 4 | Pending |
| PERSIST-01 | Phase 5 | Pending |
| PERSIST-02 | Phase 5 | Pending |
| PERSIST-03 | Phase 5 | Pending |
| VALID-01 | Phase 1 | Pending |
| VALID-02 | Phase 1 | Pending |
| VALID-03 | Phase 1 | Pending |
| VALID-04 | Phase 1 | Pending |
| UX-01 | Phase 2 | Pending |
| UX-02 | Phase 2 | Pending |
| UX-03 | Phase 3 | Pending |
| UX-04 | Phase 2 | Pending |