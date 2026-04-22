# Plan

## Objective

Build a production-ready AI data analytics SaaS where users upload CSV files, ask questions, and receive fast, reliable answers with a modern Next.js 16 frontend.

## Target architecture

- Next.js 16 App Router frontend.
- React 19 server-first component model.
- better-auth for authentication.
- Drizzle ORM + Neon Postgres for persistence.
- Upstash Redis for rate limiting and caching.
- Vercel AI SDK for model abstraction and streaming.
- pgvector for retrieval over large datasets.
- shadcn/ui + Tailwind CSS v4 for UI.

## Build order

1. Scaffold the repo and configure tooling.
2. Add auth and protected routes.
3. Implement CSV upload and storage.
4. Build ingestion, chunking, and embeddings.
5. Add chat endpoint and streaming UI.
6. Add model provider switching.
7. Add billing, usage tracking, and rate limits.
8. Add observability, tests, and deployment.

## Key decisions

- Use proxy.ts instead of legacy middleware patterns.
- Use React 19 new hooks in forms and optimistic UI.
- Use RAG for large files and direct context for smaller ones.
- Keep provider support modular so new AI vendors can be added quickly.
- Prefer production patterns over tutorial shortcuts.

## Risks

- Large CSVs can exceed context limits if not chunked.
- LLM cost can grow quickly without usage controls.
- Auth and multi-tenancy must be correct from day one.
- File processing and embeddings need queueing for scale.

## Success criteria

- Upload works reliably.
- Users can sign in and access isolated data.
- Answers are fast, accurate, and traceable.
- Billing and limits work as intended.
- The stack remains easy to extend with new AI providers.
