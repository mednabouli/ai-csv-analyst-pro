# Codebase Structure

**Analysis Date:** 2026-04-20

## Directory Layout

```
ai-csv-analyst-pro/
├── app/                        # Next.js App Router — all pages and API routes
│   ├── actions/                # Server Actions (mutations)
│   │   ├── __tests__/          # Unit tests for actions
│   │   ├── csrf.ts             # getCsrfTokenAction — issues CSRF tokens
│   │   ├── sessions.ts         # Session CRUD actions (list, rename, delete, messages)
│   │   └── upload.ts           # uploadCSVAction — parse, embed, persist
│   ├── api/                    # API Route handlers
│   │   ├── auth/[...all]/      # better-auth catch-all handler
│   │   ├── billing/
│   │   │   ├── checkout/       # POST — Stripe Checkout Session creation
│   │   │   └── portal/         # POST — Stripe Customer Portal redirect
│   │   ├── chat/               # POST — streaming AI response (core endpoint)
│   │   ├── cron/reset-usage/   # GET — Vercel Cron monthly usage reset hook
│   │   ├── health/             # GET — DB + Redis health check
│   │   └── webhooks/stripe/    # POST — Stripe event handler
│   ├── billing/                # /billing page (Server Component)
│   │   └── _components/        # PricingCards.tsx, UsageMeter.tsx
│   ├── dashboard/              # /dashboard page (Server Component)
│   │   └── _components/        # All dashboard UI components
│   ├── forgot-password/        # /forgot-password page
│   ├── login/                  # /login page
│   ├── privacy/                # /privacy static page
│   ├── reset-password/         # /reset-password page
│   ├── signup/                 # /signup page
│   ├── terms/                  # /terms static page
│   ├── verify-email/           # /verify-email page
│   ├── error.tsx               # App-level error boundary
│   ├── globals.css             # Global styles (Tailwind CSS v4)
│   ├── layout.tsx              # Root layout with Providers
│   ├── loading.tsx             # Root loading skeleton
│   ├── not-found.tsx           # 404 page
│   ├── page.tsx                # Landing page (/)
│   └── providers.tsx           # Client Providers wrapper (ToastProvider)
├── components/
│   └── ui/                     # Shared UI primitives (shadcn/ui style)
│       ├── theme-toggle.tsx    # Dark/light mode toggle
│       └── toaster.tsx         # Toast notification system
├── docs/                       # Internal documentation
├── drizzle/                    # Drizzle Kit migration artifacts
│   ├── meta/                   # Drizzle snapshot metadata
│   └── migrations/             # SQL migration files
├── e2e/                        # Playwright end-to-end tests
│   ├── fixtures/               # Test fixtures (e.g. test CSV files)
│   └── helpers/                # Page object helpers
├── hooks/                      # React hooks (client-only)
│   ├── use-csrf.ts             # Fetches and caches CSRF token; provides appendCsrf()
│   └── use-toast.ts            # Toast state management hook
├── lib/                        # All server-side business logic and infrastructure
│   ├── __tests__/              # Unit tests for lib modules
│   │   ├── observability/      # Tests for telemetry.ts
│   │   └── rag/                # Tests for chunk.ts, strategy.ts
│   ├── db/
│   │   ├── index.ts            # Drizzle client (Neon serverless)
│   │   └── schema.ts           # All table definitions + pgvector index
│   ├── observability/
│   │   ├── langfuse.ts         # Langfuse client singleton
│   │   └── telemetry.ts        # withTrace, createSpan, recordGeneration helpers
│   ├── rag/
│   │   ├── __tests__/          # Tests for embed.ts
│   │   ├── chunk.ts            # parseCSV, chunkRows (PapaParse-based)
│   │   ├── embed.ts            # generateEmbedding, generateEmbeddings (OpenAI)
│   │   └── strategy.ts         # buildRAGContext (full-ctx vs. vector search)
│   ├── auth-client.ts          # better-auth client for Client Components
│   ├── auth.ts                 # better-auth server config (Drizzle adapter)
│   ├── billing.ts              # checkUploadLimit, checkQueryLimit, incrementUsage
│   ├── csrf.ts                 # issueCsrfToken, validateCsrf (HMAC double-submit)
│   ├── env.ts                  # Typed env var validation; isDev flag
│   ├── llm.ts                  # PROVIDERS map, PROVIDER_META (all AI models)
│   ├── redis.ts                # Upstash Redis client singleton
│   └── stripe.ts               # Stripe client, PLANS config
├── scripts/                    # One-off utility scripts (e.g. seed plans)
├── .github/workflows/          # CI workflow definitions
├── .planning/codebase/         # GSD architecture/planning documents
├── drizzle.config.ts           # Drizzle Kit config (migrations)
├── instrumentation.ts          # OpenTelemetry server instrumentation
├── instrumentation-client.ts   # OpenTelemetry client instrumentation
├── next.config.ts              # Next.js config (React Compiler, security headers)
├── playwright.config.ts        # Playwright E2E test config
├── proxy.ts                    # Next.js middleware (auth guard + rate limiting)
├── sentry.client.config.ts     # Sentry browser SDK init
├── sentry.server.config.ts     # Sentry server SDK init
├── tailwind.config.ts          # Tailwind CSS v4 config
├── tsconfig.json               # TypeScript strict config; @/* alias maps to ./
└── vitest.config.ts            # Vitest unit test config
```

## Directory Purposes

**`app/actions/`:**
- Purpose: All Server Actions (`"use server"` directive). Mutations only — no data fetching that isn't part of a mutation response.
- Contains: `upload.ts` (CSV ingestion), `sessions.ts` (session CRUD + message loading), `csrf.ts` (token issuance)
- Key files: `app/actions/upload.ts`, `app/actions/sessions.ts`

**`app/api/`:**
- Purpose: HTTP API routes. Use only for streaming responses or external webhooks that cannot use Server Actions.
- Contains: Chat streaming endpoint, Stripe billing endpoints, auth catch-all, health check, cron
- Key files: `app/api/chat/route.ts`, `app/api/webhooks/stripe/route.ts`

**`app/dashboard/_components/`:**
- Purpose: All UI components private to the dashboard route. The `_` prefix marks them as non-routable co-located components.
- Contains: `DashboardShell.tsx` (main Client Component with full chat+upload UI), `SessionSidebar.tsx`, `CSVPreview.tsx`, `MarkdownMessage.tsx`, `ExportButton.tsx`, `UploadZone.tsx`, `ChatPanel.tsx` (deprecated stub)
- Key files: `app/dashboard/_components/DashboardShell.tsx`

**`components/ui/`:**
- Purpose: Shared, reusable UI primitives used across multiple routes.
- Contains: `toaster.tsx`, `theme-toggle.tsx`
- Key files: `components/ui/toaster.tsx`

**`lib/`:**
- Purpose: All framework-agnostic business logic and infrastructure. No React imports. Safe to use in Server Components, Server Actions, and API routes.
- Contains: DB client/schema, auth config, RAG pipeline, LLM registry, billing, CSRF, observability, Stripe, Redis
- Key files: `lib/db/schema.ts`, `lib/llm.ts`, `lib/rag/strategy.ts`, `lib/billing.ts`

**`lib/rag/`:**
- Purpose: The full CSV ingestion and retrieval pipeline.
- Contains: `chunk.ts` (parse + chunk), `embed.ts` (OpenAI embeddings), `strategy.ts` (context retrieval decision)
- Key files: `lib/rag/strategy.ts`

**`lib/observability/`:**
- Purpose: Langfuse tracing and Sentry error capture wrappers.
- Contains: `langfuse.ts` (client singleton), `telemetry.ts` (withTrace, createSpan, recordGeneration)
- Key files: `lib/observability/telemetry.ts`

**`hooks/`:**
- Purpose: React custom hooks for client-side use only.
- Contains: `use-csrf.ts` (fetches token via Server Action, provides `appendCsrf`), `use-toast.ts`
- Key files: `hooks/use-csrf.ts`

**`drizzle/migrations/`:**
- Purpose: Generated SQL migration files managed by Drizzle Kit. Do not edit manually.
- Generated: Yes
- Committed: Yes

**`e2e/`:**
- Purpose: Playwright end-to-end tests covering critical user flows.
- Generated: No
- Committed: Yes

## Key File Locations

**Entry Points:**
- `proxy.ts`: Middleware — first handler for every request
- `app/layout.tsx`: Root HTML layout
- `app/page.tsx`: Landing page (`/`)
- `app/dashboard/page.tsx`: Dashboard (auth-protected main page)
- `app/api/chat/route.ts`: AI streaming endpoint

**Configuration:**
- `lib/env.ts`: Typed environment variable access and `isDev` flag
- `lib/llm.ts`: AI provider registry — edit here to add/remove models
- `lib/db/schema.ts`: Database schema — single source of truth for all tables
- `drizzle.config.ts`: Migration config pointing at `drizzle/migrations/`
- `next.config.ts`: Next.js build and security header config
- `tsconfig.json`: TypeScript config with `@/*` path alias

**Core Logic:**
- `lib/rag/strategy.ts`: RAG context retrieval (full-ctx vs. vector)
- `lib/rag/chunk.ts`: CSV parsing and chunking
- `lib/rag/embed.ts`: Embedding generation via OpenAI
- `lib/billing.ts`: Upload/query limit enforcement and usage tracking
- `lib/auth.ts`: better-auth server configuration
- `lib/csrf.ts`: CSRF token issuance and validation

**Testing:**
- `lib/__tests__/`: Unit tests for all `lib/` modules
- `lib/rag/__tests__/`: RAG-specific unit tests
- `app/actions/__tests__/`: Server Action unit tests
- `app/api/auth/__tests__/`: Auth route tests
- `e2e/`: Playwright E2E tests

## Naming Conventions

**Files:**
- Route files follow Next.js convention: `page.tsx`, `route.ts`, `layout.tsx`, `loading.tsx`, `error.tsx`
- Server Actions: `kebab-case.ts` (e.g. `upload.ts`, `sessions.ts`, `csrf.ts`)
- Library modules: `kebab-case.ts` (e.g. `auth-client.ts`, `billing.ts`)
- React components: `PascalCase.tsx` (e.g. `DashboardShell.tsx`, `PricingCards.tsx`)
- Hooks: `use-kebab-case.ts` (e.g. `use-csrf.ts`, `use-toast.ts`)
- Test files: same name as source with `.test.ts` suffix, placed in `__tests__/` directories

**Directories:**
- `_components/`: Private components co-located with a route (non-routable, Next.js convention)
- `__tests__/`: Test files co-located near the code under test
- `lib/` subdirectories: domain-grouped (`db/`, `rag/`, `observability/`)

## Where to Add New Code

**New API Feature (e.g. export endpoint):**
- Route handler: `app/api/{feature}/route.ts`
- Business logic: `lib/{feature}.ts`
- Tests: `lib/__tests__/{feature}.test.ts`

**New Page:**
- Server Component page: `app/{route}/page.tsx`
- Page-specific components: `app/{route}/_components/{ComponentName}.tsx`
- Loading state: `app/{route}/loading.tsx`

**New Server Action (mutation):**
- Implementation: `app/actions/{domain}.ts` (add `"use server"` directive)
- Tests: `app/actions/__tests__/{domain}.test.ts`

**New Shared UI Component:**
- Implementation: `components/ui/{component-name}.tsx`

**New Client Hook:**
- Implementation: `hooks/use-{feature}.ts`

**New AI Model Provider:**
- Add to `PROVIDERS` and `PROVIDER_META` in `lib/llm.ts`
- If it requires large-context handling, add the key to `LARGE_CTX_PROVIDERS` in `lib/rag/strategy.ts`

**New Database Table:**
- Add table to `lib/db/schema.ts`
- Run `pnpm drizzle-kit generate` to create migration
- Run `pnpm drizzle-kit migrate` to apply

**New Library Module:**
- Implementation: `lib/{module}.ts`
- Tests: `lib/__tests__/{module}.test.ts`

## Special Directories

**`.planning/codebase/`:**
- Purpose: GSD architecture and planning documents for agentic workflows
- Generated: Partially (by GSD mapper agents)
- Committed: Yes

**`.next/`:**
- Purpose: Next.js build output
- Generated: Yes
- Committed: No

**`drizzle/migrations/`:**
- Purpose: Drizzle Kit generated SQL migrations
- Generated: Yes (via `pnpm drizzle-kit generate`)
- Committed: Yes

**`node_modules/`:**
- Purpose: pnpm dependencies
- Generated: Yes
- Committed: No

---

*Structure analysis: 2026-04-20*
