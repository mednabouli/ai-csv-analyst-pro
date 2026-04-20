# Architecture

**Analysis Date:** 2026-04-20

## Pattern Overview

**Overall:** Full-stack Next.js App Router application with a layered RAG (Retrieval-Augmented Generation) pipeline, multi-tenant SaaS billing, and server-side data access via Server Components and Server Actions.

**Key Characteristics:**
- Server Components handle data fetching and auth checks at the page level; Client Components are used only where interactivity is required
- Server Actions (not API routes) handle mutations: CSV upload, session rename/delete, CSRF token issuance
- The single streaming API route (`/api/chat`) is the only HTTP endpoint that returns a streaming response; all other mutations go through Server Actions
- All cross-cutting concerns (observability, CSRF, billing checks) are composed inline at the call site, not injected via middleware

## Layers

**Edge/Proxy Layer:**
- Purpose: Auth guard, rate limiting, and public-route bypass before any page or API handler runs
- Location: `proxy.ts` (used as Next.js middleware via `config.matcher`)
- Contains: Session check via `auth.api.getSession`, Upstash sliding-window rate limit (60 req/min per IP), public route list
- Depends on: `lib/auth.ts`, `@upstash/ratelimit`, `@upstash/redis`
- Used by: Every request matching `/((?!_next/static|_next/image|favicon.ico).*)`

**Page Layer (Server Components):**
- Purpose: Auth verification, initial database reads, passes typed props to Client Components
- Location: `app/dashboard/page.tsx`, `app/billing/page.tsx`, `app/login/page.tsx`, etc.
- Contains: `auth.api.getSession()` calls, Drizzle queries, redirect logic
- Depends on: `lib/auth.ts`, `lib/db`, `lib/billing.ts`, `lib/stripe.ts`
- Used by: Browser requests routed by Next.js App Router

**Client Shell Layer:**
- Purpose: Interactive UI state, file upload forms, chat message list, sidebar navigation
- Location: `app/dashboard/_components/DashboardShell.tsx` (primary shell), `app/billing/_components/`
- Contains: `useActionState` for upload form, `useChat` from `@ai-sdk/react` for streaming, provider selector, session management
- Depends on: `app/actions/upload.ts`, `app/actions/sessions.ts`, `/api/chat`
- Used by: Server Component pages that render the shell

**Server Actions Layer:**
- Purpose: Validated mutations with auth and CSRF checks; return typed state for `useActionState`
- Location: `app/actions/upload.ts`, `app/actions/sessions.ts`, `app/actions/csrf.ts`
- Contains: `uploadCSVAction`, `getSessionMessagesAction`, `renameSessionAction`, `deleteSessionAction`, `getCsrfTokenAction`
- Depends on: `lib/auth.ts`, `lib/db`, `lib/rag/chunk.ts`, `lib/rag/embed.ts`, `lib/billing.ts`, `lib/csrf.ts`, `lib/observability/telemetry.ts`
- Used by: Client Components via `useActionState`

**API Routes Layer:**
- Purpose: Streaming chat responses and Stripe webhook/billing endpoints
- Location: `app/api/chat/route.ts`, `app/api/billing/checkout/route.ts`, `app/api/billing/portal/route.ts`, `app/api/webhooks/stripe/route.ts`, `app/api/auth/[...all]/route.ts`, `app/api/health/route.ts`, `app/api/cron/reset-usage/route.ts`
- Contains: Streaming AI response via Vercel AI SDK `createDataStreamResponse`, Stripe checkout session creation, webhook event processing
- Depends on: `lib/auth.ts`, `lib/llm.ts`, `lib/rag/strategy.ts`, `lib/billing.ts`, `lib/stripe.ts`, `lib/observability/`
- Used by: Client-side `useChat` hook, Stripe webhooks, Vercel Cron

**Library Layer (`lib/`):**
- Purpose: All business logic, infrastructure clients, and domain services; no React dependencies
- Location: `lib/`
- Contains: Auth config, DB client and schema, RAG pipeline, LLM provider map, billing logic, CSRF utilities, observability wrappers, Redis client, Stripe client
- Depends on: External SDKs (better-auth, drizzle-orm, openai, langfuse, @sentry/nextjs, stripe)
- Used by: Server Actions, API routes, Server Component pages

## Data Flow

**CSV Upload Flow:**

1. User selects a file in `DashboardShell.tsx` (`UploadArea` sub-component)
2. `useActionState` calls `uploadCSVAction` (Server Action in `app/actions/upload.ts`)
3. Action validates CSRF token via `lib/csrf.ts`, checks upload limits via `lib/billing.ts`
4. `lib/rag/chunk.ts` `parseCSV()` parses the bytes with PapaParse; `chunkRows()` splits into 50-row chunks
5. `lib/rag/embed.ts` `generateEmbeddings()` calls OpenAI `text-embedding-3-small` for all chunk texts
6. Drizzle transaction inserts `csv_sessions` row and all `csv_chunks` rows (with embeddings) in `lib/db`
7. `lib/observability/telemetry.ts` `withTrace()` wraps the entire flow in a Langfuse trace
8. `UploadState` result (sessionId, fileName, rowCount, columns, previewRows) is returned to `useActionState`
9. `DashboardShell` sets `activeId` state, displays CSV preview, transitions to chat view

**Chat Query Flow:**

1. User types in the chat textarea; `handleSubmit` from `useChat` sends POST to `/api/chat`
2. `app/api/chat/route.ts` checks session auth, validates billing limits via `lib/billing.ts`
3. `lib/rag/strategy.ts` `buildRAGContext()` decides full-context vs. pgvector path based on provider:
   - **Full-context path** (Gemma models): Fetches all chunks ordered by `chunkIndex`; used when total text < 800k chars
   - **Vector search path** (all others): Embeds the query, runs cosine distance search with threshold 0.6, retrieves top-8 chunks
4. `lib/llm.ts` `PROVIDERS` map selects the model by provider key
5. Vercel AI SDK `streamText` streams tokens back via `createDataStreamResponse`
6. `onFinish` callback persists user and assistant messages to `chat_messages` table, increments usage via `lib/billing.ts`, records generation in Langfuse
7. Client `useChat` hook receives the stream and appends messages to the message list

**Billing Flow:**

1. `app/billing/page.tsx` server component reads subscription and usage from DB via `lib/billing.ts`
2. User clicks upgrade → POST `/api/billing/checkout` → Stripe Checkout Session created
3. Stripe redirects back to `/billing?success=true` after payment
4. Stripe fires `checkout.session.completed` webhook to `/api/webhooks/stripe` → `subscriptions` table updated
5. Subscription status changes (`updated`, `deleted`, `invoice.payment_failed`) handled in same webhook handler

**State Management:**
- Server state (sessions list, messages) fetched fresh on each Server Component render
- Client state managed locally in `DashboardShell.tsx` via `useState`: `activeId`, `provider`, `sidebarSessions`, `sidebarOpen`
- Chat stream state managed by `useChat` from `@ai-sdk/react`
- Upload state managed by `useActionState` with `uploadCSVAction`
- No global state manager (no Redux/Zustand/Jotai)

## Key Abstractions

**`PROVIDERS` map (`lib/llm.ts`):**
- Purpose: Single registry mapping provider key strings to Vercel AI SDK model instances
- Examples: `lib/llm.ts`
- Pattern: `const model = (PROVIDERS[provider as ProviderKey] ?? PROVIDERS.default)` — fallback to default on unknown key. `PROVIDER_META` companion provides UI labels and badge text.

**`buildRAGContext` (`lib/rag/strategy.ts`):**
- Purpose: Selects full-context vs. pgvector retrieval strategy based on provider capability
- Examples: `lib/rag/strategy.ts`
- Pattern: `LARGE_CTX_PROVIDERS` Set gates the strategy; falls back to vector search if text exceeds 800k chars; further falls back to top-K without threshold if no results meet similarity threshold

**Drizzle Schema (`lib/db/schema.ts`):**
- Purpose: Single source of truth for all database tables; includes pgvector HNSW index
- Examples: `lib/db/schema.ts`
- Pattern: All tables use a shared `timestamps` object for `createdAt`/`updatedAt`. Cascade deletes on `sessionId` foreign keys. `planEnum` and `subStatusEnum` enforce value constraints at DB level.

**`withTrace` / `createSpan` (`lib/observability/telemetry.ts`):**
- Purpose: Langfuse observability wrappers; `withTrace` for top-level traced operations, `createSpan` for sub-steps within a trace
- Examples: Used in `app/actions/upload.ts` (wraps entire upload), `app/api/chat/route.ts` (manual trace lifecycle due to streaming)
- Pattern: Streaming routes open the trace manually and close it in `onFinish` to avoid premature flush

**CSRF (`lib/csrf.ts`):**
- Purpose: Double-submit HMAC-signed token pattern for all Server Action mutations
- Examples: Used in `uploadCSVAction`, `renameSessionAction`, `deleteSessionAction`
- Pattern: `issueCsrfToken()` sets cookie; `validateCsrf(formData)` verifies form field matches cookie and HMAC signature is valid

## Entry Points

**Root Layout:**
- Location: `app/layout.tsx`
- Triggers: All page renders
- Responsibilities: HTML shell, `<Providers>` wrapper (ToastProvider)

**Proxy / Middleware:**
- Location: `proxy.ts`
- Triggers: Every incoming request (matched by `config.matcher`)
- Responsibilities: Rate limiting, auth guard, public route bypass

**Landing Page:**
- Location: `app/page.tsx`
- Triggers: `GET /`
- Responsibilities: Marketing landing with links to `/dashboard` and `/login`

**Dashboard Page:**
- Location: `app/dashboard/page.tsx`
- Triggers: `GET /dashboard`
- Responsibilities: Auth check, initial sessions query, renders `DashboardShell` with typed props

**Chat API:**
- Location: `app/api/chat/route.ts`
- Triggers: POST from `useChat` hook on the client
- Responsibilities: Auth, billing check, RAG context retrieval, streaming LLM response, message persistence, usage increment, Langfuse trace

**Auth Catch-All:**
- Location: `app/api/auth/[...all]/route.ts`
- Triggers: All `GET`/`POST` to `/api/auth/*`
- Responsibilities: Delegated entirely to `better-auth` handler

## Error Handling

**Strategy:** Errors surface at the layer boundary closest to the user; infrastructure errors are captured in Sentry and re-thrown or converted to typed error states.

**Patterns:**
- Server Actions return `{ error: string }` states consumed by `useActionState` — never throw to the client
- API route handlers return typed JSON error responses with appropriate HTTP status codes (401, 402, 400, 500)
- `withTrace` in `lib/observability/telemetry.ts` catches errors, logs to Langfuse, captures in Sentry, then re-throws
- Stream errors in `/api/chat` handled by `onError` callback on `createDataStreamResponse` — closes the Langfuse trace before returning error string
- Client errors from `useChat` shown via `useToast` hook

## Cross-Cutting Concerns

**Logging/Observability:** Langfuse traces for all AI operations (`lib/observability/telemetry.ts`); Sentry error capture via `@sentry/nextjs` (`sentry.client.config.ts`, `sentry.server.config.ts`, `instrumentation.ts`); OpenTelemetry instrumentation client loaded via `instrumentation-client.ts`

**Validation:** CSRF double-submit cookie pattern on all mutating Server Actions (`lib/csrf.ts`); billing limit checks before any resource-intensive operation (`lib/billing.ts`); file size checked before `arrayBuffer()` read to avoid OOM

**Authentication:** `better-auth` handles session management, email/password, optional OAuth (Google, GitHub), email verification (`lib/auth.ts`); server-side check via `auth.api.getSession({ headers })` in every page and API handler; client-side via `authClient` from `lib/auth-client.ts`

---

*Architecture analysis: 2026-04-20*
