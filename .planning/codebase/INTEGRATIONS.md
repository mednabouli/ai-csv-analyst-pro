# External Integrations

**Analysis Date:** 2026-04-20

## APIs & External Services

**AI Inference:**
- Vercel AI Gateway - Free Gemma 4 26B/31B models via `@ai-sdk/gateway`
  - SDK/Client: `@ai-sdk/gateway` → `createGateway()` in `lib/llm.ts`
  - Auth: `VERCEL_AI_GATEWAY_*` (handled by Vercel environment automatically)
- OpenAI - GPT-4o (chat) + `text-embedding-3-small` (RAG embeddings)
  - SDK/Client: `@ai-sdk/openai` in `lib/llm.ts` and `lib/rag/embed.ts`
  - Auth: `OPENAI_API_KEY`
- Anthropic - Claude Sonnet 4.5
  - SDK/Client: `@ai-sdk/anthropic` in `lib/llm.ts`
  - Auth: `ANTHROPIC_API_KEY`
- Google AI Studio - Gemini 2.5 Flash, Gemma 4 variants
  - SDK/Client: `@ai-sdk/google` in `lib/llm.ts`
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY`
- Ollama - Local self-hosted Gemma 4 models (2B, 4B, 26B)
  - SDK/Client: `ollama-ai-provider` → `createOllama()` in `lib/llm.ts`
  - Auth: None (local)
  - Config: `OLLAMA_BASE_URL` (default: `http://localhost:11434/api`)

**Email:**
- Resend - Transactional email (password reset, email verification)
  - SDK/Client: `resend` package, lazy-loaded in `lib/auth.ts`
  - Auth: `RESEND_API_KEY`
  - Config: `EMAIL_DOMAIN` (from address domain)
  - Fallback: Console logging in dev when `RESEND_API_KEY` absent

**Observability:**
- Sentry - Error tracking and performance monitoring
  - SDK/Client: `@sentry/nextjs` in `sentry.server.config.ts`, `sentry.client.config.ts`, `instrumentation.ts`, `instrumentation-client.ts`
  - Auth: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`
  - Config: `SENTRY_ENVIRONMENT`; 10% trace sampling in production
- Langfuse - LLM request tracing and generation logging
  - SDK/Client: `langfuse` package via `lib/observability/langfuse.ts`, `lib/observability/telemetry.ts`
  - Auth: `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`
  - Config: `LANGFUSE_HOST` (default: `https://cloud.langfuse.com`), `LANGFUSE_ENVIRONMENT`
  - Usage: Manual trace/span/generation recording in `app/api/chat/route.ts`

## Data Storage

**Databases:**
- Neon (serverless Postgres)
  - Connection: `DATABASE_URL`
  - Client: `@neondatabase/serverless` neon HTTP driver + `drizzle-orm` ORM
  - Entry point: `lib/db/index.ts`
  - Schema file: `lib/db/schema.ts`
  - Migrations: `drizzle/` directory, managed by `drizzle-kit`
  - pgvector extension used for 1536-dimension embeddings with HNSW cosine index on `csv_chunks.embedding`

**File Storage:**
- Local filesystem only - CSV files processed in-memory, not persisted to object storage

**Caching / Rate Limiting:**
- Upstash Redis (serverless Redis via REST)
  - Connection: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
  - Client: `@upstash/redis` → `Redis.fromEnv()` in `lib/redis.ts`
  - Rate limiter: `@upstash/ratelimit` sliding window, 20 req/60s in `lib/redis.ts`, 60 req/1min in `proxy.ts`
  - Rate limit key prefix: `csv-analyst:rl`
  - Graceful degradation: rate limiting skipped entirely when env vars absent

## Authentication & Identity

**Auth Provider:**
- better-auth ^1.2.0 (self-hosted, runs on own Postgres via Drizzle adapter)
  - Implementation: `lib/auth.ts` (server), `lib/auth-client.ts` (client)
  - Database adapter: `drizzleAdapter` with `provider: "pg"`, uses `DATABASE_URL`
  - Session: 30-day expiry, refreshed daily, 5-minute cookie cache
  - Email + password: enabled, min 8 chars, email verification required in production
  - OAuth providers (optional, registered only when env vars present):
    - Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
    - GitHub OAuth: `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`
  - Account linking: enabled, trusted providers: google, github
  - Auth routes: `/api/auth/[...all]/route.ts`
  - Edge protection: `proxy.ts` (Next.js middleware) guards all non-public routes

## Billing

**Payment Processor:**
- Stripe - Subscriptions and checkout
  - SDK/Client: `stripe` ^17.0.0, lazy-initialized in `lib/stripe.ts` via `getStripe()`
  - Auth: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
  - Config: `STRIPE_PRICE_STARTER`, `STRIPE_PRICE_PRO` (Stripe Price IDs)
  - Plans: free (no Stripe), starter ($9/mo), pro ($29/mo) defined in `lib/stripe.ts`
  - Checkout: `app/api/billing/checkout/route.ts`
  - Portal: `app/api/billing/portal/route.ts`
  - Webhook endpoint: `app/api/webhooks/stripe/route.ts` at `/api/webhooks/stripe`
  - Setup script: `scripts/setup-stripe.ts`

## Monitoring & Observability

**Error Tracking:**
- Sentry (`@sentry/nextjs` ^9.15.0)
  - Server config: `sentry.server.config.ts`
  - Client config: `sentry.client.config.ts`
  - Health check errors suppressed (`beforeSend` filter in server config)
  - PII disabled (`sendDefaultPii: false`)

**LLM Tracing:**
- Langfuse
  - Traces created per chat request with `userId`, `sessionId`, span-level RAG and generation data
  - Flushed after stream completion inside `onFinish` callback

**Logs:**
- Console logging (Next.js built-in); fetch logs enabled in development (`next.config.ts`)

## CI/CD & Deployment

**Hosting:**
- Vercel (`vercel.json`; framework: nextjs, region: `iad1`)
  - Build: `pnpm run build`
  - Install: `pnpm install`
  - Telemetry disabled: `NEXT_TELEMETRY_DISABLED=1`

**CI Pipeline:**
- Not detected (no `.github/workflows/` or CI config files found)

## Environment Configuration

**Required env vars:**
- `BETTER_AUTH_SECRET` - Auth signing secret (min 32 chars)
- `DATABASE_URL` - Neon Postgres connection string

**Optional but functional env vars:**
- `NEXT_PUBLIC_APP_URL` - Public app URL (default: `http://localhost:3000`)
- `OPENAI_API_KEY` - Required for RAG embeddings and GPT-4o chat
- `ANTHROPIC_API_KEY` - Claude Sonnet access
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini/Gemma via Google AI Studio
- `OLLAMA_BASE_URL` - Local Ollama endpoint
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` - Google OAuth
- `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` - GitHub OAuth
- `RESEND_API_KEY` / `EMAIL_DOMAIN` - Transactional email
- `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` - Rate limiting
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_STARTER` / `STRIPE_PRICE_PRO` - Billing
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` / `SENTRY_ENVIRONMENT` - Error tracking
- `LANGFUSE_PUBLIC_KEY` / `LANGFUSE_SECRET_KEY` / `LANGFUSE_HOST` / `LANGFUSE_ENVIRONMENT` - LLM tracing
- `CRON_SECRET` - Secures the monthly usage reset cron endpoint
- `SKIP_ENV_VALIDATION` - Set to `"true"` in CI/preview to bypass Zod env validation

**Secrets location:**
- `.env.local` (gitignored); validated at startup by `lib/env.ts`

## Webhooks & Callbacks

**Incoming:**
- `POST /api/webhooks/stripe` - Stripe billing events
  - Handles: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
  - Verified via `stripe.webhooks.constructEvent()` with `STRIPE_WEBHOOK_SECRET`
  - Implementation: `app/api/webhooks/stripe/route.ts`

**Outgoing:**
- None detected

## Scheduled Jobs

**Cron:**
- `GET /api/cron/reset-usage` - Monthly usage counter reset
  - Schedule: `0 0 1 * *` (midnight on the 1st of each month, via Vercel Crons)
  - Implementation: `app/api/cron/reset-usage/route.ts`
  - Auth: `CRON_SECRET` header verification

---

*Integration audit: 2026-04-20*
