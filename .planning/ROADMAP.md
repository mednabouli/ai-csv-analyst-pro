# Roadmap

## Phases

- [ ] **Phase 1: Chart Specification Foundation** - Establish the chart specification contract with validation and type definitions
- [ ] **Phase 2: Chart Rendering Component** - Build a reusable ChartBlock component that renders all four chart types
- [ ] **Phase 3: UI Integration** - Wire up chart rendering into the chat interface so charts appear in message threads
- [ ] **Phase 4: Chart Enhancements** - Add user-friendly features that improve the charting experience
- [ ] **Phase 5: Persistence** - Ensure charts survive page reloads and session restores
- [ ] **Phase 6: Export Functionality** - Allow users to export charts and answers for sharing and documentation

## Phase Details

### Phase 1: Chart Specification Foundation
**Goal**: Establish the chart specification contract with validation and type definitions
**Depends on**: Nothing (first phase)
**Requirements**: CHART-01, CHART-02, VALID-01, VALID-02, VALID-03, VALID-04
**Success Criteria** (what must be TRUE):
  1. The `/api/chat` route accepts and validates `chart_spec` tool calls with proper column validation
  2. Invalid column names are rejected before reaching the AI model
  3. Chart data is capped at 200 rows to prevent context window issues
  4. System prompt includes explicit chart type selection rules
**Plans**: TBD

### Phase 2: Chart Rendering Component
**Goal**: Build a reusable ChartBlock component that renders all four chart types
**Depends on**: Phase 1
**Requirements**: CHART-03, CHART-BAR, CHART-LINE, CHART-PIE, CHART-SCATTER, UX-01, UX-02, UX-04, CHART-07
**Success Criteria** (what must be TRUE):
  1. ChartBlock correctly renders bar charts from valid specs
  2. ChartBlock correctly renders line charts from valid specs
  3. ChartBlock correctly renders pie charts from valid specs
  4. ChartBlock correctly renders scatter charts from valid specs
  5. ChartBlock shows skeleton loader during generation and graceful error messages for invalid specs
**Plans**: TBD

### Phase 3: UI Integration
**Goal**: Wire up chart rendering into the chat interface so charts appear in message threads
**Depends on**: Phase 2
**Requirements**: CHART-04, UX-03
**Success Criteria** (what must be TRUE):
  1. Chart specifications from the AI appear as interactive charts in the chat thread
  2. Text messages and chart messages coexist properly in the same conversation
  3. Pre-chart history messages continue to display correctly (backward compatibility)
  4. MessageList component extraction reduces unnecessary re-renders
**Plans**: TBD

### Phase 4: Chart Enhancements
**Goal**: Add user-friendly features that improve the charting experience
**Depends on**: Phase 3
**Requirements**: CHART-05, CHART-06, EXPORT-04
**Success Criteria** (what must be TRUE):
  1. Users can switch between chart types (bar/line/pie) for the same data without new AI calls
  2. Charts display AI-generated insight captions below the visualization
  3. Users can copy chart images and text answers to clipboard with one click
**Plans**: TBD
**UI hint**: yes

### Phase 5: Persistence
**Goal**: Ensure charts survive page reloads and session restores
**Depends on**: Phase 3
**Requirements**: PERSIST-01, PERSIST-02, PERSIST-03
**Success Criteria** (what must be TRUE):
  1. Charts appear correctly when revisiting a session after page reload
  2. Chart data is properly serialized and deserialized from the database
  3. Both text and chart components restore correctly from history
**Plans**: TBD

### Phase 6: Export Functionality
**Goal**: Allow users to export charts and answers for sharing and documentation
**Depends on**: Phase 2
**Requirements**: EXPORT-01, EXPORT-02, EXPORT-03
**Success Criteria** (what must be TRUE):
  1. Users can download chart + answer as PNG images
  2. Users can download AI answer text as Markdown/TXT files
  3. Exported PNGs preserve Tailwind v4 styling and colors correctly
  4. Export functionality works reliably across different chart types
**Plans**: TBD
**UI hint**: yes

## Progress Table

| Phase | Plans Complete | Status | Completed | Notes |
|-------|----------------|--------|-----------|-------|
| 1. Chart Specification Foundation | 0/4 | Not started | - |  |
| 2. Chart Rendering Component | 0/9 | Not started | - |  |
| 3. UI Integration | 0/2 | Not started | - |  |
| 4. Chart Enhancements | 3/3 | Complete | .planning/phases/04-chart-enhancements/04-01-SUMMARY.md, .planning/phases/04-chart-enhancements/04-UAT.md, CHANGELOG.md | Phase 4 fully complete and documented |
| 5. Persistence | 0/3 | Not started | - | NEXT: Plan and implement chart/session persistence |
| 6. Export Functionality | 0/4 | Not started | - | NEXT: Plan and implement export features |