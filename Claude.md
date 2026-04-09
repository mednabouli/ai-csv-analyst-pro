# Claude.md

## Project
CSV Analyst Pro is a full-stack AI data analytics product built with Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, better-auth, Drizzle ORM, Neon, Upstash, and the Vercel AI SDK.

## Product goal
Let users upload CSV files, ask questions in natural language, and get fast, trustworthy answers with citations, summaries, charts, and exportable insights.

## Tech stack
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS v4, shadcn/ui.
- Auth: better-auth.
- Database: Postgres on Neon with Drizzle ORM.
- Cache / rate limiting: Upstash Redis.
- AI: Vercel AI SDK with multi-provider support.
- File processing: CSV parsing, chunking, embeddings, pgvector.

## Engineering rules
- Use App Router only.
- Use Server Components by default.
- Use Client Components only when interactivity is required.
- Use proxy.ts for auth and edge protection in Next.js 16.
- Prefer useActionState, useOptimistic, useFormStatus, and use() where appropriate.
- Keep UI consistent with shadcn/ui components and Tailwind utility classes.
- Keep secrets in .env.local; never hardcode keys.
- Prefer typed, small, composable modules.

## AI behavior rules
- Support multiple model providers behind a single abstraction.
- Default to the best cost-quality provider for production.
- Allow local / self-hosted providers when available.
- Use RAG for large datasets and full-context prompting only when context size allows.
- Always return concise, data-backed answers.

## Code style
- TypeScript strict mode.
- Use named exports unless a default export is clearer for Next.js pages.
- Keep functions small and testable.
- Prefer explicit types for public interfaces.
- Avoid unnecessary abstractions.

## Product priorities
- Secure multi-tenant auth.
- Fast CSV ingestion.
- Trustworthy analytics responses.
- Low latency streaming UX.
- Billing and usage tracking.
- Clean dashboard UX.

## Notes for Claude
- When generating code, follow the latest project structure and do not reintroduce deprecated patterns.
- If a dependency or API is unclear, choose the latest stable pattern and mention assumptions explicitly.
- Keep files production-oriented, not tutorial-style.
