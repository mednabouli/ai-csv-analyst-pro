# Roadmap

## Phase 0 — Foundation
- Finalize stack and repo structure.
- Scaffold Next.js 16 app with React 19, Tailwind CSS v4, shadcn/ui.
- Add better-auth, Drizzle, Neon, Upstash, and Vercel AI SDK.
- Set up env handling, linting, formatting, and type safety.

## Phase 1 — Authentication and access control
- Implement login, signup, logout, and session handling.
- Add proxy.ts guards for protected routes.
- Support email/password plus OAuth.
- Add org or workspace support if needed for multi-tenancy.

## Phase 2 — CSV ingestion
- Build upload flow with validation and size limits.
- Store raw files in object storage.
- Parse CSVs and generate schema summaries.
- Persist sessions and metadata in Postgres.

## Phase 3 — Analytics engine
- Create chunking strategy for small and large CSVs.
- Add embeddings and pgvector retrieval.
- Implement tool-based analysis and structured responses.
- Add fallback logic for full-context vs RAG.

## Phase 4 — Chat UX
- Build streaming chat interface.
- Add optimistic UI and loading states.
- Add model selector for provider switching.
- Add analysis history and saved prompts.

## Phase 5 — Billing and usage
- Add Stripe subscriptions.
- Track token usage and query counts.
- Enforce plan limits in proxy and server routes.
- Add billing dashboard and upgrade flow.

## Phase 6 — Observability and quality
- Add logging, error tracking, and AI traces.
- Add evaluation prompts and regression tests.
- Measure latency, token usage, and ingestion performance.
- Add audit logs for user and admin actions.

## Phase 7 — Product hardening
- Add export to CSV, PDF, and shareable reports.
- Add team spaces, roles, and permissions.
- Improve query performance and caching.
- Add production deployment, backups, and disaster recovery.

## Phase 8 — Scale and differentiation
- Add chart generation and natural-language dashboards.
- Add scheduled report generation.
- Add support for more data sources beyond CSV.
- Add private/local model options for sensitive data.
