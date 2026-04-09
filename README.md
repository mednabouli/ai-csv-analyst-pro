# CSV Analyst Pro

A production-ready full-stack AI data analytics SaaS built with Next.js 16, React 19, better-auth, Drizzle ORM, Neon, Upstash, shadcn/ui, Tailwind CSS v4, and the Vercel AI SDK.

## What it does
- Upload CSV files.
- Ask natural-language questions about the data.
- Get streamed answers with model switching.
- Use RAG for large datasets.
- Track sessions, usage, and billing.

## Stack
- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui
- better-auth
- Drizzle ORM
- Neon Postgres
- pgvector
- Upstash Redis
- Vercel AI SDK

## Core features
- Secure auth and protected routes.
- CSV upload and parsing.
- Schema summarization and chunking.
- Embedding generation and retrieval.
- Streaming AI chat.
- Provider switching.
- Usage tracking and billing-ready architecture.

## Repo structure
```text
app/
lib/
components/
drizzle/
```

## Environment variables
```bash
DATABASE_URL=
NEXT_PUBLIC_APP_URL=
BETTER_AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Getting started
1. Install dependencies.
2. Set up environment variables.
3. Run migrations.
4. Start the dev server.
5. Add your first CSV upload.

## Development principles
- Use server components by default.
- Use client components only for interactive UI.
- Keep business logic in small modules.
- Support multiple AI providers through one abstraction.
- Keep the product production-first, not demo-first.

## Roadmap
See `roadmap.md` for the build phases.
