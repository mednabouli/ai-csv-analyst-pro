# Technology Stack

**Analysis Date:** 2026-04-20

## Languages

**Primary:**
- TypeScript 5.8 - All application code (`app/`, `lib/`, `components/`, `hooks/`)

**Secondary:**
- JavaScript - Config files only (`eslint.config.js`, `postcss.config.js`)

## Runtime

**Environment:**
- Node.js (target: ES2022, bundler module resolution)
- Edge-compatible where needed (middleware in `proxy.ts`)

**Package Manager:**
- pnpm (lockfile: `pnpm-lock.yaml` - present)
- Dev command: `pnpm dev --turbopack`

## Frameworks

**Core:**
- Next.js ^16.0.0 - App Router, Server Components, React Compiler enabled (`next.config.ts`)
- React ^19.0.0 - UI rendering with concurrent features
- Tailwind CSS ^4.2.2 - Utility-first styling with CSS variable tokens (`tailwind.config.ts`)

**UI Components:**
- shadcn/ui pattern - Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-scroll-area`, `@radix-ui/react-select`, `@radix-ui/react-slot`, `@radix-ui/react-toast`) with CVA + clsx + tailwind-merge in `components/ui/`

**Testing:**
- Vitest ^3.1.0 - Unit and integration tests (`vitest.config.ts`)
- Playwright ^1.59.1 - E2E tests (`playwright.config.ts`)
- `@vitest/coverage-v8` ^3.1.0 - Coverage with v8 provider

**Build/Dev:**
- Turbopack - Dev bundler (enabled via `--turbopack` flag)
- `drizzle-kit` ^0.30.0 - Database schema migrations (`drizzle.config.ts`)
- `tsx` - Script runner for `scripts/` directory
- ESLint ^9.0.0 with `eslint-config-next` ^16.0.0
- Prettier ^3.5.0 with `prettier-plugin-tailwindcss` ^0.6.0

## Key Dependencies

**Critical:**
- `ai` ^4.3.0 (Vercel AI SDK) - Core streaming, `streamText`, `createDataStreamResponse`, `embed`, `embedMany`
- `@ai-sdk/react` ^1.2.0 - Client-side `useChat` hook
- `drizzle-orm` ^0.41.0 - Type-safe ORM with pgvector support (`vector`, HNSW index)
- `better-auth` ^1.2.0 - Authentication with Drizzle adapter, Next.js cookies plugin
- `stripe` ^17.0.0 - Billing, subscriptions, webhook handling (API version `2025-02-24.acacia`)
- `zod` ^3.24.0 - Runtime env validation in `lib/env.ts`, schema validation throughout
- `papaparse` ^5.4.0 - CSV parsing client/server side

**AI Provider SDKs:**
- `@ai-sdk/openai` ^1.3.0 - GPT-4o + `text-embedding-3-small` for RAG embeddings
- `@ai-sdk/anthropic` ^1.2.0 - Claude Sonnet 4.5
- `@ai-sdk/google` ^1.2.0 - Gemini 2.5 Flash, Gemma 4 variants
- `@ai-sdk/gateway` ^1.0.0 - Vercel AI Gateway (free Gemma 4 models)
- `ollama-ai-provider` ^1.0.0 - Local Ollama models

**Infrastructure:**
- `@neondatabase/serverless` ^0.10.0 - Neon Postgres HTTP driver
- `@upstash/redis` ^1.34.0 - Redis client via REST API
- `@upstash/ratelimit` ^2.0.0 - Sliding window rate limiting
- `langfuse` ^3.0.0 - LLM observability and tracing
- `@sentry/nextjs` ^9.15.0 - Error tracking and performance monitoring
- `resend` ^4.0.0 - Transactional email (lazy-loaded; falls back to console in dev)

**UI Utilities:**
- `lucide-react` ^0.503.0 - Icon library
- `react-markdown` ^9.0.0 with `remark-gfm` ^4.0.0 and `rehype-highlight` ^7.0.0 - Markdown rendering
- `highlight.js` ^11.10.0 - Code syntax highlighting
- `uuid` ^11.0.0 - UUID generation for session IDs

## Configuration

**TypeScript:**
- Strict mode enabled (`tsconfig.json`)
- Path alias: `@/*` maps to project root
- Target: ES2022, module: esnext, moduleResolution: bundler
- React compiler plugin active

**Environment:**
- Validated at startup via Zod schema in `lib/env.ts`
- Secrets in `.env.local` (never committed)
- `SKIP_ENV_VALIDATION=true` bypasses validation in CI/preview builds
- Required: `BETTER_AUTH_SECRET`, `DATABASE_URL`
- Optional (gracefully degraded): `UPSTASH_*`, `RESEND_API_KEY`, `STRIPE_*`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_*`, `LANGFUSE_*`, `SENTRY_DSN`

**Build:**
- `next.config.ts` - React Compiler on, `cacheComponents: true`, source maps off in prod, compression on
- `vercel.json` - Deployment config, function memory/duration limits, security headers, cron schedule

## Platform Requirements

**Development:**
- Node.js with pnpm
- `.env.local` with at minimum `BETTER_AUTH_SECRET` and `DATABASE_URL`
- Optional: Redis, Stripe, AI provider keys, Resend

**Production:**
- Vercel (region: `iad1`)
- Function limits: chat route 60s/1024MB, upload route 30s/1024MB
- Cron: `0 0 1 * *` monthly usage reset at `/api/cron/reset-usage`

---

*Stack analysis: 2026-04-20*
